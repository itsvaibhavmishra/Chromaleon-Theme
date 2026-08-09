import { readFileSync } from 'node:fs'
import { dirname, extname, resolve } from 'node:path'

import * as vscode from 'vscode'

import { TREE } from '@/webview/sample'

// The miniature draws the user's own file icons rather than a stand-in set. The webview can
// only reach dist/, so the host resolves each icon and inlines it as a data URI.

interface IconTheme {
  iconDefinitions?: Record<string, { iconPath?: string; fontCharacter?: string }>
  file?: string
  folder?: string
  folderExpanded?: string
  fileExtensions?: Record<string, string>
  fileNames?: Record<string, string>
  folderNames?: Record<string, string>
  folderNamesExpanded?: Record<string, string>
}

// The theme is contributed by some extension, so its id is the only handle we start with.
function locate(id: string): { theme: IconTheme; base: string } | undefined {
  for (const extension of vscode.extensions.all) {
    const contributed: { id?: string; path?: string }[] =
      extension.packageJSON?.contributes?.iconThemes ?? []
    const match = contributed.find((entry) => entry.id === id)
    if (!match?.path) continue
    const file = resolve(extension.extensionPath, match.path)
    try {
      return { theme: JSON.parse(readFileSync(file, 'utf8')) as IconTheme, base: dirname(file) }
    } catch {
      return undefined
    }
  }
  return undefined
}

const MIME: Record<string, string> = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
}

// Font-based themes like Seti define a glyph rather than a file, and there is nothing to
// inline for those. Returning nothing lets the canvas fall back to its own drawn icons.
function inline(theme: IconTheme, base: string, key: string | undefined): string | undefined {
  const definition = key ? theme.iconDefinitions?.[key] : undefined
  if (!definition?.iconPath) return undefined
  const file = resolve(base, definition.iconPath)
  const mime = MIME[extname(file).toLowerCase()]
  if (!mime) return undefined
  try {
    return `data:${mime};base64,${readFileSync(file).toString('base64')}`
  } catch {
    return undefined
  }
}

/** One data URI per entry in the sample tree, keyed by the name the canvas renders. */
export function treeIcons(): Record<string, string> {
  const id = vscode.workspace.getConfiguration().get<string>('workbench.iconTheme')
  const located = id ? locate(id) : undefined
  if (!located) return {}

  const { theme, base } = located
  const icons: Record<string, string> = {}

  for (const entry of TREE) {
    const key =
      entry.kind === 'folder'
        ? ((entry.open ? theme.folderNamesExpanded?.[entry.name] : undefined) ??
          theme.folderNames?.[entry.name] ??
          (entry.open ? theme.folderExpanded : theme.folder))
        : (theme.fileNames?.[entry.name] ??
          theme.fileExtensions?.[extname(entry.name).slice(1)] ??
          theme.file)

    const uri = inline(theme, base, key)
    if (uri) icons[entry.name] = uri
  }
  return icons
}
