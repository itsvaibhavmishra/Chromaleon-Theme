import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import * as vscode from 'vscode'

import { resolveAccent } from '@/core/accents'
import { RUNTIME } from '@/generated'
import { folderSetId, syncFolderSet } from '@/icons/folders'
import { activeVariant, type Settings } from '@/extension/settings'

const FOLDER_PATH = /^\.\.\/icons\/folders\/[^/]+\//

// Writes the folder set for the current accent, then repoints every folder iconPath at it.
// Rewriting SVGs in place is not enough: the paths would be unchanged, so VS Code keeps
// serving cached images and the setting looks like it does nothing.
export async function applyIcons(
  context: vscode.ExtensionContext,
  settings: Settings,
): Promise<void> {
  const variant = activeVariant()
  const accent =
    resolveAccent(settings.accent, settings.customAccent) ??
    variant?.accent ??
    RUNTIME.defaultAccent
  const iconsDir = join(context.extensionPath, 'icons')
  const themePath = join(context.extensionPath, 'themes', RUNTIME.iconThemeFile)
  const style = { accent, enabled: settings.accentFolders }

  try {
    const setId = await syncFolderSet(iconsDir, style)

    const theme = JSON.parse(await readFile(themePath, 'utf8'))
    const hide = settings.hideExplorerArrows
    let changed = theme.hidesExplorerArrows !== hide
    theme.hidesExplorerArrows = hide

    const definitions = theme.iconDefinitions as Record<string, { iconPath: string }>
    for (const definition of Object.values(definitions)) {
      if (!FOLDER_PATH.test(definition.iconPath)) continue
      const next = definition.iconPath.replace(FOLDER_PATH, `../icons/folders/${setId}/`)
      if (next !== definition.iconPath) {
        definition.iconPath = next
        changed = true
      }
    }

    // Only write when something actually moved, so a no-op settings change does not churn
    // the watcher that triggers the reload.
    if (changed) await writeFile(themePath, `${JSON.stringify(theme, null, 2)}\n`)
  } catch (error) {
    // A read-only install is not fatal: colours still apply.
    console.warn(`[${RUNTIME.brand}] could not update icon theme:`, error)
  }
}

/** Points the icon theme at ours when one of our colour themes becomes active. */
export async function syncIconTheme(settings: Settings): Promise<void> {
  if (!settings.syncIconTheme || !activeVariant()) return
  const config = vscode.workspace.getConfiguration()
  if (config.get<string>('workbench.iconTheme') === RUNTIME.iconThemeId) return
  await config.update('workbench.iconTheme', RUNTIME.iconThemeId, vscode.ConfigurationTarget.Global)
}

export { folderSetId }
