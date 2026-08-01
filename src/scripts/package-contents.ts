import { execFileSync } from 'node:child_process'

import { ROOT } from './fingerprint'

// Everything the vsix is allowed to contain. .vscodeignore is an allowlist, so this asserts
// the result of that rather than hunting for names: anything here and not on the list either
// leaked in, or was added without being declared.
const ALLOWED = new Set([
  'package.json',
  'README.md',
  'CHANGELOG.md',
  'LICENSE.txt',
  'THIRD-PARTY-NOTICES.md',
  'icon.png',
  'dist/extension.cjs',
  'dist/webview.js',
  'dist/webview.css',
])

// Generated payloads, checked by their own suites rather than listed file by file.
const BULK = /^(themes|icons)\//

function main() {
  const listed = execFileSync('npx', ['vsce', 'ls', '--no-dependencies'], {
    cwd: ROOT,
    encoding: 'utf8',
  })
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const unexpected = listed.filter((file) => !BULK.test(file) && !ALLOWED.has(file))
  const missing = [...ALLOWED].filter((file) => !listed.includes(file))

  if (unexpected.length > 0) {
    console.log('FAIL these must not ship in the vsix')
    for (const file of unexpected) console.log(`       ${file}`)
  }
  if (missing.length > 0) {
    console.log('FAIL these should ship but are absent')
    for (const file of missing) console.log(`       ${file}`)
  }
  if (unexpected.length > 0 || missing.length > 0) process.exit(1)

  console.log(`ok   package contents, ${listed.length} files, nothing unexpected`)
}

main()
