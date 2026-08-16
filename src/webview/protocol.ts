// The contract between the extension host and the panel. Both sides import this file, so a
// message shape cannot drift on one side without the other failing to compile.

import type { PortablePreset } from '@/utils/preset-file'

/** Sent by the host, handled in the webview. */
export type ToWebview =
  | { type: 'state'; state: PanelState }
  // The panel cannot know the id of a preset the host just forked for it, so it is told.
  | { type: 'saved'; preset: string }

/** Sent by the webview, handled in the host. */
export type ToHost =
  | { type: 'ready' }
  | { type: 'openSettings' }
  | { type: 'pickTheme' }
  // The panel holds edits as a draft and sends the whole set on save. `preset: null` means it
  // is showing a shipped theme, so the host forks it first and the 22 are never written to.
  | { type: 'save'; base: string; preset: string | null; overrides: Record<string, string> }
  // Explicit, and the only thing that changes the theme VS Code is running.
  | { type: 'applyTheme'; base: string; preset: string | null }
  // A name is a label, not appearance, so it lands immediately rather than through the draft.
  | { type: 'renamePreset'; preset: string; name: string }
  | { type: 'deletePreset'; preset: string }
  // A setting is not a theme edit, so it lands immediately rather than behind Save, which is
  // what VS Code's own settings editor does and what people expect of a checkbox.
  | { type: 'setSetting'; key: string; value: string | boolean }
  | { type: 'importPresets'; presets: PortablePreset[] }
  | { type: 'exportPresets'; presets: PortablePreset[] }
  // Sent when a drag ends, because the webview's own store dies with the panel.
  | { type: 'setCanvasHeight'; height: number }

// Which workbench VS Code draws: `modern` is the rounded one, `classic` the flush one.
export type Layout = 'classic' | 'modern'

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

// Read back off the manifest rather than restated here, so a setting cannot be contributed
// and then be missing from the panel. The same reason the reset command derives its key list.
export interface SettingMeta {
  /** Short key, without the `chromaleon.` prefix. */
  key: string
  kind: 'boolean' | 'enum' | 'text'
  /** The manifest description, still carrying its inline markdown. */
  description: string
  options?: SettingOption[]
}

export interface SettingOption {
  value: string
  /** The manifest's enumDescriptions entry, when it has one. */
  detail?: string
}

export interface PanelState {
  roles: RoleMeta[]
  concepts: Concept[]
  themes: ThemeOption[]
  /** Every shipped palette, so switching what is being edited needs no round trip. */
  palettes: Record<string, Record<string, string>>
  /** The theme VS Code itself is running, or null when it is not one of ours. */
  active: string | null
  /** The workbench VS Code is drawing. The miniature follows it until asked to show the other. */
  layout: Layout
  /** How tall the miniature was left last time, so a reopened panel is where it was left. */
  canvasHeight: number
  /** The user's accent setting, which replaces the accent role on whichever theme is shown. */
  accentOverride: string | null
  /** Everything the user has made. Shipped themes are read-only origins. */
  presets: Record<string, PresetView>
  /** Which preset is switched on for each shipped theme. */
  activePresets: Record<string, string>
  /** Every contributed setting the panel can render a control for, in manifest order. */
  settings: SettingMeta[]
  /** What each of those is set to right now, defaults included. */
  settingValues: Record<string, string | boolean>
  // The user's own file icons, inlined and keyed by the name the canvas draws. Empty for a
  // font-based icon theme, where the canvas falls back to its own shapes.
  treeIcons: Record<string, string>
}

export interface PresetView {
  name: string
  base: string
  overrides: Record<string, string>
  created?: string
  updated?: string
}
