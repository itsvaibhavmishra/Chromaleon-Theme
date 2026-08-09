// Behavioural test for every contributed setting. Loads the BUILT bundle with a stubbed
// `vscode` module, applies one setting at a time, and asserts the observable effect: what
// lands in user settings and what lands on disk. tsc and the theme checks say nothing
// about the runtime; this is the only place it is exercised end to end.
//
//   node test/settings.cjs                 # the local build
//   node test/settings.cjs <extensionDir>  # an installed copy
//
// Pointing it at an installed extension is the only way to catch packaging faults: a file
// the build produced but .vscodeignore excluded looks perfect in the repo and is missing
// from the vsix.
const { runSuites } = require('#test/harness.cjs')

// In the order they were written, which is the order they read in: what a fresh install does,
// then each setting, then the panel, then what has to keep working alongside the rest.
const SUITES = [
  require('#test/suites/appearance.cjs'),
  require('#test/suites/icons.cjs'),
  require('#test/suites/presets.cjs'),
  require('#test/suites/catalogue.cjs'),
  require('#test/suites/customizer.cjs'),
  require('#test/suites/coexistence.cjs'),
]

;(async () => {
  const { passed, failed } = await runSuites(SUITES)
  console.log(`\n${passed} passed, ${failed} failed\n`)
  process.exit(failed > 0 ? 1 : 0)
})().catch((error) => {
  console.error('\nTEST HARNESS ERROR:', error)
  process.exit(1)
})
