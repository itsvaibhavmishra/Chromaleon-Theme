import { presetSignature, readPresetFile, writePresetFile } from '@/utils/preset-file'
import { same } from '@/webview/model'
import { check, checkThat } from '#test/panel/harness'

console.log('\nreading a dropped preset file')
{
  const BASES = ['Chromaleon Obsidian', 'Chromaleon Chalk']
  const good = writePresetFile([
    { name: 'Midnight', base: 'Chromaleon Obsidian', overrides: { bg: '#101014' } },
  ])

  const round = readPresetFile('mine.json', good, BASES)
  check('what we write, we can read', round.presets.length, 1)
  check('with the name intact', round.presets[0].name, 'Midnight')
  check('and the colours', round.presets[0].overrides, { bg: '#101014' })
  check('and nothing skipped', round.skipped, [])

  // A drop is easy to do by accident, so every refusal has to say why in words.
  check(
    'a non-JSON file is refused',
    readPresetFile('notes.txt', 'hello', BASES).problem,
    'not valid JSON',
  )
  check(
    "somebody else's JSON is refused",
    readPresetFile('tsconfig.json', '{"compilerOptions":{}}', BASES).problem,
    'not a Chromaleon preset file',
  )
  check(
    'and so is a format we cannot read yet',
    readPresetFile('future.json', '{"chromaleon":99,"presets":[]}', BASES).problem,
    'made by a newer Chromaleon (format 99)',
  )

  // A base we do not ship can never be applied, so it is refused rather than half-imported.
  const foreign = readPresetFile(
    'theirs.json',
    JSON.stringify({
      chromaleon: 1,
      presets: [
        { name: 'Good', base: 'Chromaleon Chalk', overrides: {} },
        { name: 'Alien', base: 'Someone Else Dark', overrides: {} },
      ],
    }),
    BASES,
  )
  check(
    'the usable half still imports',
    foreign.presets.map((preset) => preset.name),
    ['Good'],
  )
  check('and the rest says why it did not', foreign.skipped, [
    'Alien is built on Someone Else Dark, which is not installed',
  ])

  // presets is hand-editable, and a file is hand-writable, so a bad colour cannot land.
  const dirty = readPresetFile(
    'dirty.json',
    JSON.stringify({
      chromaleon: 1,
      presets: [
        { name: 'Half', base: 'Chromaleon Obsidian', overrides: { bg: 'red', fg: '#ffffff' } },
      ],
    }),
    BASES,
  )
  check('an unparseable colour is dropped, not imported', dirty.presets[0].overrides, {
    fg: '#ffffff',
  })

  // One preset unwrapped is the shape people hand-write.
  const bare = readPresetFile(
    'one.json',
    JSON.stringify({ chromaleon: 1, name: 'Bare', base: 'Chromaleon Chalk', overrides: {} }),
    BASES,
  )
  check('a single preset needs no wrapper', bare.presets[0]?.name, 'Bare')

  const nameless = readPresetFile(
    'nameless.json',
    JSON.stringify({ chromaleon: 1, presets: [{ base: 'Chromaleon Chalk' }] }),
    BASES,
  )
  check('a preset with no name is skipped', nameless.skipped, ['#1 has no name'])
}

console.log('\nspotting a preset already saved')
{
  interface Portable {
    name: string
    base: string
    overrides: Record<string, string>
  }
  const mine: Portable = {
    name: 'Midnight',
    base: 'Chromaleon Obsidian',
    overrides: { bg: '#101014' },
  }
  const same = (other: Portable) => presetSignature(mine) === presetSignature(other)

  checkThat('the same preset signs the same', same({ ...mine }))
  // Key order is whatever JSON.parse handed back, so it must not decide identity.
  checkThat(
    'and so does one whose colours arrived in another order',
    presetSignature({
      name: 'Two',
      base: 'b',
      overrides: { fg: '#ffffff', bg: '#000000' },
    }) === presetSignature({ name: 'Two', base: 'b', overrides: { bg: '#000000', fg: '#ffffff' } }),
  )
  checkThat('hex case is not a difference', same({ ...mine, overrides: { bg: '#101014' } }))
  checkThat('nor is it when written in capitals', same({ ...mine, overrides: { bg: '#101014' } }))

  // Any real difference has to let it through: that is the whole rule.
  checkThat(
    'a different colour is a different preset',
    !same({ ...mine, overrides: { bg: '#101015' } }),
  )
  checkThat('so is a different name', !same({ ...mine, name: 'Midnight 2' }))
  checkThat('so is a different theme', !same({ ...mine, base: 'Chromaleon Chalk' }))
  checkThat(
    'and so is one extra colour',
    !same({ ...mine, overrides: { bg: '#101014', fg: '#ffffff' } }),
  )

  // Dates are out on purpose, or re-exporting the same preset would read as a new one.
  const stamped = { ...mine, created: '2020-01-01T00:00:00Z', updated: '2026-01-01T00:00:00Z' }
  checkThat(
    'dates do not make it a different preset',
    presetSignature(stamped) === presetSignature(mine),
  )

  // One Set built once, then a lookup each, rather than a walk over the whole library.
  const library = new Set([presetSignature(mine)])
  checkThat('a saved preset is found', library.has(presetSignature({ ...mine })))
  checkThat(
    'and a changed one is not',
    !library.has(presetSignature({ ...mine, overrides: { bg: '#ff0000' } })),
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
