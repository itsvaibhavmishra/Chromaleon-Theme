import { contrast } from '@/core/color'
import type { Concept, PanelState, PresetView, RoleMeta } from '@/webview/protocol'

// Everything the panel derives before it renders anything. Pulled out of the component so it
// can be tested without a DOM: every panel bug so far has been in this arithmetic rather than
// in the markup, and each one reached a screenshot before it reached a test.

export const HEX = /^#[0-9a-fA-F]{6}$/
export const HIGH_CONTRAST = ' High Contrast'

export const shortName = (label: string) => label.replace(/^Chromaleon /, '')

export interface RoleView extends RoleMeta {
  value: string
  ratio?: number
  /** Everything it paints, keys and scopes together. */
  count: number
  /** True when this is the user's colour rather than the one the theme ships. */
  edited: boolean
}

export function same(a: Record<string, string>, b: Record<string, string>): boolean {
  const keys = Object.keys(a)
  return keys.length === Object.keys(b).length && keys.every((k) => a[k] === b[k])
}

export function matches(role: RoleMeta, query: string): boolean {
  const q = query.toLowerCase()
  return role.label.toLowerCase().includes(q) || role.id.toLowerCase().includes(q)
}

// A concept is a way in, not a row. Typing "comment" names the role that paints comments
// rather than implying a Comment role the theme does not have.
export function conceptFor(concepts: Concept[], query: string): Concept | undefined {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return undefined
  return concepts.find((concept) => concept.term.startsWith(q))
}

// What a preset or a shipped theme actually renders at. `palettes` is keyed by shipped label
// only, so looking a preset id up in it directly returns nothing and every swatch goes black.
export function paletteFor(state: PanelState, id: string): Record<string, string> {
  const preset = state.presets[id]
  const shipped = state.palettes[preset ? preset.base : id] ?? {}
  return preset ? { ...shipped, ...preset.overrides } : shipped
}

/** Keeps only what the rest of the panel can safely treat as a colour. */
export function usable(overrides: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(overrides).filter(([, value]) => HEX.test(value)))
}

export function resolve(
  roles: RoleMeta[],
  palette: Record<string, string>,
  accent: string,
  edits: Record<string, string>,
): RoleView[] {
  return roles.map((role) => {
    const edited = edits[role.id]
    const value = edited ?? (role.id === 'accent' ? accent : palette[role.id])
    const count = role.keys.length + role.scopes.length
    const view = { ...role, value, count, edited: edited !== undefined }
    if (role.floor.on === 'none') return view
    const against = role.floor.on === 'accent' ? accent : palette.bg
    return { ...view, ratio: contrast(value, against) }
  })
}

export interface View {
  /** A preset id or a shipped theme label. */
  viewing: string
  preset: PresetView | undefined
  /** The shipped theme underneath, which is the same thing when viewing one directly. */
  base: string
  label: string
  palette: Record<string, string>
  accent: string
  /** The complete override set: the draft when touched, otherwise what is saved. */
  edits: Record<string, string>
  /** What the canvas paints. The only thing compare reaches. */
  canvas: Record<string, string>
  roles: RoleView[]
  unsaved: boolean
  changed: number
  /** The editor is not showing what the panel is: another base, or another preset on it. */
  previewing: boolean
  measured: number
  failing: number
}

export function derive(
  state: PanelState,
  editing: string | null,
  draft: Record<string, string> | null,
  comparing: boolean,
): View {
  const fallback = state.active ?? state.themes[0].label
  const suggested = state.active ? (state.activePresets[state.active] ?? state.active) : fallback
  const viewing =
    editing && (state.presets[editing] || state.palettes[editing]) ? editing : suggested

  const preset = state.presets[viewing] as PresetView | undefined
  const base = preset ? preset.base : viewing
  const palette = state.palettes[base] ?? state.palettes[fallback]
  const accent = state.accentOverride ?? palette.accent

  // presets is hand-editable JSON, so a value in it can be anything. An unparseable colour
  // would throw out of contrast() and take the whole panel down, so it is dropped and the
  // role simply reads as unedited.
  const saved = usable(preset ? preset.overrides : {})
  // Compare must not reach this, or holding it would make Save write an empty set and drop
  // the dirty count to zero, disabling the compare button out from under the hold.
  const edits = draft ? usable(draft) : saved
  const roles = resolve(state.roles, palette, accent, edits)
  const measured = roles.filter((role) => role.floor.min !== undefined)

  return {
    viewing,
    preset,
    base,
    label: preset ? preset.name : shortName(base),
    palette,
    accent,
    edits,
    canvas: { ...palette, accent, ...(comparing ? {} : edits) },
    roles,
    unsaved: draft !== null && !same(draft, saved),
    changed: Object.keys(edits).length,
    previewing:
      base !== state.active || state.activePresets[base] !== (preset ? viewing : undefined),
    measured: measured.length,
    failing: measured.filter((role) => role.ratio! < role.floor.min!).length,
  }
}
