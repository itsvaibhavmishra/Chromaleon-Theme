// Behavioural test for what the panel derives before it renders. Every panel bug so far has
// been in this arithmetic rather than in the markup, and each one reached a screenshot before
// it reached a test: the black swatch, Reset all doing nothing, compare poisoning Save.
//
//   npx tsx test/panel.ts
//
// No DOM. Rendering, scroll position and CSS are not covered here and would need a browser;
// what is covered is every decision made before a single element is created.
//
// Importing a suite runs it, since each is a script rather than an exported function. The
// order below is the order they read in: what the panel shows, then what it lets you change.
import { tally } from '#test/panel/harness'

import '#test/panel/deriving'
import '#test/panel/roles'
import '#test/panel/settings'
import '#test/panel/editing'
import '#test/panel/presets'

const { passed, failed } = tally()
console.log(`\n${passed} passed, ${failed} failed\n`)
process.exit(failed > 0 ? 1 : 0)
