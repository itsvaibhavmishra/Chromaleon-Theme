// The contract between the extension host and the panel. Both sides import this file, so a
// message shape cannot drift on one side without the other failing to compile.

/** Sent by the host, handled in the webview. */
export type ToWebview = { type: 'state'; state: PanelState }

/** Sent by the webview, handled in the host. */
export type ToHost = { type: 'ready' } | { type: 'openSettings' } | { type: 'pickTheme' }

export type RoleGroup = 'Surfaces' | 'Foregrounds' | 'Accent' | 'Hue ramp' | 'Fixed'

/** What a role has to clear, and what it is measured against. */
export interface Floor {
  on: 'none' | 'bg' | 'accent'
  min?: number
}

// The catalogue is sent once and is the same for every theme: which roles exist and what
// each one paints does not change between variants, only the values do.
export interface RoleMeta {
  id: string
  label: string
  group: RoleGroup
  /** Workbench keys it paints. */
  keys: string[]
  /** TextMate and semantic scopes it paints. */
  scopes: string[]
  floor: Floor
}

/** A concept people search for that is not itself a role, and the role that paints it. */
export interface Concept {
  term: string
  role: string
  reads: string
}

export interface ThemeOption {
  label: string
  /** Flagged here rather than parsed out of the label in the panel. */
  highContrast: boolean
}

export interface PanelState {
  roles: RoleMeta[]
  concepts: Concept[]
  themes: ThemeOption[]
  /** Every shipped palette, so switching what is being edited needs no round trip. */
  palettes: Record<string, Record<string, string>>
  /** The theme VS Code itself is running, or null when it is not one of ours. */
  active: string | null
  /** The user's accent setting, which replaces the accent role on whichever theme is shown. */
  accentOverride: string | null
}
