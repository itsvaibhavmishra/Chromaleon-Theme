import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createInterface } from 'node:readline/promises'

import {
  blankDevlog,
  buildEntry,
  compareVersions,
  readDevlog,
  sectionFor,
  withRelease,
} from '@/scripts/changelog'
import { ROOT } from '@/scripts/fingerprint'
import { fail, git, loud, upsertPullRequest } from '@/scripts/shell'

// Cuts a release in one command: branch, changelog, version, gate, push, both pull requests.
// Doing it by hand meant several files that had to agree, and nothing checking that they did.
//
//   npm run release 0.2.0     that version
//   npm run release           asks, offering the next patch

const REPO = 'https://github.com/itsvaibhavmishra/Chromaleon-Theme'

const manifestPath = join(ROOT, 'package.json')
const changelogPath = join(ROOT, 'CHANGELOG.md')
const devlogPath = join(ROOT, 'devlog.txt')

const current = JSON.parse(readFileSync(manifestPath, 'utf8')).version as string

async function askVersion(): Promise<string> {
  const [major, minor, patch] = current.split('.').map(Number)
  const suggestion = `${major}.${minor}.${patch + 1}`
  const prompt = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await prompt.question(`current ${current}, release which? [${suggestion}] `)
  prompt.close()
  return answer.trim() || suggestion
}

const version = process.argv[2] ?? (await askVersion())

if (!/^\d+\.\d+\.\d+$/.test(version)) fail(`"${version}" is not an x.y.z version.`)
if (compareVersions(version, current) <= 0) {
  fail(`${version} is not above the current ${current}, so it would go backwards.`)
}

// Everything below rewrites tracked files and switches branch, so anything uncommitted would
// either be swept into the release or lost.
if (git('status', '--porcelain')) fail('Working tree is not clean. Commit or stash it first.')

const startingBranch = git('rev-parse', '--abbrev-ref', 'HEAD')
const branch = `release/${version}`

console.log('fetching...')
git('fetch', '--prune', 'origin')

if (git('ls-remote', '--tags', 'origin', `v${version}`)) {
  fail(`v${version} is already tagged, so that version is spent. Pick a higher one.`)
}

git('checkout', '-b', branch, 'origin/staging')

try {
  const devlog = readFileSync(devlogPath, 'utf8')
  const sections = readDevlog(devlog)
  if (sections.length === 0) fail('devlog.txt is empty, so there is nothing to release.')

  // Today rather than a flag: a release is dated when it is cut, and a wrong date here is the
  // kind of thing nobody notices until they are reading the changelog a year later.
  const today = new Date().toISOString().slice(0, 10)
  const entry = buildEntry(version, today, sections)

  const changelog = readFileSync(changelogPath, 'utf8')
  writeFileSync(changelogPath, withRelease(changelog, entry, version, REPO))
  writeFileSync(
    manifestPath,
    readFileSync(manifestPath, 'utf8').replace(/"version": "[^"]+"/, `"version": "${version}"`),
  )
  writeFileSync(devlogPath, blankDevlog(devlog))

  for (const { heading, entries } of sections) console.log(`  ${heading}: ${entries.length}`)

  // The gate runs before anything is pushed, so a release that cannot build never becomes a
  // branch anybody else has to look at.
  console.log('\nrunning check...\n')
  loud('npm', ['run', 'check'])

  git('add', 'CHANGELOG.md', 'package.json', 'devlog.txt')
  git('commit', '-m', `chore: 🧹 release ${version}`)
  git('push', '--set-upstream', 'origin', branch)
} catch (error) {
  // Put the branch back the way it was found, so a failed run leaves nothing behind.
  git('checkout', '--force', startingBranch)
  git('branch', '-D', branch)
  fail(`Release aborted, branch removed and nothing pushed.\n\n${String(error)}`)
}

const notes = sectionFor(readFileSync(changelogPath, 'utf8'), version)

upsertPullRequest({
  base: 'staging',
  head: branch,
  title: `Prepare release ${version}`,
  body: [
    `Version, changelog and devlog for ${version}, written by \`npm run release\`.`,
    '',
    'Merging this puts the bump on `staging`. The release itself is the next pull request.',
    '',
    '---',
    '',
    notes,
  ].join('\n'),
})

// Opened now rather than after the first merge, so a release is one command. It sits red until
// the prepare pull request lands, then updates itself and release-ready passes.
upsertPullRequest({
  base: 'main',
  head: 'staging',
  title: `Release ${version}`,
  body: [
    `Merging this publishes **${version}**: tag, build, full \`check\`, and the GitHub release.`,
    '',
    `Red until *Prepare release ${version}* is merged, because until then \`staging\` is still on ${current}.`,
    '',
    '---',
    '',
    notes,
  ].join('\n'),
})

console.log(`\n${version} is ready. Merge the prepare pull request, then the release one.`)
