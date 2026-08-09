// Behavioural test for what the panel derives before it renders. Every panel bug so far has
// been in this arithmetic rather than in the markup, and each one reached a screenshot before
// it reached a test: the black swatch, Reset all doing nothing, compare poisoning Save.
//
//   npx tsx test/panel.ts
//
// No DOM. Rendering, scroll position and CSS are not covered here and would need a browser;
// what is covered is every decision made before a single element is created.

import { SettingsPane } from '@/components/settings-pane'
import { contrast, toHsl } from '@/core/color'
import { SECTIONS } from '@/constants/settings'
import { raiseToFloor } from '@/utils/contrast-fix'
import { canRedo, canUndo, HISTORY_LIMIT, record, redo, started, undo } from '@/utils/history'
import { humanise, inlineSegments } from '@/utils/inline-markdown'
import { conceptFor, derive, isFailing, matches, paletteFor, same } from '@/webview/model'
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
    settings: [{ key: 'italics', kind: 'boolean', description: 'Italicise comments.' }],
    settingValues: { italics: true },
    treeIcons: {},
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
    derive(panel(), null, null, null).viewing,
    'Chromaleon Obsidian',
  )
  check(
    'follows the preset switched on for the active theme',
    derive(withPreset({}, true), null, null, null).viewing,
    'p1',
  )
  check(
    'a choice in the panel wins',
    derive(panel(), 'Chromaleon Chalk', null, null).viewing,
    'Chromaleon Chalk',
  )
  // An id from a preset that has since been deleted must not leave the panel showing nothing.
  check(
    'an unknown id falls back',
    derive(panel(), 'p99', null, null).viewing,
    'Chromaleon Obsidian',
  )

  const view = derive(withPreset({ bg: '#ff0000' }), 'p1', null, null)
  check('a preset resolves to its base', view.base, 'Chromaleon Obsidian')
  check('and is named by the preset, not the theme', view.label, 'Preset 1')
}

console.log('\nthe draft is the whole override set')
{
  // It layered over the saved set once, so a draft could only add a colour. Reset this role
  // deleted the key and the saved value underneath simply came back.
  const saved = withPreset({ fg: '#ff0000', green: '#00ff00' })
  check('untouched shows what is saved', derive(saved, 'p1', null, null).edits, {
    fg: '#ff0000',
    green: '#00ff00',
  })
  check(
    'a draft replaces it rather than layering over it',
    derive(saved, 'p1', { fg: '#0000ff' }, null).edits,
    { fg: '#0000ff' },
  )
  check('so Reset all can stage an empty set', derive(saved, 'p1', {}, null).edits, {})
  check('and that counts as a change', derive(saved, 'p1', {}, null).unsaved, true)

  check(
    'a draft equal to what is saved is not unsaved',
    derive(saved, 'p1', { ...saved.presets.p1.overrides }, null).unsaved,
    false,
  )
  check('and no draft is never unsaved', derive(saved, 'p1', null, null).unsaved, false)
}

console.log('\ncompare reaches the canvas and nothing else')
{
  const saved = withPreset({ fg: '#ff0000' })
  const held = derive(saved, 'p1', { fg: '#00ff00' }, { base: true })

  check('the canvas shows the theme as it ships', held.canvas.fg, OBSIDIAN.fg)
  // Holding it drove Save and the dirty count once, so a save mid-hold wrote an empty set
  // over the preset and the compare button disabled itself out from under the hold.
  check('what Save would write is untouched', held.edits, { fg: '#00ff00' })
  check('and the change count is untouched', held.changed, 1)
  check(
    'released, the canvas shows the draft again',
    derive(saved, 'p1', { fg: '#00ff00' }, null).canvas.fg,
    '#00ff00',
  )
}

