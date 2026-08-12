import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { readDevlog } from '@/scripts/changelog'
import { ROOT } from '@/scripts/fingerprint'
import { fail, git, upsertPullRequest } from '@/scripts/shell'

// Moves staging into main without cutting a version. For work that belongs on main but is not
// worth a release on its own, and for anything that has to reach main before the next release.
//
//   npm run skip-release

console.log('fetching...')
git('fetch', '--prune', 'origin')

const ahead = git('log', '--oneline', 'origin/main..origin/staging')
if (!ahead) fail('staging has nothing main does not, so there is nothing to merge.')

const version = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version as string
const sections = readDevlog(readFileSync(join(ROOT, 'devlog.txt'), 'utf8'))
const waiting = sections.reduce((total, section) => total + section.entries.length, 0)

const commits = ahead
  .split('\n')
  .map((line) => `- ${line}`)
  .join('\n')

// The devlog is only ever emptied by npm run release, so anything sitting in it now still gets
// swept into whichever version is cut next. Saying so here stops it reading like a loss.
const devlogNote =
  waiting > 0
    ? [
        `\`devlog.txt\` still holds **${waiting}** ${waiting === 1 ? 'entry' : 'entries'}. They stay there and land in the changelog under whichever version is released next. Nothing is lost by merging this.`,
        '',
        ...sections.map(({ heading, entries }) => `- **${heading}**: ${entries.length}`),
      ].join('\n')
    : '`devlog.txt` is empty, so nothing is waiting to be written up.'

upsertPullRequest({
  base: 'main',
  head: 'staging',
  title: 'Merge staging without releasing',
  body: [
    'Brings `main` up to date with `staging` **without publishing anything**.',
    '',
    `The \`skip release\` label is what stops it: no tag, no build, no GitHub release. \`main\` stays on ${version}.`,
    '',
    '### What is being merged',
    '',
    commits,
    '',
    '### Devlog',
    '',
    devlogNote,
  ].join('\n'),
  labels: ['skip release'],
})

console.log('\nopened, labelled skip release. Merging it publishes nothing.')
