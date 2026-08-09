import { copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { basename, dirname, join, resolve } from 'node:path'

import { folderSetId, syncFolderSet } from '@/icons/folders'

const require = createRequire(import.meta.url)

// Icons come from Material Icon Theme (MIT, (c) Material Extensions), consumed as an npm
// dependency rather than vendored so version and licence stay tracked: see
// THIRD-PARTY-NOTICES.md. Only the base tables are used; every Chromaleon variant is dark, so
// Material's `light` and `highContrast` overrides don't apply.
const MATERIAL_MANIFEST = 'material-icon-theme/dist/material-icons.json'

export interface IconBuildResult {
  id: string
  label: string
  file: string
  fileIcons: number
  folderIcons: number
  associations: number
  source: { name: string; version: string; license: string }
}

interface MaterialManifest {
  iconDefinitions: Record<string, { iconPath: string }>
  fileExtensions: Record<string, string>
  fileNames: Record<string, string>
  languageIds: Record<string, string>
  folderNames: Record<string, string>
  folderNamesExpanded: Record<string, string>
  file: string
  folder: string
  folderExpanded: string
  rootFolder: string
  rootFolderExpanded: string
}

/** A definition is a folder if its name is the folder default or folder-prefixed. */
function isFolder(name: string): boolean {
  return name === 'folder' || name.startsWith('folder-')
}

export async function buildIcons(
  root: string,
  brand: string,
  style: { accent: string; accentFolders: boolean },
): Promise<IconBuildResult> {
  const manifestPath = require.resolve(MATERIAL_MANIFEST)
  const materialRoot = resolve(dirname(manifestPath), '..')
  const manifest: MaterialManifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  const pkg = JSON.parse(await readFile(join(materialRoot, 'package.json'), 'utf8'))

  const iconsDir = join(root, 'icons')
  await rm(iconsDir, { recursive: true, force: true })
  const filesDir = join(iconsDir, 'files')
  // Originals are shipped so the extension host can re-derive any accent from
  // them; it must never recolour an already-recoloured icon.
  const sourceDir = join(iconsDir, 'folders', 'source')
  await mkdir(filesDir, { recursive: true })
  await mkdir(sourceDir, { recursive: true })

  // The folder set is addressed by the state that produced it, so every iconPath changes
  // when the accent does. That is what makes VS Code repaint rather than reuse its cache.
  const setId = folderSetId({ accent: style.accent, enabled: style.accentFolders })

  const iconDefinitions: Record<string, { iconPath: string }> = {}
  let fileIcons = 0
  let folderIcons = 0

  for (const [name, definition] of Object.entries(manifest.iconDefinitions)) {
    const from = resolve(dirname(manifestPath), definition.iconPath)
    const svg = basename(from)

    if (isFolder(name)) {
      await copyFile(from, join(sourceDir, svg))
      iconDefinitions[name] = { iconPath: `../icons/folders/${setId}/${svg}` }
      folderIcons++
    } else {
      await copyFile(from, join(filesDir, svg))
      iconDefinitions[name] = { iconPath: `../icons/files/${svg}` }
      fileIcons++
    }
  }

  await syncFolderSet(iconsDir, { accent: style.accent, enabled: style.accentFolders })

  const theme = {
    hidesExplorerArrows: false,
    iconDefinitions,
    file: manifest.file,
    folder: manifest.folder,
    folderExpanded: manifest.folderExpanded,
    rootFolder: manifest.rootFolder,
    rootFolderExpanded: manifest.rootFolderExpanded,
    fileExtensions: manifest.fileExtensions,
    fileNames: manifest.fileNames,
    languageIds: manifest.languageIds,
    folderNames: manifest.folderNames,
    folderNamesExpanded: manifest.folderNamesExpanded,
  }

  const file = `${brand}-Icons.json`
  await writeFile(join(root, 'themes', file), `${JSON.stringify(theme, null, 2)}\n`)

  const associations =
    Object.keys(manifest.fileExtensions).length +
    Object.keys(manifest.fileNames).length +
    Object.keys(manifest.languageIds).length +
    Object.keys(manifest.folderNames).length +
    Object.keys(manifest.folderNamesExpanded).length

  return {
    id: `${brand.toLowerCase()}-icons`,
    label: `${brand} Icons`,
    file,
    fileIcons,
    folderIcons,
    associations,
    source: { name: pkg.name, version: pkg.version, license: pkg.license },
  }
}

/** Reads back what the build wrote, for the manifest check. */
export async function countFolderSources(root: string): Promise<number> {
  const dir = join(root, 'icons', 'folders', 'source')
  return (await readdir(dir)).filter((name) => name.endsWith('.svg')).length
}
