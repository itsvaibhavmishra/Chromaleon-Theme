// The contract between the extension host and the panel. Both sides import this file, so a
// message shape cannot drift on one side without the other failing to compile.

/** Sent by the host, handled in the webview. */
export type ToWebview =
  { type: 'state'; state: PanelState } | { type: 'themeChanged'; state: PanelState }

/** Sent by the webview, handled in the host. */
export type ToHost = { type: 'ready' } | { type: 'openSettings' }

export interface PanelState {
  /** Display label of the active theme, or null when it is not one of ours. */
  theme: string | null
  /** Whether that theme is a light variant. */
  light: boolean
  /** Effective accent, `#rrggbb`. */
  accent: string
  /** Extension version, so the panel can show what it is running. */
  version: string
}
