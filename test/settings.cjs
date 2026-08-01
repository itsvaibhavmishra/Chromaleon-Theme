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

/** Runs activate() with the given chromaleon settings and returns the effects. */
async function run(
  chromaleon,
  { theme = 'Chromaleon Woad', iconTheme = 'vs-seti', global = {}, workspace = {} } = {},
) {
  // Global and workspace are tracked separately so the harness can tell the difference
  // between what the user set and what the merged view reports: the distinction bug 1
  // turned on.
  const settings = { 'workbench.colorTheme': theme, 'workbench.iconTheme': iconTheme, ...global }
  const ws = { ...workspace }
  const store = new Map()

  const vscode = {
    workspace: {
      getConfiguration: (section) =>
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
            },
      onDidChangeConfiguration: () => ({ dispose() {} }),
    },
    window: {
      onDidChangeActiveColorTheme: () => ({ dispose() {} }),
      showInformationMessage: () => {},
      showErrorMessage: () => {},
      showQuickPick: async () => undefined,
    },
    commands: { registerCommand: () => ({ dispose() {} }), executeCommand: async () => {} },
    ConfigurationTarget: { Global: 1, Workspace: 2 },
  }

  const load = Module._load
  Module._load = (req, parent, isMain) => (req === 'vscode' ? vscode : load(req, parent, isMain))
  delete require.cache[BUNDLE]
  const ext = require(BUNDLE)

  await ext.activate({
    extensionPath: ROOT,
    subscriptions: [],
    globalState: {
      get: (k, d) => (store.has(k) ? store.get(k) : d),
      update: async (k, v) => void store.set(k, v),
      setKeysForSync: () => {},
    },
  })
  Module._load = load

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
    iconThemeJson: JSON.parse(fs.readFileSync(ICON_THEME, 'utf8')),
    folderSvg: fs.readFileSync(folderIcon(), 'utf8'),
    folderSetDir: path.basename(path.dirname(folderIcon())),
    deactivate: async () => {
      Module._load = (req, p, m) => (req === 'vscode' ? vscode : load(req, p, m))
      await ext.deactivate()
      Module._load = load
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
    const load = Module._load
    const vscodeStub = {
      workspace: {
        getConfiguration: () => ({
          get: (k, d) => d,
          inspect: () => ({}),
          update: async () => {},
        }),
        onDidChangeConfiguration: () => ({ dispose() {} }),
      },
      window: {
        onDidChangeActiveColorTheme: () => ({ dispose() {} }),
        showInformationMessage: () => {},
      },
      commands: { registerCommand: () => ({ dispose() {} }), executeCommand: async () => {} },
      ConfigurationTarget: { Global: 1 },
    }
    Module._load = (req, par, m) => (req === 'vscode' ? vscodeStub : load(req, par, m))
    delete require.cache[BUNDLE]
    await require(BUNDLE).activate({
      extensionPath: ROOT,
      subscriptions: [],
      globalState: {
        get: (k, d) => d,
        update: async () => {},
        setKeysForSync: (keys) => void (synced = keys),
      },
    })
    Module._load = load
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
