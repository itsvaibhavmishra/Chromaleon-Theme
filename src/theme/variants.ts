import { DEFAULT_ACCENT } from '../core/accents'
import { atLeast, bestOn, darken, hsl, lighten, mix, toHsl } from '../core/color'
import type { Palette } from '../core/palette'

// Variants differ by background, not accent, so switching one changes the room while the
// accent stays put. The value lives in core/accents.ts next to the named accents.
export { DEFAULT_ACCENT }

// Foreground lightness, held constant across every variant. Each variant picks its own
// foreground hue and saturation to sit with its background, but the lightness never moves,
// so body text weighs the same in all ten.
const FG_LIGHTNESS = 85
/** Light variants invert it: dark text, same distance from its background. */
const FG_LIGHTNESS_LIGHT = 22

// Syntax ramp. High saturation at high lightness is what makes syntax read as colour
// rather than tinted grey on a dark background. Shared across variants, so a keyword is the
// same hue everywhere: switching variant changes the room, not the language.
const SYNTAX = {
  red: hsl(352, 78, 71),
  orange: hsl(18, 86, 68),
  yellow: hsl(43, 92, 69),
  green: hsl(90, 62, 70),
  cyan: hsl(192, 88, 74),
  blue: hsl(226, 90, 73),
  purple: hsl(272, 64, 73),
  pink: hsl(344, 88, 78),
  /** Muted earth tone for deeply nested structural keys. */
  brown: hsl(27, 38, 58),
}

// The same hues taken dark and dense. A ramp tuned to glow on a dark field washes out on a
// pale one, so light variants get their own rather than a dimmed copy of the dark ramp.
const SYNTAX_LIGHT = {
  red: hsl(352, 62, 44),
  orange: hsl(18, 68, 40),
  yellow: hsl(40, 72, 33),
  green: hsl(96, 52, 31),
  cyan: hsl(192, 72, 32),
  blue: hsl(226, 68, 45),
  purple: hsl(272, 52, 47),
  pink: hsl(340, 62, 46),
  brown: hsl(27, 46, 36),
}

/** Gold on dark; a deeper amber on light, where the pale gold vanishes. */
const CURSOR = hsl(47, 100, 53)
const CURSOR_LIGHT = hsl(38, 92, 40)

// Where each neutral sits, as a fraction of the background -> foreground axis. Proportions
// rather than colours is what keeps the ten feeling like one family.
const RAMP = {
  /** Comments and other deliberately receding text. */
  subtle: 0.27,
  /** Inactive tabs, breadcrumbs, sidebar, status bar. */
  muted: 0.38,
  /** Line numbers. */
  lineNumber: 0.19,
  /** Secondary text used by some markup scopes. */
  alt: 0.8,
  /** Scrollbar slider. Above muted so the control is findable. */
  slider: 0.55,
}

/** Where each surface sits, as a fraction of the way from bg to white. */
const SURFACE = {
  bgAlt: 0.03,
  surface: 0.045,
  surfaceAlt: 0.11,
  guide: 0.15,
  whitespace: 0.13,
}

export interface VariantSpec {
  /** Display name, used for the theme label and output filename. */
  name: string
  /** Background as `[hue, saturation, lightness]`. This is the variant. */
  bg: [number, number, number]
  /** Foreground hue and saturation; lightness is fixed at FG_LIGHTNESS. */
  fg: [number, number]
  /** Accent override. Defaults to DEFAULT_ACCENT. */
  accent?: string
  /** Override the shared amber cursor. */
  cursor?: string
  /** Override individual syntax hues. */
  syntax?: Partial<typeof SYNTAX>
  // Pulls the whole syntax ramp back, as proportions of saturation and lightness. The
  // shared ramp suits a mid-dark, low-saturation background; near-black ones make it glare
  // and strongly hued ones make it fight the room. Dimming preserves the intended
  // relationship where the shared values would not.
  syntaxDim?: { sat?: number; light?: number }
  // Per-variant overrides for the neutral ramp. The shared constants are the right default,
  // but a background's hue and lightness change how strongly a step reads, so any variant
  // can move its own without disturbing the other nine.
  ramp?: Partial<typeof RAMP>
  /** Per-variant overrides for the surface steps, as fractions toward the far end. */
  surface?: Partial<typeof SURFACE>
  // A light variant. Every derivation that assumes "lift toward white" flips to "settle
  // toward black": surfaces, the bright foreground and the selection tint all run the other
  // way, and the syntax ramp swaps for one built for a pale field.
  light?: boolean
}

/** Scales a ramp's saturation and lightness back by the given proportions. */
function dimRamp(
  ramp: typeof SYNTAX,
  { sat = 0, light = 0 }: { sat?: number; light?: number },
): typeof SYNTAX {
  const pull = (color: string) => {
    const [h, s, l] = toHsl(color)
    return hsl(h, s * (1 - sat), l * (1 - light))
  }
  return Object.fromEntries(
    Object.entries(ramp).map(([key, value]) => [key, pull(value)]),
  ) as typeof SYNTAX
}

