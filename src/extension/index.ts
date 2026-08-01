import * as vscode from 'vscode'

import { ACCENT_NAMES, THEME_DEFAULT } from '../core/accents'
import { RUNTIME } from '../generated'
import { applyColors, clearColors } from './colors'
import { applyIcons, syncIconTheme } from './icons'
import { applyItalics, clearItalics } from './italics'
import { registerForSync } from './ledger'
import { NS, readSettings } from './settings'

const RESETTABLE = [
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

// Kept so deactivate can clean up the keys it wrote; deactivate receives no context.
let active: vscode.ExtensionContext | undefined

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  active = context
  registerForSync(context)

  const apply = async () => {
    const settings = readSettings()
    await applyColors(context, settings)
    await applyItalics(settings)
    await applyIcons(context, settings)
    await syncIconTheme(settings)
  }

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(async (event) => {
      if (event.affectsConfiguration(NS) || event.affectsConfiguration('workbench.colorTheme')) {
        await apply()
      }
    }),
    vscode.window.onDidChangeActiveColorTheme(() => apply()),

    vscode.commands.registerCommand(`${NS}.openSettings`, () =>
      vscode.commands.executeCommand(
        'workbench.action.openSettings',
        `@ext:${RUNTIME.brand.toLowerCase()}`,
      ),
    ),

    vscode.commands.registerCommand(`${NS}.clearCustomAccent`, async () => {
      await vscode.workspace
        .getConfiguration(NS)
        .update('customAccent', undefined, vscode.ConfigurationTarget.Global)
      vscode.window.showInformationMessage(`${RUNTIME.brand}: custom accent cleared.`)
    }),

    vscode.commands.registerCommand(`${NS}.selectAccent`, async () => {
      const picked = await vscode.window.showQuickPick([THEME_DEFAULT, ...ACCENT_NAMES], {
        title: `${RUNTIME.brand} accent`,
        placeHolder: 'Pick an accent colour',
      })
      if (!picked) return
      const config = vscode.workspace.getConfiguration(NS)
      await config.update('customAccent', undefined, vscode.ConfigurationTarget.Global)
      await config.update('accent', picked, vscode.ConfigurationTarget.Global)
    }),

    vscode.commands.registerCommand(`${NS}.reset`, async () => {
      const config = vscode.workspace.getConfiguration(NS)
      for (const key of RESETTABLE) {
        await config.update(key, undefined, vscode.ConfigurationTarget.Global)
      }
      vscode.window.showInformationMessage(`${RUNTIME.brand}: settings reset to defaults.`)
    }),
  )

  await apply()
}

/** Leaves the user's settings clean when the extension is disabled or uninstalled. */
export async function deactivate(): Promise<void> {
  if (active) await clearColors(active)
  await clearItalics()
  active = undefined
}