console.log('\ncomparing against another row')
{
  const two = panel({
    presets: {
      p1: { name: 'Preset 1', base: 'Chromaleon Obsidian', overrides: { fg: '#ff0000' } },
      p2: { name: 'Preset 2', base: 'Chromaleon Chalk', overrides: { fg: '#0000ff' } },
    },
  })
  const held = derive(two, 'p1', null, { id: 'p2' })
  check('the canvas shows the other preset', held.canvas.fg, '#0000ff')
  check('including the base underneath it', held.canvas.bg, CHALK.bg)
  // The same rule as the other compare: it is a view, so Save must still write this preset.
  check('what Save would write is untouched', held.edits, { fg: '#ff0000' })
  check('and the panel is still showing p1', held.viewing, 'p1')

  // Shipped rows carry the same compare, so the id is a theme label as often as a preset id.
  const shipped = derive(two, 'p1', null, { id: 'Chromaleon Chalk' })
  check('a shipped row compares against the theme itself', shipped.canvas.fg, CHALK.fg)
  check('with none of the preset on top', shipped.canvas.bg, CHALK.bg)
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
    derive(panel(), null, null, null).previewing,
    false,
  )
  check('another theme is', derive(panel(), 'Chromaleon Chalk', null, null).previewing, true)
  check(
    'the preset switched on is not',
    derive(withPreset({}, true), 'p1', null, null).previewing,
    false,
  )
  // A preset on the active theme that is not the one switched on is still only a preview.
  check(
    'one that is not switched on is',
    derive(withPreset({}, false), 'p1', null, null).previewing,
    true,
  )
}

console.log('\nroles and contrast')
{
  const view = derive(panel(), null, null, null)
  check('counts keys and scopes together', view.roles.find((role) => role.id === 'fg')?.count, 2)
  check('backgrounds carry no ratio', view.roles.find((role) => role.id === 'bg')?.ratio, undefined)
  checkThat(
    'and everything with a floor is measured',
    view.measured === 3 && view.failing === 0,
    `${view.measured} measured, ${view.failing} failing`,
  )

  const dark = derive(panel(), null, { fg: '#141416' }, null)
  checkThat('a colour below its floor is counted', dark.failing === 1, `${dark.failing} failing`)

  check(
    'an edited role says so',
    derive(panel(), null, { fg: '#ffffff' }, null).roles.find((role) => role.id === 'fg')?.edited,
    true,
  )
  check(
    'an untouched one does not',
    derive(panel(), null, null, null).roles.find((role) => role.id === 'fg')?.edited,
    false,
  )
  // The accent setting replaces the role, so the panel shows what actually renders.
  check(
    'the accent setting wins over the theme',
    derive(panel({ accentOverride: '#abcdef' }), null, null, null).accent,
    '#abcdef',
  )
}