// Expands a spec into a full Palette. The neutral ramp is derived rather than authored:
// surfaces are `bg` lifted by a fixed amount, text tones are fixed steps along `bg -> fg`.
// Contrast relationships stay identical across variants, so a new variant needs a
// background and a foreground hue and nothing else.
export function defineVariant(spec: VariantSpec): Palette & { name: string; light: boolean } {
  const light = spec.light ?? false
  const bg = hsl(...spec.bg)
  const fg = hsl(spec.fg[0], spec.fg[1], light ? FG_LIGHTNESS_LIGHT : FG_LIGHTNESS)
  const accent = spec.accent ?? DEFAULT_ACCENT
  const ramp = { ...RAMP, ...spec.ramp }
  const surface = { ...SURFACE, ...spec.surface }

  // Surfaces lift away from the background: toward white on a dark variant, toward black on
  // a light one. Same fractions either way, so the family keeps one set of proportions.
  const lift = (amount: number) => (light ? darken(bg, amount) : lighten(bg, amount))
  const base = light ? SYNTAX_LIGHT : SYNTAX

  return {
    name: spec.name,
    light,
    bg,
    // Both equal the background here; high contrast is what pulls them apart.
    chrome: bg,
    border: bg,

    bgAlt: lift(surface.bgAlt),
    surface: lift(surface.surface),
    surfaceAlt: lift(surface.surfaceAlt),
    guide: lift(surface.guide),
    whitespace: lift(surface.whitespace),

    // Text tones are steps along the background -> foreground axis, which already points the
    // right way on both polarities.
    lineNumber: mix(bg, fg, ramp.lineNumber),
    fgSubtle: mix(bg, fg, ramp.subtle),
    fgMuted: mix(bg, fg, ramp.muted),
    // Starts from the muted tone and only lifts if that fails AA, so it stays on the ramp
    // wherever the ramp is already legible.
    fgUi: atLeast(bg, fg, 4.5, ramp.muted),
    // Cooled toward cyan rather than sitting on the bg -> fg axis: the scopes using it read
    // better as their own tone than as a dimmer version of body text.
    fgAlt: mix(mix(bg, fg, ramp.alt), base.cyan, 0.3),
    fg,
    // Past the foreground, further from the background in whichever direction that is.
    fgBright: light ? darken(fg, 0.4) : lighten(fg, 0.5),
    fgSlider: mix(bg, fg, ramp.slider),

    accent,
    // Selection tints the room's own hue, not the accent: a selection is a lift of the
    // background it sits in, so it tracks the variant.
    accentDim: hsl(
      spec.bg[0],
      spec.bg[1] + 9,
      light ? Math.max(spec.bg[2] - 12, 0) : spec.bg[2] + 21,
    ),
    onAccent: bestOn(accent),
    cursor: spec.cursor ?? (light ? CURSOR_LIGHT : CURSOR),

    // Same direction as lift(), but an absolute rather than a mix, because the keys using it
    // supply their own alpha and composite it themselves.
    hairline: light ? '#000000' : '#ffffff',

    white: '#ffffff',
    black: '#000000',

    ...(spec.syntaxDim ? dimRamp(base, spec.syntaxDim) : base),
    ...spec.syntax,
  }
}

// The variant set; each entry also gets a generated high contrast pair. Named after
// historical pigments and minerals, and ordered darkest background first so the theme
// picker reads as a gradient rather than an arbitrary list.
//
// Backgrounds are deliberately low-saturation: the hue names the mood, the lightness sets
// how much room the editor has, and the syntax ramp does the talking. Foreground hues lean
// toward each background's own hue so text settles into the room instead of sitting on it.
export const VARIANTS = [
  // Near black. The only background dark enough to need the ramp pulled back.
  defineVariant({
    name: 'Obsidian',
    bg: [220, 6, 7],
    fg: [220, 6],
    syntaxDim: { sat: 0.42, light: 0.15 },
  }),

  // Purple.
  defineVariant({ name: 'Tyrian', bg: [279, 18, 8], fg: [282, 23] }),

  // Warm neutral.
  defineVariant({ name: 'Ochre', bg: [41, 10, 8], fg: [35, 20] }),

  // Green.
  defineVariant({
    name: 'Malachite',
    bg: [164, 20, 9],
    fg: [148, 32],
    // Selective, not a blanket dim: green, yellow and red already sit with a green room,
    // so only the hues that fight it are pulled back. Dimming the whole ramp muddies the
    // ones that were already working.
    syntax: {
      cyan: hsl(192, 55, 66),
      blue: hsl(220, 56, 65),
      purple: hsl(268, 40, 67),
      orange: hsl(20, 52, 61),
      pink: hsl(348, 45, 70),
    },
  }),

  // Deep blue-violet.
  defineVariant({ name: 'Woad', bg: [228, 26, 9], fg: [232, 26] }),

  // Warm red-neutral.
  defineVariant({ name: 'Bole', bg: [6, 10, 12], fg: [17, 27] }),

  // Cool grey.
  defineVariant({ name: 'Basalt', bg: [206, 12, 12], fg: [202, 28] }),

  // Pure neutral.
  defineVariant({ name: 'Davy', bg: [220, 3, 14], fg: [220, 6] }),

  // Blue-grey.
  defineVariant({ name: 'Payne', bg: [199, 20, 15], fg: [182, 11] }),

  // Lifted blue-violet, the brightest of the dark set.
  defineVariant({ name: 'Smalt', bg: [230, 19, 18], fg: [232, 26] }),

  // The one light variant. Warm off-white rather than pure white, which glares.
  //
  // The ramp fractions are its own: the same step along bg -> fg buys less contrast on a
  // pale field than a dark one, so sharing the dark set's numbers would leave every neutral
  // visibly fainter. These are solved to land on the same contrast ratios the dark variants
  // hit, which is what keeps all eleven feeling like one family.
  defineVariant({
    name: 'Chalk',
    bg: [40, 22, 96],
    fg: [215, 18],
    light: true,
    ramp: { subtle: 0.36, muted: 0.5, lineNumber: 0.25, slider: 0.69 },
    surface: { guide: 0.19, whitespace: 0.16 },
  }),
]
