import { contrast, toHsl } from '@/core/color'
import { raiseToFloor } from '@/utils/contrast-fix'
import { HISTORY_LIMIT, canRedo, canUndo, record, redo, started, undo } from '@/utils/history'
import { check, checkThat } from '#test/panel/harness'

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
