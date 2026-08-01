import { randomBytes } from 'node:crypto'

import * as vscode from 'vscode'

import { resolveAccent } from '../core/accents'
import { RUNTIME } from '../generated'
import type { PanelState, ToHost, ToWebview } from '../webview/protocol'
import { activeVariant, NS, readSettings } from './settings'

const VIEW_TYPE = 'chromaleon.customizer'

// One panel at a time. A second copy would fight the first over the same settings.
let current: vscode.WebviewPanel | undefined

function panelState(context: vscode.ExtensionContext): PanelState {
  const settings = readSettings()
  const variant = activeVariant()
  return {
    theme: variant?.label ?? null,
    light: variant?.light ?? false,
    accent:
      resolveAccent(settings.accent, settings.customAccent) ??
      variant?.accent ??
      RUNTIME.defaultAccent,
    version: (context.extension.packageJSON as { version: string }).version,
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

  const push = (type: ToWebview['type']) => {
    const message: ToWebview = { type, state: panelState(context) }
    void panel.webview.postMessage(message)
  }

  // Everything here is disposed with the panel, not with the extension, so reopening does
  // not stack a second set of listeners on the first.
  const listeners = [
    panel.webview.onDidReceiveMessage((message: ToHost) => {
      if (message.type === 'ready') push('state')
      else if (message.type === 'openSettings') {
        void vscode.commands.executeCommand('workbench.action.openSettings', `@ext:${NS}`)
      }
    }),
    // The panel paints from --vscode-* variables, so VS Code restyles it on a theme change
    // by itself. These only refresh the values we render as text.
    vscode.window.onDidChangeActiveColorTheme(() => push('themeChanged')),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(NS) || event.affectsConfiguration('workbench.colorTheme')) {
        push('themeChanged')
      }
    }),
  ]

  panel.onDidDispose(() => {
    for (const listener of listeners) listener.dispose()
    if (current === panel) current = undefined
  })
}

/** Opens the customizer, or focuses it when it is already open. */
export function openCustomizer(context: vscode.ExtensionContext): void {
  if (current) {
    current.reveal(current.viewColumn)
    return
  }
  wire(
    // wire() sets the webview options, including for panels the serializer restores.
    vscode.window.createWebviewPanel(VIEW_TYPE, 'Chromaleon', vscode.ViewColumn.Active, {
      // Keeps scroll position and in-progress edits across tab switches. The panel is
      // small, so the memory this costs is not a concern.
      retainContextWhenHidden: true,
    }),
    context,
  )
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
