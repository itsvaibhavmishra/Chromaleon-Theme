import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { recolorFolder } from './recolor'

// Folder icons live in a directory named for the state that produced them, and the icon
// theme JSON points at that directory by name.
//
// Rewriting the SVGs in a fixed directory is not enough: the iconPath never changes, so
// VS Code keeps serving the images it already cached and the setting appears to do nothing.
// Changing the directory changes every iconPath, which is what actually forces a repaint.
export interface FolderSync {
  /** Resolved accent, `#rrggbb`. */
  accent: string
  /** False keeps Material's own per-folder colours. */
  enabled: boolean
}

/** Short, stable name for one folder-icon state. */
export function folderSetId(style: FolderSync): string {
  return style.enabled ? `a${style.accent.replace('#', '')}` : 'material'
}

export const FOLDER_SOURCE = 'source'

// Writes the set for `style` if it is not already there, repoints nothing itself, and
// removes the sets that are no longer referenced.
export async function syncFolderSet(iconsDir: string, style: FolderSync): Promise<string> {
  const id = folderSetId(style)
  const root = join(iconsDir, 'folders')
  const sourceDir = join(root, FOLDER_SOURCE)
  const targetDir = join(root, id)

  const names = (await readdir(sourceDir)).filter((f) => f.endsWith('.svg'))
  const existing = await readdir(targetDir).catch(() => [] as string[])

  if (existing.length !== names.length) {
    await mkdir(targetDir, { recursive: true })
    for (const name of names) {
      const original = await readFile(join(sourceDir, name), 'utf8')
      await writeFile(join(targetDir, name), style.enabled ? recolorFolder(original, style.accent) : original)
    }
  }

  // Only the source and the live set are kept, so switching accents repeatedly cannot
  // accumulate hundreds of directories inside the installed extension.
  for (const entry of await readdir(root)) {
    if (entry !== FOLDER_SOURCE && entry !== id) {
      await rm(join(root, entry), { recursive: true, force: true })
    }
  }

  return id
}
