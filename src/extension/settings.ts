import * as vscode from 'vscode'

import { THEME_DEFAULT } from '../core/accents'
import { RUNTIME } from '../generated'

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
  /** Per theme, per role: `{ "Chromaleon Obsidian": { "fg": "#ffffff" } }`. */
  roleOverrides: Record<string, Record<string, string>>
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
    roleOverrides: c.get<Settings['roleOverrides']>('roleOverrides', {}),
  }
}

// Reads only what the user set globally, then writes the whole object back. `get()` returns
// the value merged across scopes, and writing that to Global would fold a workspace's
// customisations permanently into the user's own settings. Bug 1, in a new place.
export async function updateRoleOverride(
  theme: string,
  role: string,
  value: string | undefined,
): Promise<void> {
  const config = vscode.workspace.getConfiguration(NS)
  const all = { ...(config.inspect<Settings['roleOverrides']>('roleOverrides')?.globalValue ?? {}) }
  const forTheme = { ...(all[theme] ?? {}) }

  if (value) forTheme[role] = value
  else delete forTheme[role]

  if (Object.keys(forTheme).length > 0) all[theme] = forTheme
  else delete all[theme]

  await config.update(
    'roleOverrides',
    Object.keys(all).length > 0 ? all : undefined,
    vscode.ConfigurationTarget.Global,
  )
}

/** Drops every override on one theme, leaving the others untouched. */
export async function clearRoleOverrides(theme: string): Promise<void> {
  const config = vscode.workspace.getConfiguration(NS)
  const all = { ...(config.inspect<Settings['roleOverrides']>('roleOverrides')?.globalValue ?? {}) }
  delete all[theme]
  await config.update(
    'roleOverrides',
    Object.keys(all).length > 0 ? all : undefined,
    vscode.ConfigurationTarget.Global,
  )
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

// Reads only what the user actually set at the global level. `get()` returns the value merged
// across default/user/workspace, and writing that back to Global would copy a workspace's
// customisations permanently into the user's own settings.
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
