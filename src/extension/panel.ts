import { randomBytes } from 'node:crypto'

import * as vscode from 'vscode'

import { NS } from '@/config/extension'
import { CANVAS_DEFAULT } from '@/constants/panel'

import { resolveAccent } from '@/core/accents'
import { activeLayout, LAYOUT_SECTION } from '@/extension/layout'
import { treeIcons } from '@/extension/icon-preview'
import { type PortablePreset, writePresetFile } from '@/utils/preset-file'
import { CONCEPTS } from '@/core/roles'
import { RUNTIME } from '@/generated'
import type {
  PanelState,
  RoleMeta,
  SettingMeta,
  ThemeOption,
  ToHost,
  ToWebview,
} from '@/webview/protocol'
import {
  activeVariant,
  applyTheme,
  deletePreset,
  readSettings,
  renamePreset,
  importPresets,
  savePreset,
  writeSetting,
} from '@/extension/settings'

const VIEW_TYPE = 'chromaleon.customizer'

// The webview's own store dies with the panel, so this lives in globalState. Not synced.
const CANVAS_HEIGHT = `${NS}.canvasHeight`

// Where a preset goes is the user's call, so this asks rather than picking a folder for them.
async function savePresetFile(presets: PortablePreset[]): Promise<void> {
  if (presets.length === 0) return
  const suggested = presets.length === 1 ? presets[0].name : 'chromaleon-presets'
  const target = await vscode.window.showSaveDialog({
    filters: { 'Chromaleon preset': ['json'] },
    saveLabel: 'Export',
    defaultUri: vscode.Uri.file(`${suggested.replace(/[^\w. -]/g, '')}.json`),
  })
  if (!target) return
  await vscode.workspace.fs.writeFile(target, Buffer.from(writePresetFile(presets), 'utf8'))
  vscode.window.showInformationMessage(
    `${RUNTIME.brand}: exported ${presets.length === 1 ? presets[0].name : `${presets.length} presets`}.`,
  )
}

// One panel at a time. A second copy would fight the first over the same settings.
let current: vscode.WebviewPanel | undefined

const HIGH_CONTRAST = ' High Contrast'

// The manifest is the only place a setting is declared, so the panel's controls are read back
// off it. An object-valued setting is state rather than a choice, so it gets no control.
function contributedSettings(context: vscode.ExtensionContext): SettingMeta[] {
  const declared: Record<string, ManifestSetting> =
    context.extension?.packageJSON?.contributes?.configuration?.properties ?? {}

  return Object.entries(declared)
    .filter(([key, schema]) => key.startsWith(`${NS}.`) && schema.type !== 'object')
    .map(([key, schema]) => {
      const options = schema.enum?.map((value, index) => ({
        value,
        detail: schema.enumDescriptions?.[index],
      }))
      return {
        key: key.slice(NS.length + 1),
        kind: schema.type === 'boolean' ? 'boolean' : options ? 'enum' : 'text',
        description: schema.markdownDescription ?? schema.description ?? '',
        ...(options ? { options } : {}),
      } satisfies SettingMeta
    })
}

interface ManifestSetting {
  type?: string
  enum?: string[]
  enumDescriptions?: string[]
  description?: string
  markdownDescription?: string
}

// Catalogue and every palette in one message, so the panel can show any theme without a
// round trip and without changing the one you are working in.
function panelState(context: vscode.ExtensionContext): PanelState {
  const settings = readSettings()
  const variant = activeVariant()
  const themes: ThemeOption[] = Object.keys(RUNTIME.variants).map((label) => ({
    label,
    highContrast: label.endsWith(HIGH_CONTRAST),
  }))

  const roles: RoleMeta[] = RUNTIME.roles.map((role) => ({
    id: role.id,
    label: role.label,
    group: role.group,
    // The panel only displays these, so it gets the names. Alpha stays host-side, where the
    // overrides are actually written.
    keys: role.keys.map((entry) => entry.key),
    scopes: role.scopes.map((entry) => entry.key),
    floor: role.floor,
  }))

  return {
    roles,
    concepts: CONCEPTS.map((concept) => ({ ...concept })),
    themes,
    palettes: RUNTIME.palettes,
    active: variant?.label ?? null,
    layout: activeLayout(),
    canvasHeight: context.globalState.get<number>(CANVAS_HEIGHT) ?? CANVAS_DEFAULT,
    accentOverride: resolveAccent(settings.accent, settings.customAccent) ?? null,
    presets: settings.presets,
    activePresets: settings.activePresets,
    settings: contributedSettings(context),
    treeIcons: treeIcons(),
    // readSettings already resolves each one against its default, so the panel never has to
    // decide what an unset value shows as.
    settingValues: Object.fromEntries(
      Object.entries(settings).filter(
        ([, value]) => typeof value === 'string' || typeof value === 'boolean',
      ),
    ),
  }
}

