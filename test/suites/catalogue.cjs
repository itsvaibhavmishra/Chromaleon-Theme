const { SOURCE_ROOT, check, checkThat } = require('#test/harness.cjs')
const fs = require('node:fs')
const path = require('node:path')

module.exports = async function catalogue() {
  console.log('\ngenerated role catalogue')
  {
    // generated.ts is written by build.ts as a JSON literal, so the object can be read back
    // without running the bundle. The customizer's numbers come from here, and the whole
    // point of generating them is that nobody can hand-write one that flatters the design.
    const source = fs.readFileSync(path.join(SOURCE_ROOT, 'src', 'generated.ts'), 'utf8')
    const runtime = JSON.parse(source.slice(source.indexOf('{'), source.lastIndexOf('}') + 1))
    const roles = runtime.roles

    check('every Palette role is catalogued', roles.length, 32)
    checkThat(
      'no role is listed twice',
      new Set(roles.map((role) => role.id)).size === roles.length,
      'duplicate role id',
    )

    // Two independent introspections of the same mapping. If they disagree, one of them is
    // reading a stale build.
    const accent = roles.find((role) => role.id === 'accent')
    check('accent count agrees with the accent override list', accent.keys.length, 49)

    // Alpha has to survive into the catalogue. Writing a role override without it turns every
    // translucent border and hover state solid, and nothing about the value would look wrong.
    const translucent = roles.flatMap((role) => role.keys).filter((entry) => entry.alpha)
    check('translucent keys keep their alpha', translucent.length, 119)

    const allKeys = roles.flatMap((role) => role.keys.map((entry) => entry.key))
    check('every workbench key is attributed to a role', allKeys.length, 279)
    checkThat(
      'no workbench key is attributed twice',
      new Set(allKeys).size === allKeys.length,
      'a key belongs to two roles',
    )

    // The floors are read from core/roles.ts rather than restated, so this cannot become a
    // third copy of the same five numbers that drifts from the other two.
    const floorSource = fs.readFileSync(path.join(SOURCE_ROOT, 'src', 'core', 'roles.ts'), 'utf8')
    const allowed = [...floorSource.matchAll(/^\s+(?:\/\*\*.*\*\/\s+)?\w+: ([\d.]+),$/gm)].map(
      (match) => Number(match[1]),
    )
    check('the floor table has five entries', allowed.length, 5)

    // A role with a floor must be measurable against something, or the status line is
    // counting roles it cannot actually judge.
    const floored = roles.filter((role) => role.floor.on !== 'none')
    checkThat(
      'every floor comes from that table',
      floored.every((role) => allowed.includes(role.floor.min)),
      floored
        .filter((role) => !allowed.includes(role.floor.min))
        .map((role) => `${role.id}=${role.floor.min}`)
        .join(', '),
    )
    checkThat(
      'the hue ramp is all measured',
      floored.filter((role) => role.group === 'Hue ramp').length,
      9,
    )

    // A faint lift has to move away from the background, which on a light variant means
    // darker. Wired to white instead, every widget border and the find-match washes vanish
    // on Chalk, and no contrast floor catches it because they are meant to be barely there.
    for (const [theme, wantsDark] of [
      ['Chromaleon Chalk', true],
      ['Chromaleon Obsidian', false],
    ]) {
      const palette = runtime.palettes[theme]
      checkThat(
        `${theme} hairlines lift away from the background`,
        (palette.hairline === '#000000') === wantsDark,
        `hairline ${palette.hairline} on bg ${palette.bg}`,
      )
    }
    checkThat(
      'no role paints nothing',
      roles.every((role) => role.keys.length + role.scopes.length > 0),
      roles
        .filter((role) => role.keys.length + role.scopes.length === 0)
        .map((role) => role.id)
        .join(', '),
    )

    // The canvas is a map now: click a region and it hands back the role tagged on it. A
    // region tagged with a role that does not actually paint that key sends people to edit
    // the wrong colour, and nothing about the rendering would look wrong.
    const canvas = fs.readFileSync(path.join(SOURCE_ROOT, 'src', 'webview', 'canvas.tsx'), 'utf8')
    const CANVAS_REGIONS = [
      ['sideBar.background', 'cv-side'],
      ['sideBarTitle.foreground', 'cv-side-title'],
      ['list.activeSelectionForeground', 'cv-tree cv-tree-on'],
      ['sideBar.foreground', 'cv-tree'],
      ['activityBar.background', 'cv-activity'],
      ['editor.background', 'cv-main'],
      ['editorLineNumber.foreground', 'cv-num'],
      ['editor.lineHighlightBackground', 'cv-line cv-line-on'],
      ['editorIndentGuide.background', 'cv-guide'],
      ['statusBar.background', 'cv-status'],
      ['panel.background', 'cv-terminal'],
      ['chat.requestBubbleBackground', 'cv-tip'],
      ['input.background', 'cv-compose'],
      ['input.border', 'cv-attach'],
    ]
    for (const [key, className] of CANVAS_REGIONS) {
      const owner = roles.find((role) => role.keys.some((entry) => entry.key === key))?.id
      const tagged = canvas.match(new RegExp(`paint\\('([a-zA-Z]+)', '${className}'\\)`))?.[1]
      checkThat(
        `canvas .${className} is tagged with the role that paints ${key}`,
        tagged === owner,
        `tagged ${tagged}, ${key} is painted by ${owner}`,
      )
    }

    const ids = roles.map((role) => role.id)
    const palettes = Object.entries(runtime.palettes)
    check('a palette is emitted for every theme', palettes.length, 22)
    checkThat(
      'every palette carries every role',
      palettes.every(([, p]) => ids.every((id) => typeof p[id] === 'string')),
      'a palette is missing a role',
    )
  }
}
