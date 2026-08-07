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
const Module = require('node:module')
const path = require('node:path')
const fs = require('node:fs')

const ROOT = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, '..')
const BUNDLE = path.join(ROOT, 'dist', 'extension.cjs')
const ICON_THEME = path.join(ROOT, 'themes', 'Chromaleon-Icons.json')
// Resolved from the theme JSON rather than hardcoded: the folder set is addressed by the
// state that produced it, so the directory name is exactly what the accent settings change.
function folderIcon() {
  const theme = JSON.parse(fs.readFileSync(ICON_THEME, 'utf8'))
  const rel = theme.iconDefinitions['folder-src'].iconPath
  return path.resolve(path.dirname(ICON_THEME), rel)
}

// Read from the built theme rather than hardcoded: a test that pins the accent
// separately just fails every time the accent legitimately changes.
const DEFAULT_ACCENT = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'themes', 'Chromaleon-Woad.json'), 'utf8'),
).colors['button.background']

function contrast(a, b) {
  const lum = (h) => {
    const n = parseInt(h.slice(1, 7), 16)
    const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
      const c = v / 255
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
  }
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

let passed = 0
let failed = 0

function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (ok) {
    passed++
    console.log(`  ok    ${label}`)
  } else {
    failed++
    console.log(`  FAIL  ${label}`)
    console.log(`          expected ${JSON.stringify(expected)}`)
    console.log(`          actual   ${JSON.stringify(actual)}`)
  }
}

function checkThat(label, condition, detail) {
  if (condition) {
    passed++
    console.log(`  ok    ${label}`)
  } else {
    failed++
    console.log(`  FAIL  ${label}${detail ? `, ${detail}` : ''}`)
  }
}

// The inert half of the vscode surface: constants, and listeners we register but never fire.
// Only this is shared. What each test actually asserts on, the config store and whether a
// panel may open at all, stays written out where it is asserted, because those differ on
// purpose and hiding the difference behind a flag would hide the point of the test.
function baseStub() {
  return {
    workspace: { onDidChangeConfiguration: () => ({ dispose() {} }) },
    window: {
      onDidChangeActiveColorTheme: () => ({ dispose() {} }),
      showInformationMessage: () => {},
      showErrorMessage: () => {},
      showQuickPick: async () => undefined,
      registerWebviewPanelSerializer: () => ({ dispose() {} }),
    },
    Uri: { joinPath: (...parts) => ({ fsPath: parts.join('/') }) },
    ViewColumn: { Active: -1, Beside: -2 },
    ConfigurationTarget: { Global: 1, Workspace: 2 },
  }
}

// Loads the built bundle against a stub and activates it. Restores the loader in a finally,
// so one failing activation cannot leave every later test resolving the real `vscode`.
async function activateWith(stub, context) {
  const load = Module._load
  const install = () => {
    Module._load = (req, parent, isMain) => (req === 'vscode' ? stub : load(req, parent, isMain))
  }

  install()
  delete require.cache[BUNDLE]
  const ext = require(BUNDLE)
  try {
    await ext.activate(context)
  } finally {
    Module._load = load
  }

  // deactivate() and command handlers reach for vscode too, so they need the stub back.
  const withStub = async (fn) => {
    install()
    try {
      return await fn(ext)
    } finally {
      Module._load = load
    }
  }
  return { ext, withStub }
}