function html(webview: vscode.Webview, context: vscode.ExtensionContext): string {
  const asset = (name: string) =>
    webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri, 'dist', name))

  // A nonce means only our own script runs, even if some string we render ever contained
  // markup. cspSource is what VS Code rewrites local resource URIs onto.
  const nonce = randomBytes(16).toString('base64')

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data:; style-src ${webview.cspSource}; font-src ${webview.cspSource}; script-src 'nonce-${nonce}';" />
    <link rel="stylesheet" href="${asset('webview.css')}" />
    <title>Chromaleon</title>
  </head>
  <body>
    <script nonce="${nonce}" src="${asset('webview.js')}"></script>
  </body>
</html>`
}

function wire(panel: vscode.WebviewPanel, context: vscode.ExtensionContext): void {
  current = panel
  panel.iconPath = vscode.Uri.joinPath(context.extensionUri, 'icon.png')
  panel.webview.options = {
    enableScripts: true,
    // Nothing outside dist/ is reachable from the panel.
    localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'dist')],
  }
  panel.webview.html = html(panel.webview, context)

  const push = () => {
    const message: ToWebview = { type: 'state', state: panelState(context) }
    void panel.webview.postMessage(message)
  }

  // Everything here is disposed with the panel, not with the extension, so reopening does
  // not stack a second set of listeners on the first.
  const listeners = [
    panel.webview.onDidReceiveMessage((message: ToHost) => {
      if (message.type === 'ready') push()
      else if (message.type === 'openSettings') {
        void vscode.commands.executeCommand('workbench.action.openSettings', `@ext:${NS}`)
      } else if (message.type === 'pickTheme') {
        void vscode.commands.executeCommand('workbench.action.selectTheme')
      } else if (message.type === 'save') {
        void savePreset(message.base, message.preset, message.overrides).then((preset) => {
          const saved: ToWebview = { type: 'saved', preset }
          return panel.webview.postMessage(saved)
        })
      } else if (message.type === 'applyTheme') {
        void applyTheme(message.base, message.preset)
      } else if (message.type === 'renamePreset') {
        void renamePreset(message.preset, message.name)
      } else if (message.type === 'setSetting') {
        void writeSetting(message.key, message.value)
      } else if (message.type === 'importPresets') {
        void importPresets(message.presets)
      } else if (message.type === 'exportPresets') {
        void savePresetFile(message.presets)
      } else if (message.type === 'deletePreset') {
        void deletePreset(message.preset)
      } else if (message.type === 'setCanvasHeight') {
        void context.globalState.update(CANVAS_HEIGHT, message.height)
      }
    }),
    // The panel paints its own chrome from --vscode-* variables, so VS Code restyles that
    // part by itself. This resends the palette the canvas and the role list are drawn from.
    vscode.window.onDidChangeActiveColorTheme(() => push()),
    vscode.workspace.onDidChangeConfiguration((event) => {
      const watched = [NS, 'workbench.colorTheme', 'workbench.iconTheme', LAYOUT_SECTION]
      if (watched.some((section) => event.affectsConfiguration(section))) push()
    }),
  ]

  panel.onDidDispose(() => {
    for (const listener of listeners) listener.dispose()
    if (current === panel) current = undefined
  })
}

/** Opens the customizer, or focuses it when it is already open. */
export async function openCustomizer(context: vscode.ExtensionContext): Promise<void> {
  if (current) {
    current.reveal(current.viewColumn)
    return
  }

  const location = readSettings().customizerLocation
  const column = location === 'beside' ? vscode.ViewColumn.Beside : vscode.ViewColumn.Active

  wire(
    // wire() sets the webview options, including for panels the serializer restores.
    vscode.window.createWebviewPanel(VIEW_TYPE, 'Chromaleon', column, {
      // Keeps scroll position and in-progress edits across tab switches. The panel is
      // small, so the memory this costs is not a concern.
      retainContextWhenHidden: true,
    }),
    context,
  )

  // No ViewColumn means a separate window, so create here and move; the panel has focus,
  // which is what the command acts on. A failure is not worth surfacing: it is already open.
  if (location === 'newWindow') {
    try {
      await vscode.commands.executeCommand('workbench.action.moveEditorToNewWindow')
    } catch {
      // Older builds without auxiliary windows land here.
    }
  }
}

// Without this the panel silently disappears on window reload, since VS Code restores the
// tab but has nobody to rebuild its contents.
export function registerSerializer(context: vscode.ExtensionContext): vscode.Disposable {
  return vscode.window.registerWebviewPanelSerializer(VIEW_TYPE, {
    deserializeWebviewPanel(panel) {
      wire(panel, context)
      return Promise.resolve()
    },
  })
}