console.log('\na preset someone edited by hand')
{
  // chromaleon.presets is a setting, so it can be opened and mistyped. Throwing out of
  // contrast() would blank the panel, which is a poor answer to one bad character.
  const broken = withPreset({ fg: 'red', green: '#00ff00' })
  const view = derive(broken, 'p1', null, null)
  check('an unparseable colour is dropped', view.edits, { green: '#00ff00' })
  check(
    'and the role falls back to the theme',
    view.roles.find((role) => role.id === 'fg')?.value,
    OBSIDIAN.fg,
  )
  check(
    'the rest of the preset still applies',
    view.roles.find((role) => role.id === 'green')?.value,
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

console.log('\nwhich roles read as failing')
{
  const roles = derive(panel(), null, { fg: '#141416' }, null).roles
  const failing = roles.find((role) => role.id === 'fg')!
  const passing = roles.find((role) => role.id === 'green')!
  const noFloor = roles.find((role) => role.id === 'bg')!

  checkThat('below its floor is failing', isFailing(failing), `${failing.ratio}`)
  checkThat('above it is not', !isFailing(passing), `${passing.ratio}`)
  // A background has no ratio and no floor, so neither half of the test can be evaluated.
  // Reading undefined as "below" would paint every surface red.
  checkThat('and a role with no floor never is', !isFailing(noFloor))
}

console.log('\nsetting descriptions')
{
  const plain = inlineSegments('Paint the status bar in the accent colour.')
  check('plain text is one segment', plain.length, 1)
  check('and stays plain', plain[0].kind, 'plain')

  // Straight from the manifest, so the shapes tested are the shapes that actually ship.
  const mixed = inlineSegments('Any `#rrggbb`, which **overrides** `#chromaleon.accent#`.')
  // Backticked in the manifest too, and VS Code still resolves it, so code must not win.
  check(
    'a backticked setting reference still reads as one',
    mixed.filter((segment) => segment.kind !== 'plain').map((segment) => segment.kind),
    ['code', 'strong', 'setting'],
  )
  check('the backticks are gone', mixed[1].text, '#rrggbb')
  check('and so are the hashes', mixed.at(-2)?.text, 'accent')

  // Two asterisks have to be tried before one, or **bold** reads as an empty emphasis.
  const bold = inlineSegments('**overrides**')
  check('bold is not read as two emphases', bold.length, 1)
  check('and keeps its text', bold[0].text, 'overrides')

  const setting = inlineSegments('#chromaleon.accent#')
  check('a setting reference is its own kind', setting[0].kind, 'setting')
  check('and loses the namespace', setting[0].text, 'accent')

  // Descriptions carry command links for VS Code's settings editor, which our pane drops.
  const linked = inlineSegments('Where it opens. [Open it](command:chromaleon.openCustomizer)')
  check('a link is its own kind', linked[1].kind, 'link')
  check('carrying its target', linked[1].href, 'command:chromaleon.openCustomizer')
  check('and its label', linked[1].text, 'Open it')
  check('the text before it survives', linked[0].text, 'Where it opens. ')

  const italic = inlineSegments('Run *Chromaleon: Clear Custom Accent* or empty this field.')
  check('emphasis is picked out', italic[1].kind, 'em')
  check('and the text around it survives', italic[0].text, 'Run ')
}

console.log('\nnaming a setting from its key')
{
  check('camelCase becomes a sentence', humanise('accentedStatusBar'), 'Accented status bar')
  check('a single word is just capitalised', humanise('italics'), 'Italics')
  check('and so is an enum value', humanise('newWindow'), 'New window')
  // Accent names are already written for people, and lowercasing them would say Theme default.
  check('anything with a space is left alone', humanise('Theme Default'), 'Theme Default')
}

console.log('\nevery setting has a home')
{
  const placed = SECTIONS.flatMap((section) => section.keys)
  check('no setting is listed in two sections', placed.length, new Set(placed).size)
  // The manifest is the source; this only checks the hand-kept grouping has not fallen behind.
  // The count itself is asserted against package.json over in the settings harness.
  check('and the sections cover fifteen', placed.length, 15)
}

console.log('\nthe settings pane actually reports a click')
{
  // Preact components are plain functions, so the tree can be walked without a DOM as long as
  // nothing in it uses a hook. Accent is left out because its picker does.
  interface Node {
    type: unknown
    props: Record<string, unknown>
  }

  const flatten = (node: unknown): Node[] => {
    if (Array.isArray(node)) return node.flatMap(flatten)
    if (!node || typeof node !== 'object') return []
    const vnode = node as Node
    if (typeof vnode.type === 'function') {
      const rendered = (vnode.type as (props: unknown) => unknown)(vnode.props)
      return [vnode, ...flatten(rendered)]
    }
    return [vnode, ...flatten(vnode.props?.children)]
  }

  const changes: [string, string | boolean][] = []
  const tree = SettingsPane({
    settings: [
      { key: 'italics', kind: 'boolean', description: 'Italicise comments.' },
      {
        key: 'borders',
        kind: 'enum',
        description: 'Borders drawn between editor areas.',
        options: [{ value: 'none' }, { value: 'subtle' }, { value: 'strong' }],
      },
    ],
    values: { italics: true, borders: 'none' },
    themeAccent: '#2578b3',
    onChange: (key, value) => changes.push([key, value]),
  })

  const nodes = flatten(tree)
  const toggle = nodes.find((node) => node.props?.role === 'switch')
  checkThat('the boolean renders a switch', !!toggle, 'no role=switch found')
  ;(toggle?.props?.onClick as () => void)?.()
  check('clicking it reports the opposite', changes.at(-1), ['italics', false])

  const segments = nodes.filter((node) => node.type === 'button' && node.props?.['aria-pressed'])
  checkThat('the enum renders its options', segments.length > 0, `${segments.length} pressed`)

  const strong = nodes.find((node) => node.type === 'button' && node.props?.children === 'Strong')
  checkThat('including the one not chosen', !!strong, 'no Strong button')
  ;(strong?.props?.onClick as () => void)?.()
  check('and picking it reports that value', changes.at(-1), ['borders', 'strong'])
}

console.log('\nundo and redo')
{
  // Ten edits, eight undos, then redo all the way back, which is what a real session does.
  let history = started<number>(0)
  for (let edit = 1; edit <= 10; edit++) history = record(history, edit)
  check('the last edit is what is showing', history.present, 10)

  for (let step = 0; step < 8; step++) history = undo(history)
  check('eight undos land on the second edit', history.present, 2)
  checkThat('and there is more to undo', canUndo(history))
  checkThat('and eight to redo', canRedo(history))

  for (let step = 0; step < 8; step++) history = redo(history)
  check('redoing all eight returns to the last', history.present, 10)
  checkThat('with nothing left to redo', !canRedo(history))

  // Undoing past the start must not throw or invent a state.
  let empty = started('only')
  empty = undo(empty)
  check('undo on a fresh history is a no-op', empty.present, 'only')
  checkThat('and there is nothing to undo', !canUndo(empty))

  // Editing after an undo abandons the branch, which is what every editor does.
  let branched = record(record(started('a'), 'b'), 'c')
  branched = undo(branched)
  checkThat('an undone state can be redone', canRedo(branched))
  branched = record(branched, 'd')
  checkThat('until a new edit replaces it', !canRedo(branched))
  check('and that edit is what is showing', branched.present, 'd')

  // The stack is bounded, or a long session grows without limit.
  let long = started(0)
  for (let edit = 1; edit <= HISTORY_LIMIT + 20; edit++) long = record(long, edit)
  check('the stack stops growing', long.past.length, HISTORY_LIMIT)
}

console.log('\nfixing a colour that misses its floor')
{
  const background = '#111113'
  // The real case from the screenshot: guides at 1.5:1 against a 1.9 floor.
  const fixed = raiseToFloor('#353536', background, 1.9)
  checkThat(
    'the result clears the floor',
    contrast(fixed, background) >= 1.9,
    `${fixed} reads ${contrast(fixed, background).toFixed(2)}:1`,
  )
  const [originalHue, originalSaturation] = toHsl('#353536')
  const [fixedHue, fixedSaturation] = toHsl(fixed)
  checkThat(
    'and keeps the hue it started with',
    Math.abs(fixedHue - originalHue) < 2 && Math.abs(fixedSaturation - originalSaturation) < 2,
    `${originalHue}/${originalSaturation} became ${fixedHue}/${fixedSaturation}`,
  )

  // Already clearing means nothing to do, so the colour must come back untouched.
  check(
    'a colour already clearing is left alone',
    raiseToFloor('#ffffff', background, 1.9),
    '#ffffff',
  )

  // On paper the fix has to go darker, not lighter, or it walks off the top of the range.
  const onPaper = raiseToFloor('#eeeeee', '#f7f6f3', 3)
  checkThat(
    'on a light background it darkens instead',
    contrast(onPaper, '#f7f6f3') >= 3,
    `${onPaper} reads ${contrast(onPaper, '#f7f6f3').toFixed(2)}:1`,
  )
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
