import { derive, paletteFor } from '@/webview/model'
import { CHALK, OBSIDIAN, check, panel, withPreset } from '#test/panel/harness'

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
