// Behavioural test for what the panel derives before it renders. Every panel bug so far has
// been in this arithmetic rather than in the markup, and each one reached a screenshot before
// it reached a test: the black swatch, Reset all doing nothing, compare poisoning Save.
//
//   npx tsx test/panel.ts
//
// No DOM. Rendering, scroll position and CSS are not covered here and would need a browser;
// what is covered is every decision made before a single element is created.

import { conceptFor, derive, matches, paletteFor, same } from '@/webview/model'
import type { PanelState } from '@/webview/protocol'

let passed = 0
let failed = 0

function check(label: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    passed++
    console.log(`  ok    ${label}`)
  } else {
    failed++
    console.log(`  FAIL  ${label}`)
    console.log(`          expected ${JSON.stringify(expected)}`)
    console.log(`          actual   ${JSON.stringify(actual)}`)
  }
}

function checkThat(label: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++
    console.log(`  ok    ${label}`)
  } else {
    failed++
    console.log(`  FAIL  ${label}${detail ? `, ${detail}` : ''}`)
  }
}

const OBSIDIAN = { bg: '#111113', fg: '#d6d8db', accent: '#2578b3', green: '#98bd73' }
const CHALK = { bg: '#f7f6f3', fg: '#2e3642', accent: '#2578b3', green: '#477826' }

function panel(over: Partial<PanelState> = {}): PanelState {
  return {
    roles: [
      {
        id: 'bg',
        label: 'Editor background',
        group: 'Surfaces',
        keys: ['a'],
        scopes: [],
        floor: { on: 'none' },
      },
      {
        id: 'fg',
        label: 'Primary text',
        group: 'Foregrounds',
        keys: ['b'],
        scopes: ['c'],
        floor: { on: 'bg', min: 7 },
      },
      {
        id: 'green',
        label: 'Green',
        group: 'Hue ramp',
        keys: [],
        scopes: ['d'],
        floor: { on: 'bg', min: 3.5 },
      },
      {
        id: 'accent',
        label: 'Accent',
        group: 'Accent',
        keys: ['e'],
        scopes: [],
        floor: { on: 'bg', min: 3 },
      },
    ],
    concepts: [{ term: 'comment', role: 'fg', reads: 'Comments are painted by Primary text' }],
    themes: [
      { label: 'Chromaleon Obsidian', highContrast: false },
      { label: 'Chromaleon Chalk', highContrast: false },
    ],
    palettes: { 'Chromaleon Obsidian': OBSIDIAN, 'Chromaleon Chalk': CHALK },
    active: 'Chromaleon Obsidian',
    accentOverride: null,
    presets: {},
    activePresets: {},
    ...over,
  }
}

const withPreset = (overrides: Record<string, string> = {}, on = false) =>
  panel({
    presets: { p1: { name: 'Preset 1', base: 'Chromaleon Obsidian', overrides } },
    activePresets: on ? { 'Chromaleon Obsidian': 'p1' } : {},
  })

console.log('\nwhat the panel is showing')
{
  check(
    'follows VS Code when nothing is chosen',
    derive(panel(), null, null, false).viewing,
    'Chromaleon Obsidian',
  )
  check(
    'follows the preset switched on for the active theme',
    derive(withPreset({}, true), null, null, false).viewing,
    'p1',
  )
  check(
    'a choice in the panel wins',
    derive(panel(), 'Chromaleon Chalk', null, false).viewing,
    'Chromaleon Chalk',
  )
  // An id from a preset that has since been deleted must not leave the panel showing nothing.
  check(
    'an unknown id falls back',
    derive(panel(), 'p99', null, false).viewing,
    'Chromaleon Obsidian',
  )

  const view = derive(withPreset({ bg: '#ff0000' }), 'p1', null, false)
  check('a preset resolves to its base', view.base, 'Chromaleon Obsidian')
  check('and is named by the preset, not the theme', view.label, 'Preset 1')
}

console.log('\nthe draft is the whole override set')
{
  // It layered over the saved set once, so a draft could only add a colour. Reset this role
  // deleted the key and the saved value underneath simply came back.
  const saved = withPreset({ fg: '#ff0000', green: '#00ff00' })
  check('untouched shows what is saved', derive(saved, 'p1', null, false).edits, {
    fg: '#ff0000',
    green: '#00ff00',
  })
  check(
    'a draft replaces it rather than layering over it',
    derive(saved, 'p1', { fg: '#0000ff' }, false).edits,
    { fg: '#0000ff' },
  )
  check('so Reset all can stage an empty set', derive(saved, 'p1', {}, false).edits, {})
  check('and that counts as a change', derive(saved, 'p1', {}, false).unsaved, true)

  check(
    'a draft equal to what is saved is not unsaved',
    derive(saved, 'p1', { ...saved.presets.p1.overrides }, false).unsaved,
    false,
  )
  check('and no draft is never unsaved', derive(saved, 'p1', null, false).unsaved, false)
}