/** Runs activate() with the given chromaleon settings and returns the effects. */
async function run(
  chromaleon,
  { theme = 'Chromaleon Woad', iconTheme = 'vs-seti', global = {}, workspace = {} } = {},
) {
  // Global and workspace are tracked separately so the harness can tell the difference
  // between what the user set and what the merged view reports: the distinction bug 1
  // turned on.
  const registered = []
  const settings = { 'workbench.colorTheme': theme, 'workbench.iconTheme': iconTheme, ...global }
  const ws = { ...workspace }
  const store = new Map()

  const vscode = baseStub()
  vscode.workspace.getConfiguration = (section) =>
    section === 'chromaleon'
      ? {
          get: (k, d) => (k in chromaleon ? chromaleon[k] : d),
          update: async (k, v) => void (chromaleon[k] = v),
        }
      : {
          get: (k, d) => (k in ws ? ws[k] : k in settings ? settings[k] : d),
          inspect: (k) => ({ key: k, globalValue: settings[k], workspaceValue: ws[k] }),
          update: async (k, v, target) => {
            const store = target === 2 ? ws : settings
            if (v === undefined) delete store[k]
            else store[k] = v
          },
        }
  // Opening on activation would pop a panel in everyone's face on every window, so here it
  // is not merely unwanted, it is an error.
  vscode.window.createWebviewPanel = () => {
    throw new Error('the panel should not open during activation')
  }
  vscode.commands = {
    registerCommand: (id) => {
      registered.push(id)
      return { dispose() {} }
    },
    executeCommand: async () => {},
  }

  const { withStub } = await activateWith(vscode, {
    extensionPath: ROOT,
    extensionUri: { fsPath: ROOT },
    extension: { packageJSON: { version: '0.0.0-test' } },
    subscriptions: [],
    globalState: {
      get: (k, d) => (store.has(k) ? store.get(k) : d),
      update: async (k, v) => void store.set(k, v),
      setKeysForSync: () => {},
    },
  })

  const scoped = settings['workbench.colorCustomizations'] ?? {}
  const wsScoped = ws['workbench.colorCustomizations'] ?? {}
  const block = scoped[`[${theme}]`] ?? {}
  const tokens = settings['editor.tokenColorCustomizations'] ?? {}
  return {
    settings,
    workspaceSettings: ws,
    wsScopes: Object.keys(wsScoped),
    colors: block,
    scopes: Object.keys(scoped),
    tokens: tokens[`[${theme}]`],
    iconTheme: settings['workbench.iconTheme'],
    commands: registered,
    iconThemeJson: JSON.parse(fs.readFileSync(ICON_THEME, 'utf8')),
    folderSvg: fs.readFileSync(folderIcon(), 'utf8'),
    folderSetDir: path.basename(path.dirname(folderIcon())),
    deactivate: async () => {
      await withStub((ext) => ext.deactivate())
      return settings['workbench.colorCustomizations']
    },
  }
}

