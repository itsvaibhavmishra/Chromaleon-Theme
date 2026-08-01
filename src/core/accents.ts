// User-selectable accents. Names are the setting's enum values, so renaming one is a
// breaking change for anybody who already picked it.

// Lives here next to the named accents so the value baked into the themes and the one
// users can pick cannot drift apart: when they disagree, picking "the default" silently
// writes overrides. Mid-tone, so onAccent resolves to white rather than black.
export const DEFAULT_ACCENT = '#2578b3'

export const ACCENTS: Record<string, string> = {
  Chromaleon: DEFAULT_ACCENT,
  White: '#ffffff',
  Tomato: '#ff5c57',
  Orange: '#f2955c',
  Yellow: '#e8c168',
  'Acid Lime': '#c6f24e',
  Lime: '#a8d96f',
  Teal: '#4fd5b5',
  'Bright Teal': '#2ce8c8',
  Cyan: '#6fcfe8',
  Blue: '#7099f0',
  Indigo: '#8b7cf0',
  Purple: '#b583db',
  Pink: '#ee8aa0',
}

export const ACCENT_NAMES = Object.keys(ACCENTS)

// The default. Means "leave the variant's own accent alone", so a fresh install writes
// nothing to the user's settings.
export const THEME_DEFAULT = 'Theme Default'

/** `#rrggbb`, the format the customAccent setting accepts. */
export const HEX6 = /^#[0-9a-f]{6}$/i

// Resolves the effective accent, or undefined to keep the variant's own. A valid
// customAccent wins; anything invalid falls through to the named accent, so a typo
// degrades to a working theme rather than a broken one.
export function resolveAccent(named: string, custom: string | undefined): string | undefined {
  if (custom && HEX6.test(custom.trim())) return custom.trim().toLowerCase()
  if (named === THEME_DEFAULT) return undefined
  return ACCENTS[named]
}
