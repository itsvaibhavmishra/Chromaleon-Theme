import { atLeast, darken, lighten } from '@/core/color'
import type { Palette } from '@/core/palette'

// High contrast is a transform, not a second palette. The editor background never moves:
// raising contrast means separating the regions AROUND the code, and dimming the editor
// alongside its chrome would drop every foreground to a lower ratio instead.
//
// It separates REGIONS, never in-editor texture. `guide` is deliberately not touched:
// indent guides are drawn at every indentation level, so brightening them stripes the whole
// editor rather than clarifying where one area ends and the next begins.
export function highContrast(palette: Palette, light = false): Palette {
  // Chrome settles away from the editor in both polarities, but a near-white background has
  // nowhere lighter to go, so the light step is small and downward rather than large.
  const chrome = darken(palette.bg, light ? 0.07 : 0.35)
  // Borders must contrast with the chrome they separate, which is the opposite direction.
  const border = light ? darken(palette.bg, 0.22) : lighten(palette.bg, 0.11)
  // Muted text moves further from the background, widening the gap to the active tone.
  const fgMuted = light ? lighten(palette.fgMuted, 0.1) : darken(palette.fgMuted, 0.1)

  return {
    ...palette,
    // bg is deliberately untouched.
    chrome,
    border,
    surface: darken(palette.surface, light ? 0.05 : 0.12),
    fgMuted,
    // Recomputed against the chrome, not the editor background: the status bar sits on
    // chrome, and in high contrast those are no longer the same colour.
    fgUi: atLeast(chrome, palette.fg, 4.5),
  }
}
