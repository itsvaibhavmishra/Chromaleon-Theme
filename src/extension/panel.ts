import { randomBytes } from 'node:crypto'

import * as vscode from 'vscode'

import { resolveAccent } from '@/core/accents'
import { CONCEPTS } from '@/core/roles'
import { RUNTIME } from '@/generated'
import type { PanelState, RoleMeta, ThemeOption, ToHost, ToWebview } from '@/webview/protocol'
import {
  activeVariant,
  clearRoleOverrides,
  NS,
  readSettings,
  updateRoleOverride,
} from '@/extension/settings'

const VIEW_TYPE = 'chromaleon.customizer'

// One panel at a time. A second copy would fight the first over the same settings.
let current: vscode.WebviewPanel | undefined

const HIGH_CONTRAST = ' High Contrast'

// The whole catalogue and every palette go over at once. The panel can then show any theme
// without a round trip, which is what lets someone compare variants inside the customizer
// without changing the theme they are actually working in.
function panelState(): PanelState {
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
    accentOverride: resolveAccent(settings.accent, settings.customAccent) ?? null,
    overrides: settings.roleOverrides,
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
    const message: ToWebview = { type: 'state', state: panelState() }
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
      } else if (message.type === 'setRole') {
        void updateRoleOverride(message.theme, message.role, message.value ?? undefined)
      } else if (message.type === 'resetTheme') {
        void clearRoleOverrides(message.theme)
      }
    }),
    // The panel paints its own chrome from --vscode-* variables, so VS Code restyles that
    // part by itself. This resends the palette the canvas and the role list are drawn from.
    vscode.window.onDidChangeActiveColorTheme(() => push()),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(NS) || event.affectsConfiguration('workbench.colorTheme')) {
        push()
      }
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

  // There is no ViewColumn for a separate window, so the panel is created in this one and
  // moved. It has focus at this point, which is what the move command acts on. A failure
  // here is not worth surfacing: the panel is already open, just in the original window.
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
