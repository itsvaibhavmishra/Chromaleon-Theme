import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { recolorFolder } from '@/icons/recolor'

// Folder icons live in a directory named for the state that produced them, and the icon
// theme JSON points at that directory by name.
//
// Rewriting the SVGs in a fixed directory is not enough: the iconPath never changes, so
// VS Code keeps serving the images it already cached and the setting appears to do nothing.
// Changing the directory changes every iconPath, which is what actually forces a repaint.
export const FOLDER_SOURCE = 'source'

export interface FolderSync {
  /** Resolved accent, `#rrggbb`. */
  accent: string
  /** False keeps Material's own per-folder colours. */
  enabled: boolean
}

// With tinting off the icons are Material's originals, so the paths point straight at the
// source rather than a byte-identical copy of it. Copying would ship all 578 files twice.
export function folderSetId(style: FolderSync): string {
  return style.enabled ? `a${style.accent.replace('#', '')}` : FOLDER_SOURCE
}

// Writes the set for `style` if it is not already there, repoints nothing itself, and
// removes the sets that are no longer referenced.
export async function syncFolderSet(iconsDir: string, style: FolderSync): Promise<string> {
  const id = folderSetId(style)
  // Nothing to write when the live set is the source itself.
  if (id === FOLDER_SOURCE) {
    await pruneStaleSets(join(iconsDir, 'folders'), id)
    return id
  }
  const root = join(iconsDir, 'folders')
  const sourceDir = join(root, FOLDER_SOURCE)
  const targetDir = join(root, id)

  const names = (await readdir(sourceDir)).filter((name) => name.endsWith('.svg'))
  const existing = await readdir(targetDir).catch(() => [] as string[])

  if (existing.length !== names.length) {
    await mkdir(targetDir, { recursive: true })
    for (const name of names) {
      const original = await readFile(join(sourceDir, name), 'utf8')
      await writeFile(join(targetDir, name), style.enabled ? recolorFolder(original, style.accent) : original)
    }
  }

  await pruneStaleSets(root, id)
  return id
}

// Only the source and the live set survive, so switching accents repeatedly cannot
// accumulate directories inside the installed extension.
async function pruneStaleSets(root: string, keep: string): Promise<void> {
  for (const entry of await readdir(root)) {
    if (entry !== FOLDER_SOURCE && entry !== keep) {
      await rm(join(root, entry), { recursive: true, force: true })
    }
  }
}
