import { conceptFor, derive, isFailing, matches } from '@/webview/model'
import { OBSIDIAN, check, checkThat, panel, withPreset } from '#test/panel/harness'

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