console.log('\ncompare reaches the canvas and nothing else')
{
  const saved = withPreset({ fg: '#ff0000' })
  const held = derive(saved, 'p1', { fg: '#00ff00' }, true)

  check('the canvas shows the theme as it ships', held.canvas.fg, OBSIDIAN.fg)
  // Holding it drove Save and the dirty count once, so a save mid-hold wrote an empty set
  // over the preset and the compare button disabled itself out from under the hold.
  check('what Save would write is untouched', held.edits, { fg: '#00ff00' })
  check('and the change count is untouched', held.changed, 1)
  check(
    'released, the canvas shows the draft again',
    derive(saved, 'p1', { fg: '#00ff00' }, false).canvas.fg,
    '#00ff00',
  )
}

console.log('\nswatches')
{
  const state = withPreset({ bg: '#ff0000' })
  // `palettes` is keyed by shipped label only, so a preset id looked up in it returned
  // nothing and fell through to black.
  check('a preset resolves through its base', paletteFor(state, 'p1').bg, '#ff0000')
  check('and inherits everything it has not changed', paletteFor(state, 'p1').fg, OBSIDIAN.fg)
  check('a shipped theme is itself', paletteFor(state, 'Chromaleon Chalk').bg, CHALK.bg)
  check('an unknown id is empty rather than wrong', paletteFor(state, 'nope'), {})
}

console.log('\npreviewing')
{
  check(
    'the plain active theme is not a preview',
    derive(panel(), null, null, false).previewing,
    false,
  )
  check('another theme is', derive(panel(), 'Chromaleon Chalk', null, false).previewing, true)
  check(
    'the preset switched on is not',
    derive(withPreset({}, true), 'p1', null, false).previewing,
    false,
  )
  // A preset on the active theme that is not the one switched on is still only a preview.
  check(
    'one that is not switched on is',
    derive(withPreset({}, false), 'p1', null, false).previewing,
    true,
  )
}

console.log('\nroles and contrast')
{
  const view = derive(panel(), null, null, false)
  check('counts keys and scopes together', view.roles.find((r) => r.id === 'fg')?.count, 2)
  check('backgrounds carry no ratio', view.roles.find((r) => r.id === 'bg')?.ratio, undefined)
  checkThat(
    'and everything with a floor is measured',
    view.measured === 3 && view.failing === 0,
    `${view.measured} measured, ${view.failing} failing`,
  )

  const dark = derive(panel(), null, { fg: '#141416' }, false)
  checkThat('a colour below its floor is counted', dark.failing === 1, `${dark.failing} failing`)

  check(
    'an edited role says so',
    derive(panel(), null, { fg: '#ffffff' }, false).roles.find((r) => r.id === 'fg')?.edited,
    true,
  )
  check(
    'an untouched one does not',
    derive(panel(), null, null, false).roles.find((r) => r.id === 'fg')?.edited,
    false,
  )
  // The accent setting replaces the role, so the panel shows what actually renders.
  check(
    'the accent setting wins over the theme',
    derive(panel({ accentOverride: '#abcdef' }), null, null, false).accent,
    '#abcdef',
  )
}

console.log('\na preset someone edited by hand')
{
  // chromaleon.presets is a setting, so it can be opened and mistyped. Throwing out of
  // contrast() would blank the panel, which is a poor answer to one bad character.
  const broken = withPreset({ fg: 'red', green: '#00ff00' })
  const view = derive(broken, 'p1', null, false)
  check('an unparseable colour is dropped', view.edits, { green: '#00ff00' })
  check(
    'and the role falls back to the theme',
    view.roles.find((r) => r.id === 'fg')?.value,
    OBSIDIAN.fg,
  )
  check(
    'the rest of the preset still applies',
    view.roles.find((r) => r.id === 'green')?.value,
    '#00ff00',
  )
}

console.log('\nsearch')
{
  const state = panel()
  checkThat('matches a label', matches(state.roles[1], 'primary'), 'Primary text')
  checkThat('matches an id', matches(state.roles[1], 'fg'), 'fg')
  checkThat('is case insensitive', matches(state.roles[1], 'PRIMARY'), 'Primary text')

  check(
    'a concept names the role that paints it',
    conceptFor(state.concepts, 'comment')?.role,
    'fg',
  )
  check('and matches a prefix', conceptFor(state.concepts, 'comm')?.role, 'fg')
  // One letter would match almost anything and the match line would flicker on every keypress.
  check('one letter is not enough', conceptFor(state.concepts, 'c'), undefined)
}

console.log('\ncomparing override sets')
{
  checkThat('equal sets', same({ a: '1' }, { a: '1' }))
  checkThat('a different value', !same({ a: '1' }, { a: '2' }))
  checkThat('an extra key', !same({ a: '1', b: '2' }, { a: '1' }))
  checkThat('a missing key', !same({ a: '1' }, { a: '1', b: '2' }))
  checkThat('both empty', same({}, {}))
}

console.log(`\n${passed} passed, ${failed} failed\n`)
process.exit(failed > 0 ? 1 : 0)