;(async () => {
  console.log('\ndefaults')
  {
    const r = await run({})
    check('writes no colour overrides', r.scopes, [])
    check('writes no token overrides', r.tokens, undefined)
    check('switches icon theme', r.iconTheme, 'chromaleon-icons')
    check('shows explorer arrows by default', r.iconThemeJson.hidesExplorerArrows, false)
    checkThat(
      "keeps Material's folder colours",
      !r.folderSvg.includes(DEFAULT_ACCENT),
      'folder was tinted with the accent when accentFolders is off',
    )
  }

  console.log('\naccent')
  {
    const r = await run({ accent: 'Purple' })
    check('repaints button background', r.colors['button.background'], '#b583db')
    checkThat(
      'repaints all accent keys',
      Object.keys(r.colors).length === 57,
      `${Object.keys(r.colors).length} keys`,
    )
    check('scopes overrides to the active theme', r.scopes, ['[Chromaleon Woad]'])
    check('picks black on a light accent', r.colors['button.foreground'], '#000000')
  }
  {
    const r = await run({ accent: 'Chromaleon' })
    check('default accent is a no-op', r.scopes, [])
  }
  {
    const r = await run({ customAccent: '#ff0000', accent: 'Purple' })
    check('customAccent overrides the named accent', r.colors['button.background'], '#ff0000')
  }
  {
    const r = await run({ customAccent: 'nonsense', accent: 'Purple' })
    check('invalid customAccent falls back', r.colors['button.background'], '#b583db')
  }
  {
    const r = await run({ customAccent: '#101010' })
    check('picks white on a very dark accent', r.colors['button.foreground'], '#ffffff')
  }

  console.log('\naccentedStatusBar')
  {
    const r = await run({ accentedStatusBar: true })
    check('paints the status bar', r.colors['statusBar.background'], DEFAULT_ACCENT)
    checkThat(
      'keeps status bar text legible on it',
      contrast(r.colors['statusBar.background'], r.colors['statusBar.foreground']) >= 4.5,
      `${contrast(r.colors['statusBar.background'], r.colors['statusBar.foreground']).toFixed(2)}:1`,
    )
  }
  {
    const r = await run({ accentedStatusBar: true, accent: 'Purple' })
    check('follows the chosen accent', r.colors['statusBar.background'], '#b583db')
    check('flips its text to black on a light accent', r.colors['statusBar.foreground'], '#000000')
  }

  console.log('\nselectionStyle')
  {
    const base = await run({})
    const r = await run({ selectionStyle: 'accent' })
    checkThat(
      'retints selection onto the accent',
      r.colors['editor.selectionBackground'] !== undefined,
      'nothing written',
    )
    checkThat(
      'differs from the room-hue default',
      r.colors['editor.selectionBackground'] !== base.colors['editor.selectionBackground'],
      'identical to default',
    )
  }
  {
    const r = await run({ selectionStyle: 'room' })
    check('room is the no-op default', r.scopes, [])
  }

  console.log('\ncursorStyle')
  {
    const r = await run({ cursorStyle: 'accent' })
    check('uses the accent', r.colors['editorCursor.foreground'], DEFAULT_ACCENT)
  }
  {
    const r = await run({ cursorStyle: 'theme' })
    check('theme is the no-op default', r.scopes, [])
  }

  console.log('\nitalics')
  {
    const r = await run({ italics: false })
    checkThat(
      'emits textMateRules',
      Array.isArray(r.tokens?.textMateRules),
      JSON.stringify(r.tokens),
    )
    checkThat(
      'clears fontStyle on every italic scope',
      r.tokens?.textMateRules?.every((rule) => rule.settings.fontStyle === ''),
      'a rule kept its italic style',
    )
    checkThat(
      'covers more than one scope',
      (r.tokens?.textMateRules?.length ?? 0) >= 5,
      `${r.tokens?.textMateRules?.length} scopes`,
    )
  }
  {
    const r = await run({ italics: true })
    check('on is the no-op default', r.tokens, undefined)
  }

  console.log('\ncurrentLine')
  {
    const r = await run({ currentLine: 'solid' })
    checkThat(
      'fills the line and drops the outline',
      r.colors['editor.lineHighlightBorder'] === '#00000000' &&
        r.colors['editor.lineHighlightBackground'] !== '#00000000',
      JSON.stringify(r.colors),
    )
  }
  {
    const r = await run({ currentLine: 'none' })
    check(
      'none clears both',
      [r.colors['editor.lineHighlightBackground'], r.colors['editor.lineHighlightBorder']],
      ['#00000000', '#00000000'],
    )
  }
  {
    const r = await run({ currentLine: 'outline' })
    check('outline is the no-op default', r.scopes, [])
  }

  console.log('\ntabIndicator')
  {
    const r = await run({ tabIndicator: 'top' })
    check(
      'moves to the top edge',
      [r.colors['tab.activeBorderTop'], r.colors['tab.activeBorder']],
      [DEFAULT_ACCENT, '#00000000'],
    )
  }
  {
    const r = await run({ tabIndicator: 'none' })
    check(
      'none clears both edges',
      [r.colors['tab.activeBorderTop'], r.colors['tab.activeBorder']],
      ['#00000000', '#00000000'],
    )
  }
  {
    const r = await run({ tabIndicator: 'bottom' })
    check('bottom is the no-op default', r.scopes, [])
  }

  console.log('\ntabBar')
  {
    const r = await run({ tabBar: 'contrasted' })
    checkThat(
      'darkens the tab bar',
      r.colors['editorGroupHeader.tabsBackground'] !== undefined &&
        r.colors['editorGroupHeader.tabsBackground'] !== '#11131d',
      r.colors['editorGroupHeader.tabsBackground'],
    )
  }
  {
    const r = await run({ tabBar: 'flat' })
    check('flat is the no-op default', r.scopes, [])
  }

  console.log('\nborders')
  {
    const subtle = await run({ borders: 'subtle' })
    const strong = await run({ borders: 'strong' })
    checkThat(
      'subtle sets every border key',
      Object.keys(subtle.colors).length === 8,
      Object.keys(subtle.colors).join(','),
    )
    checkThat(
      'strong is brighter than subtle',
      contrast('#11131d', strong.colors['sideBar.border']) >
        contrast('#11131d', subtle.colors['sideBar.border']),
      `${subtle.colors['sideBar.border']} vs ${strong.colors['sideBar.border']}`,
    )
  }
  {
    const r = await run({ borders: 'none' })
    check('none is the no-op default', r.scopes, [])
  }
  {
    // An accented status bar must keep its own edge rather than a grey one.
    const r = await run({ borders: 'strong', accentedStatusBar: true })
    check('accented status bar keeps its own border', r.colors['statusBar.border'], DEFAULT_ACCENT)
  }

  console.log('\nshadows')
  {
    const r = await run({ shadows: false })
    check(
      'clears the shadows',
      [r.colors['widget.shadow'], r.colors['scrollbar.shadow']],
      ['#00000000', '#00000000'],
    )
  }
  {
    const r = await run({ shadows: true })
    check('on is the no-op default', r.scopes, [])
  }

  console.log('\nicons')
  {
    const r = await run({ accentFolders: true, accent: 'Tomato' })
    checkThat('tints folder icons', r.folderSvg.includes('#ff5c57'), r.folderSvg.slice(0, 90))
    checkThat(
      'keeps the pale motive overlay distinct',
      new Set(r.folderSvg.match(/fill="#[0-9a-f]{6}"/gi) ?? []).size === 2,
      [...new Set(r.folderSvg.match(/fill="#[0-9a-f]{6}"/gi) ?? [])].join(' '),
    )
  }
  {
    const r = await run({ accentFolders: false })
    checkThat(
      'restores original colours when disabled',
      !r.folderSvg.includes('#ff5c57'),
      'stale tint left behind',
    )
  }
  {
    // Rewriting the SVGs in place leaves every iconPath identical, so VS Code serves its
    // cached images and the setting appears to do nothing. The directory has to move.
    const off = await run({ accentFolders: false })
    const on = await run({ accentFolders: true, accent: 'Tomato' })
    checkThat(
      'flipping the accent changes the icon paths, not just the bytes',
      off.folderSetDir !== on.folderSetDir,
      `both resolved to ${on.folderSetDir}`,
    )
    checkThat(
      'the theme json points at the live set',
      JSON.parse(fs.readFileSync(ICON_THEME, 'utf8')).iconDefinitions[
        'folder-src'
      ].iconPath.includes(on.folderSetDir),
      'theme json still points at a stale directory',
    )
  }
  {
    // Switching accents repeatedly must not accumulate directories in the install.
    for (const a of ['Tomato', 'Lime', 'Purple']) await run({ accentFolders: true, accent: a })
    const dirs = fs.readdirSync(path.join(ROOT, 'icons', 'folders'))
    checkThat('old folder sets are cleaned up', dirs.length === 2, dirs.join(', '))
  }
  {
    const r = await run({ hideExplorerArrows: true })
    check('hiding arrows sets the flag', r.iconThemeJson.hidesExplorerArrows, true)
  }
  {
    const r = await run({ syncIconTheme: false }, { iconTheme: 'vs-seti' })
    check('leaves the icon theme alone', r.iconTheme, 'vs-seti')
  }
  {
    const r = await run({}, { theme: 'Default Dark+', iconTheme: 'vs-seti' })
    check('does not hijack a non-Chromaleon theme', r.iconTheme, 'vs-seti')
    check('writes nothing for a non-Chromaleon theme', r.scopes, [])
  }

  console.log('\nlight variant (Chalk)')
  {
    // Every override that lifts a surface off the background has to flip direction on a
    // light variant. Mixing toward white on near-white paper produces nothing visible.
    const LIGHT = 'Chromaleon Chalk'
    const bg = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'themes', 'Chromaleon-Chalk.json'), 'utf8'),
    ).colors['editor.background']

    const b = await run({ borders: 'strong' }, { theme: LIGHT })
    checkThat(
      'borders are visible on a light background',
      contrast(bg, b.colors['sideBar.border']) >= 1.35,
      `${b.colors['sideBar.border']} on ${bg} = ${contrast(bg, b.colors['sideBar.border']).toFixed(2)}:1`,
    )

    const c = await run({ currentLine: 'solid' }, { theme: LIGHT })
    checkThat(
      'the solid current line is visible',
      c.colors['editor.lineHighlightBackground'] !== bg &&
        contrast(bg, c.colors['editor.lineHighlightBackground']) > 1.01,
      c.colors['editor.lineHighlightBackground'],
    )

    const t = await run({ tabBar: 'contrasted' }, { theme: LIGHT })
    checkThat(
      'the contrasted tab bar stays a shade of the paper, not a dark slab',
      contrast(bg, t.colors['editorGroupHeader.tabsBackground']) < 2,
      `${t.colors['editorGroupHeader.tabsBackground']} = ${contrast(bg, t.colors['editorGroupHeader.tabsBackground']).toFixed(2)}:1`,
    )

    const d = await run({}, { theme: LIGHT })
    check('an untouched light install writes nothing', d.scopes, [])
  }

  console.log('\nrole overrides')
  {
    const r = await run({ roleOverrides: { 'Chromaleon Woad': { green: '#00ff00' } } })
    check('recolours the workbench keys the role paints', r.colors['terminal.ansiGreen'], '#00ff00')
    check('including the translucent ones', r.colors['editorGutter.addedBackground'], '#00ff0099')
    checkThat(
      'and every syntax scope, or the editor would not move',
      (r.tokens?.textMateRules ?? []).some(
        (rule) => rule.scope === 'string' && rule.settings.foreground === '#00ff00',
      ),
      JSON.stringify(r.tokens?.textMateRules?.slice(0, 2)),
    )
    checkThat(
      'scopes it does not paint are left alone',
      !(r.tokens?.textMateRules ?? []).some((rule) => rule.scope === 'comment'),
      'recoloured a scope belonging to another role',
    )
    check('overrides are scoped to the theme they were made on', r.scopes, ['[Chromaleon Woad]'])
  }
  {
    // 119 of the 279 workbench keys render their role below full opacity. Writing a flat hex
    // over those turns every border and hover state into a slab, and the value would still
    // look correct in settings.json.
    const r = await run({ roleOverrides: { 'Chromaleon Woad': { fg: '#ff0000' } } })
    check('keeps the alpha the key renders at', r.colors['descriptionForeground'], '#ff0000cc')
    check('and leaves opaque keys opaque', r.colors['editor.foreground'], '#ff0000')
  }
  {
    const r = await run({ roleOverrides: { 'Chromaleon Basalt': { fg: '#ff0000' } } })
    check("another theme's overrides do not leak into this one", r.scopes, [])
  }
  {
    const r = await run({
      italics: false,
      roleOverrides: { 'Chromaleon Woad': { green: '#00ff00' } },
    })
    const rules = r.tokens?.textMateRules ?? []
    checkThat(
      'italics and recolouring share one block without clobbering',
      rules.some((x) => x.settings.fontStyle === '') && rules.some((x) => x.settings.foreground),
      `${rules.length} rules`,
    )
  }
  {
    const r = await run({ roleOverrides: { 'Chromaleon Woad': { green: '#00ff00' } } })
    const left = await r.deactivate()
    check('deactivate takes the overrides with it', left, undefined)
  }

  console.log('\ncustomizer panel')
  {
    const r = await run({})
    checkThat(
      'registers the open command',
      r.commands.includes('chromaleon.openCustomizer'),
      r.commands.join(', '),
    )
    // Opening on activation would pop a panel in everyone's face on every window.
    check('does not open the panel on activation', r.settings.__panelOpened, undefined)

    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
    const declared = manifest.contributes.commands.map((c) => c.command)
    checkThat(
      'every registered command is declared in the manifest',
      r.commands.every((c) => declared.includes(c)),
      r.commands.filter((c) => !declared.includes(c)).join(', '),
    )
    checkThat(
      'every declared command is actually registered',
      declared.every((c) => r.commands.includes(c)),
      declared.filter((c) => !r.commands.includes(c)).join(', '),
    )
  }
  {
    // The panel is served entirely from dist/, which is what localResourceRoots allows.
    for (const asset of ['webview.js', 'webview.css', 'extension.cjs']) {
      checkThat(`dist/${asset} is built`, fs.existsSync(path.join(ROOT, 'dist', asset)), 'missing')
    }
  }

  console.log('\ngenerated role catalogue')
  {
    // generated.ts is written by build.ts as a JSON literal, so the object can be read back
    // without running the bundle. The customizer's numbers come from here, and the whole
    // point of generating them is that nobody can hand-write one that flatters the design.
    const source = fs.readFileSync(path.join(ROOT, 'src', 'generated.ts'), 'utf8')
    const runtime = JSON.parse(source.slice(source.indexOf('{'), source.lastIndexOf('}') + 1))
    const roles = runtime.roles

    check('every Palette role is catalogued', roles.length, 32)
    checkThat(
      'no role is listed twice',
      new Set(roles.map((r) => r.id)).size === roles.length,
      'duplicate role id',
    )

    // Two independent introspections of the same mapping. If they disagree, one of them is
    // reading a stale build.
    const accent = roles.find((r) => r.id === 'accent')
    check('accent count agrees with the accent override list', accent.keys.length, 49)

    // Alpha has to survive into the catalogue. Writing a role override without it turns every
    // translucent border and hover state solid, and nothing about the value would look wrong.
    const translucent = roles.flatMap((r) => r.keys).filter((k) => k.alpha)
    check('translucent keys keep their alpha', translucent.length, 119)

    const allKeys = roles.flatMap((r) => r.keys.map((k) => k.key))
    check('every workbench key is attributed to a role', allKeys.length, 279)
    checkThat(
      'no workbench key is attributed twice',
      new Set(allKeys).size === allKeys.length,
      'a key belongs to two roles',
    )

    // The floors are read from core/roles.ts rather than restated, so this cannot become a
    // third copy of the same five numbers that drifts from the other two.
    const floorSource = fs.readFileSync(path.join(ROOT, 'src', 'core', 'roles.ts'), 'utf8')
    const allowed = [...floorSource.matchAll(/^\s+(?:\/\*\*.*\*\/\s+)?\w+: ([\d.]+),$/gm)].map(
      (m) => Number(m[1]),
    )
    check('the floor table has five entries', allowed.length, 5)

    // A role with a floor must be measurable against something, or the status line is
    // counting roles it cannot actually judge.
    const floored = roles.filter((r) => r.floor.on !== 'none')
    checkThat(
      'every floor comes from that table',
      floored.every((r) => allowed.includes(r.floor.min)),
      floored
        .filter((r) => !allowed.includes(r.floor.min))
        .map((r) => `${r.id}=${r.floor.min}`)
        .join(', '),
    )
    checkThat(
      'the hue ramp is all measured',
      floored.filter((r) => r.group === 'Hue ramp').length,
      9,
    )

    // A faint lift has to move away from the background, which on a light variant means
    // darker. Wired to white instead, every widget border and the find-match washes vanish
    // on Chalk, and no contrast floor catches it because they are meant to be barely there.
    for (const [theme, wantsDark] of [
      ['Chromaleon Chalk', true],
      ['Chromaleon Obsidian', false],
    ]) {
      const p = runtime.palettes[theme]
      checkThat(
        `${theme} hairlines lift away from the background`,
        (p.hairline === '#000000') === wantsDark,
        `hairline ${p.hairline} on bg ${p.bg}`,
      )
    }
    checkThat(
      'no role paints nothing',
      roles.every((r) => r.keys.length + r.scopes.length > 0),
      roles
        .filter((r) => r.keys.length + r.scopes.length === 0)
        .map((r) => r.id)
        .join(', '),
    )

    // The canvas is a map now: click a region and it hands back the role tagged on it. A
    // region tagged with a role that does not actually paint that key sends people to edit
    // the wrong colour, and nothing about the rendering would look wrong.
    const canvas = fs.readFileSync(path.join(ROOT, 'src', 'webview', 'canvas.tsx'), 'utf8')
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
      const owner = roles.find((r) => r.keys.some((k) => k.key === key))?.id
      const tagged = canvas.match(new RegExp(`paint\\('([a-zA-Z]+)', '${className}'\\)`))?.[1]
      checkThat(
        `canvas .${className} is tagged with the role that paints ${key}`,
        tagged === owner,
        `tagged ${tagged}, ${key} is painted by ${owner}`,
      )
    }

    const ids = roles.map((r) => r.id)
    const palettes = Object.entries(runtime.palettes)
    check('a palette is emitted for every theme', palettes.length, 22)
    checkThat(
      'every palette carries every role',
      palettes.every(([, p]) => ids.every((id) => typeof p[id] === 'string')),
      'a palette is missing a role',
    )
  }

  console.log('\ncustomizer opens where the setting says')
  {
    const open = async (location, theme = 'Chromaleon Woad') => {
      const executed = []
      const posted = []
      const written = []
      let column
      let receive
      const stub = baseStub()
      stub.workspace.getConfiguration = (section) => ({
        get: (key, fallback) => {
          if (key === 'customizerLocation') return location
          if (key === 'workbench.colorTheme') return theme
          return fallback
        },
        inspect: () => ({}),
        update: async (key, value) =>
          void written.push(`${section ?? ''}.${key}=${JSON.stringify(value)}`),
      })
      // Here the panel is the thing under test, so opening it is expected rather than fatal.
      stub.window.createWebviewPanel = (_type, _title, viewColumn) => {
        column = viewColumn
        return {
          webview: {
            options: {},
            html: '',
            cspSource: 'vscode-webview:',
            asWebviewUri: (uri) => uri,
            onDidReceiveMessage: (handler) => {
              receive = handler
              return { dispose() {} }
            },
            postMessage: async (message) => void posted.push(message),
          },
          onDidDispose: () => ({ dispose() {} }),
          reveal() {},
        }
      }
      stub.commands = {
        registerCommand: (id, handler) => {
          if (id === 'chromaleon.openCustomizer') stub.__open = handler
          return { dispose() {} }
        },
        executeCommand: async (id) => void executed.push(id),
      }

      const { withStub } = await activateWith(stub, {
        extensionPath: ROOT,
        extensionUri: { fsPath: ROOT },
        extension: { packageJSON: { version: '0.0.0' } },
        subscriptions: [],
        globalState: { get: (k, d) => d, update: async () => {}, setKeysForSync: () => {} },
      })
      // Applying the active theme on activation writes settings, and should. Drop those so
      // `written` holds only what opening and driving the panel did.
      const activationWrites = written.splice(0)

      await withStub(async () => {
        await stub.__open()
        // The panel asks for state as soon as its script runs; nothing is sent before that.
        if (receive) await receive({ type: 'ready' })
      })
      const send = (message) => withStub(() => receive(message))
      return { executed, column, posted, written, activationWrites, send }
    }

    // There is no ViewColumn for a separate window, so this is the only observable
    // difference between opening in a new window and opening in this one.
    const moved = await open('newWindow')
    checkThat(
      'newWindow moves the panel out to its own window',
      moved.executed.includes('workbench.action.moveEditorToNewWindow'),
      moved.executed.join(', ') || 'nothing executed',
    )

    const active = await open('active')
    checkThat(
      'active leaves the panel in this window',
      !active.executed.includes('workbench.action.moveEditorToNewWindow'),
      'moved anyway',
    )
    check('active opens in the active column', active.column, -1)

    const beside = await open('beside')
    check('beside opens in the column alongside', beside.column, -2)
    checkThat(
      'beside leaves the panel in this window',
      !beside.executed.includes('workbench.action.moveEditorToNewWindow'),
      'moved anyway',
    )

    console.log('\ncustomizer state, and what it must never write')
    const opened = await open('active', 'Chromaleon Tyrian')
    const state = opened.posted.find((m) => m.type === 'state')?.state
    checkThat('the panel is sent state when it reports ready', !!state, 'nothing posted')

    check('every shipped theme is offered', state.themes.length, 22)
    check('every palette travels with them', Object.keys(state.palettes).length, 22)
    check('the catalogue travels once, not per theme', state.roles.length, 32)
    check('the active theme is named', state.active, 'Chromaleon Tyrian')
    checkThat(
      'high contrast variants are flagged rather than parsed in the panel',
      state.themes.filter((t) => t.highContrast).length === 11,
      `${state.themes.filter((t) => t.highContrast).length} flagged`,
    )

    // The whole point of switching themes inside the customizer is that it previews without
    // restyling the editor the user is working in. Writing colorTheme would break that, and
    // it is the kind of thing an innocent-looking refactor reintroduces.
    checkThat(
      'opening the customizer writes no settings of its own',
      opened.written.length === 0,
      opened.written.join(', '),
    )
    checkThat(
      'the panel never sets workbench.colorTheme',
      !opened.written.some((w) => w.includes('colorTheme')),
      opened.written.join(', '),
    )

    // Editing writes only the override setting. If a refactor ever made it write colours
    // directly, the ledger would stop knowing what it owns and deactivate would leave them
    // behind, which is bug 2 in a new coat.
    await opened.send({ type: 'setRole', theme: 'Chromaleon Tyrian', role: 'fg', value: '#ff0000' })
    checkThat(
      'editing a role writes the override setting and nothing else',
      opened.written.length === 1 && opened.written[0].startsWith('chromaleon.roleOverrides='),
      opened.written.join(', ') || 'nothing written',
    )

    // The panel edits the theme it is showing, which is the whole reason you can fix Chalk
    // without leaving the dark theme you work in.
    const other = await open('active', 'Chromaleon Tyrian')
    await other.send({ type: 'setRole', theme: 'Chromaleon Chalk', role: 'fg', value: '#ff0000' })
    checkThat(
      'and can edit a theme that is not the active one',
      other.written.some((w) => w.includes('Chalk')),
      other.written.join(', '),
    )

    // Choosing a theme is a deliberate, user-initiated act, so it goes through VS Code's own
    // picker rather than us writing the setting behind their back.
    const before = opened.written.length
    await opened.send({ type: 'pickTheme' })
    checkThat(
      'choosing a theme defers to the VS Code picker',
      opened.executed.includes('workbench.action.selectTheme'),
      opened.executed.join(', '),
    )
    checkThat(
      'and writes nothing itself',
      opened.written.length === before,
      opened.written.slice(before).join(', '),
    )
  }

  console.log('\nevery setting is declared in package.json')
  {
    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
    const declared = manifest.contributes.configuration.properties
    const names = Object.keys(declared).map((k) => k.replace('chromaleon.', ''))
    const READ = [
      'accent',
      'customAccent',
      'accentedStatusBar',
      'selectionStyle',
      'cursorStyle',
      'italics',
      'currentLine',
      'tabIndicator',
      'tabBar',
      'borders',
      'shadows',
      'accentFolders',
      'hideExplorerArrows',
      'syncIconTheme',
      'customizerLocation',
      'roleOverrides',
    ]
    check('manifest declares exactly what the runtime reads', names.sort(), [...READ].sort())
    checkThat(
      'accent and customAccent lead the list',
      declared['chromaleon.accent'].order === 1 && declared['chromaleon.customAccent'].order === 2,
      'ordering changed',
    )
    const dupes = names.length !== new Set(names).size
    checkThat(
      'no duplicate orders',
      !dupes && new Set(Object.values(declared).map((d) => d.order)).size === names.length,
      'duplicate order values',
    )
  }

  console.log('\ncombinations and cleanup')
  {
    const r = await run({ accent: 'Pink', borders: 'strong', shadows: false })
    checkThat(
      'combined settings merge',
      Object.keys(r.colors).length > 57,
      `${Object.keys(r.colors).length} keys`,
    )
    const left = await r.deactivate()
    check('deactivate clears our block', left, undefined)
  }
  {
    // A hand-written customisation must survive our add/remove cycle.
    const r = await run({ accent: 'Purple' })
    r.settings['workbench.colorCustomizations']['[Chromaleon Woad]']['editor.background'] =
      '#123456'
    const r2 = await run({ accent: 'Lime' })
    checkThat(
      'ours update without clobbering',
      r2.colors['button.background'] === '#a8d96f',
      r2.colors['button.background'],
    )
  }

  console.log('\nregressions (these three shipped as bugs once)')
  {
    // A workspace-level customization must not be absorbed into user settings.
    const r = await run(
      { accent: 'Purple' },
      {
        workspace: {
          'workbench.colorCustomizations': {
            '[Chromaleon Woad]': { 'editor.background': '#123456' },
          },
        },
      },
    )
    const globalBlock =
      (r.settings['workbench.colorCustomizations'] ?? {})['[Chromaleon Woad]'] ?? {}
    checkThat(
      'does not copy workspace customizations into global',
      globalBlock['editor.background'] === undefined,
      `leaked ${globalBlock['editor.background']}`,
    )
  }
  {
    // A hand-authored key in our own scope block must survive our add/remove cycle.
    const own = { '[Chromaleon Woad]': { 'editor.background': '#abcdef' } }
    const r = await run({ accent: 'Purple' }, { global: { 'workbench.colorCustomizations': own } })
    const after = (r.settings['workbench.colorCustomizations'] ?? {})['[Chromaleon Woad]'] ?? {}
    checkThat(
      'preserves hand-written keys in our scope block',
      after['editor.background'] === '#abcdef',
      JSON.stringify(after['editor.background']),
    )
  }
  {
    // Same for token customizations: only our own italic rules may be removed.
    const own = {
      '[Chromaleon Woad]': {
        textMateRules: [{ scope: 'keyword.control', settings: { foreground: '#ff0000' } }],
      },
    }
    const r = await run({ italics: true }, { global: { 'editor.tokenColorCustomizations': own } })
    const rules = (r.settings['editor.tokenColorCustomizations'] ?? {})['[Chromaleon Woad]']
      ?.textMateRules
    checkThat(
      "preserves the user's own textMateRules",
      Array.isArray(rules) && rules.some((x) => x.settings?.foreground === '#ff0000'),
      JSON.stringify(rules),
    )
  }
  {
    // The owned-key ledger has to be registered for Settings Sync, or the keys it
    // describes become unremovable orphans on every other machine.
    let synced = null
    const stub = baseStub()
    stub.workspace.getConfiguration = () => ({
      get: (k, d) => d,
      inspect: () => ({}),
      update: async () => {},
    })
    stub.commands = { registerCommand: () => ({ dispose() {} }), executeCommand: async () => {} }
    await activateWith(stub, {
      extensionPath: ROOT,
      extensionUri: { fsPath: ROOT },
      subscriptions: [],
      globalState: {
        get: (k, d) => d,
        update: async () => {},
        setKeysForSync: (keys) => void (synced = keys),
      },
    })
    checkThat(
      'registers the owned-key ledger for Settings Sync',
      Array.isArray(synced) && synced.length > 0,
      JSON.stringify(synced),
    )
  }

  console.log(`\n${passed} passed, ${failed} failed\n`)
  process.exit(failed > 0 ? 1 : 0)
})().catch((error) => {
  console.error('\nTEST HARNESS ERROR:', error)
  process.exit(1)
})
