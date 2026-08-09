import { contrast, hsl, toHsl } from '@/core/color'

// Moves a colour just far enough to clear its floor, in lightness only. Blending toward white
// or black would wash the hue out, and the whole point of a role is the colour it is.
export function raiseToFloor(color: string, backdrop: string, floor: number): string {
  if (contrast(color, backdrop) >= floor) return color

  const [hue, saturation, lightness] = toHsl(color)
  const backdropLightness = toHsl(backdrop)[2]
  // Away from the background, so a dark theme brightens and a light one deepens.
  const away = lightness >= backdropLightness ? 1 : -1

  const search = (direction: number): string | undefined => {
    for (let step = 1; step <= 100; step++) {
      const next = Math.max(0, Math.min(100, lightness + direction * step))
      const candidate = hsl(hue, saturation, next)
      if (contrast(candidate, backdrop) >= floor) return candidate
      if (next === 0 || next === 100) return undefined
    }
    return undefined
  }

  // One direction can run out of room before it clears, so the other is still worth trying.
  return search(away) ?? search(-away) ?? color
}
