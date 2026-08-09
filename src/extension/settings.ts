import * as vscode from 'vscode'

import { THEME_DEFAULT } from '@/core/accents'
import { RUNTIME } from '@/generated'

export const NS = 'chromaleon'

export type SelectionStyle = 'room' | 'accent'
export type CursorStyle = 'theme' | 'accent'
export type CurrentLine = 'outline' | 'solid' | 'none'
export type TabIndicator = 'bottom' | 'top' | 'none'
export type TabBar = 'flat' | 'contrasted'
export type Borders = 'none' | 'subtle' | 'strong'
export type CustomizerLocation = 'newWindow' | 'beside' | 'active'

export interface Settings {
  accent: string
  customAccent: string
  accentedStatusBar: boolean
  selectionStyle: SelectionStyle
  cursorStyle: CursorStyle
  italics: boolean
  currentLine: CurrentLine
  tabIndicator: TabIndicator
  tabBar: TabBar
  borders: Borders
  shadows: boolean
  accentFolders: boolean
  hideExplorerArrows: boolean
  syncIconTheme: boolean
  customizerLocation: CustomizerLocation
  /** Everything the user has made, keyed by id. */
  presets: Record<string, Preset>
  /** Which preset is switched on for each shipped theme, keyed by that theme's label. */
  activePresets: Record<string, string>
}

// A shipped theme is a read-only origin. Editing one forks it into a preset and the edit
// lands there, so the 22 themes can never drift from what the build produced.
export interface Preset {
  name: string
  /** The shipped theme it was taken from. Overrides only apply while that theme is active. */
  base: string
  overrides: Record<string, string>
}

// Defaults are duplicated in package.json's configuration block; both are asserted equal by
// the settings test, so one cannot quietly drift from the other.
export function readSettings(): Settings {
  const c = vscode.workspace.getConfiguration(NS)
  return {
    accent: c.get('accent', THEME_DEFAULT),
    customAccent: c.get('customAccent', ''),
    accentedStatusBar: c.get('accentedStatusBar', false),
    selectionStyle: c.get<SelectionStyle>('selectionStyle', 'room'),
    cursorStyle: c.get<CursorStyle>('cursorStyle', 'theme'),
    italics: c.get('italics', true),
    currentLine: c.get<CurrentLine>('currentLine', 'outline'),
    tabIndicator: c.get<TabIndicator>('tabIndicator', 'bottom'),
    tabBar: c.get<TabBar>('tabBar', 'flat'),
    borders: c.get<Borders>('borders', 'none'),
    shadows: c.get('shadows', true),
    accentFolders: c.get('accentFolders', false),
    hideExplorerArrows: c.get('hideExplorerArrows', false),
    syncIconTheme: c.get('syncIconTheme', true),
    customizerLocation: c.get<CustomizerLocation>('customizerLocation', 'newWindow'),
    presets: c.get<Settings['presets']>('presets', {}),
    activePresets: c.get<Settings['activePresets']>('activePresets', {}),
  }
}

// Only what the user set globally: `get()` merges scopes, and writing that back folds a
// workspace's customisations into their own settings. Bug 1, in a new place.
function globalValue<K extends keyof Settings>(key: K): Settings[K] | undefined {
  return vscode.workspace.getConfiguration(NS).inspect<Settings[K]>(key)?.globalValue
}

async function write<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
  const empty = typeof value === 'object' && value !== null && Object.keys(value).length === 0
  await vscode.workspace
    .getConfiguration(NS)
    .update(key, empty ? undefined : value, vscode.ConfigurationTarget.Global)
}

// Numbered from the highest ever used rather than the count, so deleting Preset 2 does not
// make the next one Preset 2 again and quietly reuse a name someone recognises.
function nextId(presets: Record<string, Preset>): { id: string; name: string } {
  const used = Object.keys(presets).map((id) => Number(id.replace('p', '')) || 0)
  const n = Math.max(0, ...used) + 1
  return { id: `p${n}`, name: `Preset ${n}` }
}

// Saving a draft against a shipped theme forks it first, so the 22 are never written to.
// Returns the preset the draft landed in, new or existing.
export async function savePreset(
  base: string,
  id: string | null,
  overrides: Record<string, string>,
): Promise<string> {
  const presets = { ...(globalValue('presets') ?? {}) }
  const target = id ?? nextId(presets).id
  const existing = presets[target]
  const name = existing?.name ?? nextId(presets).name

  presets[target] = { name, base: existing?.base ?? base, overrides }
  await write('presets', presets)
  return target
}

// Switches VS Code to a theme, and to one of your presets on it. The only path that changes
// the running theme: everything else in the panel is a preview.
export async function applyTheme(base: string, id: string | null): Promise<void> {
  const active = { ...(globalValue('activePresets') ?? {}) }
  if (id) active[base] = id
  else delete active[base]
  await write('activePresets', active)

  await vscode.workspace
    .getConfiguration()
    .update('workbench.colorTheme', base, vscode.ConfigurationTarget.Global)
}

// Trimmed, and an empty name is refused rather than written: a preset with no name is
// unpickable from a list that shows nothing else about it.
export async function renamePreset(id: string, name: string): Promise<void> {
  const presets = { ...(globalValue('presets') ?? {}) }
  if (!presets[id] || !name.trim()) return
  presets[id] = { ...presets[id], name: name.trim() }
  await write('presets', presets)
}

/** Removes a preset, and switches it off wherever it was in use. */
export async function deletePreset(id: string): Promise<void> {
  const presets = { ...(globalValue('presets') ?? {}) }
  delete presets[id]
  await write('presets', presets)

  const active = { ...(globalValue('activePresets') ?? {}) }
  for (const [base, current] of Object.entries(active)) {
    if (current === id) delete active[base]
  }
  await write('activePresets', active)
}

export interface Variant {
  label: string
  bg: string
  accent: string
  /** Which way "away from the background" points when deriving overrides. */
  light: boolean
}

/** The active colour theme, if it is one of ours. */
export function activeVariant(): Variant | undefined {
  const label = vscode.workspace.getConfiguration().get<string>('workbench.colorTheme') ?? ''
  const meta = (RUNTIME.variants as Record<string, { bg: string; accent: string; light: boolean }>)[
    label
  ]
  return meta ? { label, ...meta } : undefined
}

// Only what the user set globally: writing back a merged value would copy a workspace's
// customisations permanently into their own settings.
export function readGlobalObject(section: string): Record<string, unknown> {
  const inspected = vscode.workspace.getConfiguration().inspect<Record<string, unknown>>(section)
  return { ...(inspected?.globalValue ?? {}) }
}

// Writes an object setting globally, removing the property entirely when it would otherwise be
// left as an empty object.
export async function writeGlobalObject(
  section: string,
  value: Record<string, unknown>,
): Promise<void> {
  await vscode.workspace
    .getConfiguration()
    .update(
      section,
      Object.keys(value).length > 0 ? value : undefined,
      vscode.ConfigurationTarget.Global,
    )
}
