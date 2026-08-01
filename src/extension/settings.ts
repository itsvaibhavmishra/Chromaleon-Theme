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
  }
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
