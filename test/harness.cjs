// Everything the suites share: where to read the build from, the stubbed `vscode` module,
// and the two assertion helpers. Required through `#test/`, declared in package.json, so a
// suite never has to spell a relative path to reach it.
//
// The counters are module state on purpose. One process runs every suite in order and the
// entry point reports a single total, so a suite that failed cannot be lost in the noise.
const Module = require('node:module')
const path = require('node:path')
const fs = require('node:fs')

const ROOT = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, '..')
// An installed copy ships no source, so assertions that read src/ have to resolve against this
// repo. Pointing them at ROOT is what broke the packaged run: it looked like a missing file.
const SOURCE_ROOT = path.resolve(__dirname, '..')
const BUNDLE = path.join(ROOT, 'dist', 'extension.cjs')
const MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
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

function contrast(first, second) {
  const lum = (hex) => {
    const packed = parseInt(hex.slice(1, 7), 16)
    const ch = [(packed >> 16) & 255, (packed >> 8) & 255, packed & 255].map((channel) => {
      const fraction = channel / 255
      return fraction <= 0.03928 ? fraction / 12.92 : ((fraction + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
  }
  const [lighter, darker] = [lum(first), lum(second)].sort((left, right) => right - left)
  return (lighter + 0.05) / (darker + 0.05)
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
  const handlers = new Map()
  const settings = { 'workbench.colorTheme': theme, 'workbench.iconTheme': iconTheme, ...global }
  const ws = { ...workspace }
  const store = new Map()

  const vscode = baseStub()
  vscode.workspace.getConfiguration = (section) =>
    section === 'chromaleon'
      ? {
          get: (key, fallback) => (key in chromaleon ? chromaleon[key] : fallback),
          // undefined removes rather than stores, as VS Code does. Storing it would make a
          // reset look like it wrote seventeen undefined values.
          update: async (key, value) => {
            if (value === undefined) delete chromaleon[key]
            else chromaleon[key] = value
          },
        }
      : {
          get: (key, fallback) =>
            key in ws ? ws[key] : key in settings ? settings[key] : fallback,
          inspect: (key) => ({ key, globalValue: settings[key], workspaceValue: ws[key] }),
          update: async (key, value, target) => {
            const scopeStore = target === 2 ? ws : settings
            if (value === undefined) delete scopeStore[key]
            else scopeStore[key] = value
          },
        }
  // Opening on activation would pop a panel in everyone's face on every window, so here it
  // is not merely unwanted, it is an error.
  vscode.window.createWebviewPanel = () => {
    throw new Error('the panel should not open during activation')
  }
  vscode.commands = {
    registerCommand: (id, handler) => {
      registered.push(id)
      handlers.set(id, handler)
      return { dispose() {} }
    },
    executeCommand: async () => {},
  }

  const { withStub } = await activateWith(vscode, {
    extensionPath: ROOT,
    extensionUri: { fsPath: ROOT },
    // The real manifest, not a stand-in: the reset command derives its key list from it, so a
    // hand-written stub here would assert against a list nothing ships.
    extension: { packageJSON: { version: '0.0.0-test', ...MANIFEST } },
    subscriptions: [],
    globalState: {
      get: (key, fallback) => (store.has(key) ? store.get(key) : fallback),
      update: async (key, value) => void store.set(key, value),
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
    chromaleon,
    // Command handlers reach for vscode the same way deactivate() does, so they need the stub
    // reinstalled around the call.
    runCommand: (id) => withStub(() => handlers.get(id)()),
    deactivate: async () => {
      await withStub((ext) => ext.deactivate())
      return settings['workbench.colorCustomizations']
    },
  }
}

// activateWith patches Module._load process-globally, so suites must run one at a time.
// Running them concurrently is a correctness bug, not a style preference.
async function runSuites(suites) {
  for (const suite of suites) await suite()
  return { passed, failed }
}

module.exports = {
  ROOT,
  SOURCE_ROOT,
  ICON_THEME,
  MANIFEST,
  DEFAULT_ACCENT,
  folderIcon,
  contrast,
  check,
  checkThat,
  baseStub,
  activateWith,
  run,
  runSuites,
}
