import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { ROOT } from '@/scripts/fingerprint'

// Cuts a release in one step: the version, the changelog and the devlog all move together.
// Doing it by hand meant three files that had to agree and nothing checking that they did.
//
//   npm run release 0.2.0

const HEADINGS = ['New', 'Improvements', 'Fixed', 'Developers', 'Internal'] as const

/** Everything written under each heading since the last release, empty ones dropped. */
function readDevlog(text: string): { heading: string; entries: string[] }[] {
  const sections = HEADINGS.map((heading) => ({ heading, entries: [] as string[] }))
  let current: (typeof sections)[number] | undefined

  for (const line of text.split('\n')) {
    if (line.trimStart().startsWith('#')) continue
    const opening = HEADINGS.find((heading) => line.trim() === `- ${heading}:`)
    if (opening) {
      current = sections.find((section) => section.heading === opening)
      continue
    }
    const entry = line.trim()
    if (current && entry.startsWith('- ')) current.entries.push(entry.slice(2).trim())
  }
  return sections.filter((section) => section.entries.length > 0)
}

function blankDevlog(text: string): string {
  const header = text.slice(0, text.indexOf('  - New:'))
  return header + HEADINGS.map((heading) => `  - ${heading}:\n`).join('\n')
}

const version = process.argv[2]
if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('usage: npm run release <x.y.z>')
  process.exit(1)
}

const devlogPath = join(ROOT, 'devlog.txt')
const changelogPath = join(ROOT, 'CHANGELOG.md')
const manifestPath = join(ROOT, 'package.json')

const devlog = readFileSync(devlogPath, 'utf8')
const sections = readDevlog(devlog)
if (sections.length === 0) {
  console.error('devlog.txt is empty, so there is nothing to release.')
  process.exit(1)
}

// Today rather than a flag: a release is dated when it is cut, and a wrong date here is the
// kind of thing nobody notices until they are reading the changelog a year later.
const today = new Date().toISOString().slice(0, 10)
const entry = [
  `## [${version}] - ${today}`,
  '',
  ...sections.flatMap(({ heading, entries }) => [
    `### ${heading}`,
    '',
    ...entries.map((line) => `- ${line}`),
    '',
  ]),
  // The next heading needs a blank line before it, or the two sections run together.
  '',
].join('\n')

const changelog = readFileSync(changelogPath, 'utf8')
const firstRelease = changelog.indexOf('## [')
const withEntry =
  changelog.slice(0, firstRelease) + entry + changelog.slice(firstRelease).replace(/\n*$/, '\n')

const repo = 'https://github.com/itsvaibhavmishra/Chromaleon-Theme'
const body = withEntry.trimEnd()
// The reference links are one block, so a second one joins it rather than opening a paragraph.
const separator = /\n\[[^\]]+\]: \S+$/.test(body) ? '\n' : '\n\n'
writeFileSync(changelogPath, `${body}${separator}[${version}]: ${repo}/releases/tag/v${version}\n`)

const manifest = readFileSync(manifestPath, 'utf8')
writeFileSync(manifestPath, manifest.replace(/"version": "[^"]+"/, `"version": "${version}"`))
writeFileSync(devlogPath, blankDevlog(devlog))

console.log(`released ${version}`)
for (const { heading, entries } of sections) console.log(`  ${heading}: ${entries.length}`)
console.log('\nnext: commit, open the staging into main PR, then tag main as v' + version)
