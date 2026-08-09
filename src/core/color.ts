// Colour maths. Pure, dependency-free, shared by the build and the extension host.

const HEX = /^#([0-9a-f]{6})$/i

function parse(color: string): [number, number, number] {
  const match = HEX.exec(color)
  if (!match) throw new Error(`expected #rrggbb, got ${color}`)
  const packed = parseInt(match[1], 16)
  return [(packed >> 16) & 255, (packed >> 8) & 255, packed & 255]
}

function format(rgb: [number, number, number]): string {
  const clamp = (channel: number) => Math.max(0, Math.min(255, Math.round(channel)))
  return `#${rgb.map((channel) => clamp(channel).toString(16).padStart(2, '0')).join('')}`
}

/** Attaches an 8-bit alpha suffix to a `#rrggbb` colour. */
export function withAlpha(color: string, alpha: string): string {
  return `${color}${alpha}`
}

/** Blends `top` over `bottom` at `amount` (0 = bottom, 1 = top). */
export function mix(bottom: string, top: string, amount: number): string {
  const bottomRgb = parse(bottom)
  const topRgb = parse(top)
  return format(
    [0, 1, 2].map(
      (channelIndex) =>
        bottomRgb[channelIndex] + (topRgb[channelIndex] - bottomRgb[channelIndex]) * amount,
    ) as [number, number, number],
  )
}

/** Moves a colour toward black. */
export function darken(color: string, amount: number): string {
  return mix(color, '#000000', amount)
}

/** Moves a colour toward white. */
export function lighten(color: string, amount: number): string {
  return mix(color, '#ffffff', amount)
}

// Palettes are authored in HSL: hue family, saturation and lightness are the qualities
// that make a theme feel like itself, and all three are invisible in hex.
export function hsl(hue: number, saturation: number, lightness: number): string {
  const saturationFraction = saturation / 100
  const lightnessFraction = lightness / 100
  const hueSector = (sectorOffset: number) => (sectorOffset + hue / 30) % 12
  const amplitude = saturationFraction * Math.min(lightnessFraction, 1 - lightnessFraction)
  const channelValue = (sectorOffset: number) =>
    lightnessFraction -
    amplitude *
      Math.max(-1, Math.min(hueSector(sectorOffset) - 3, Math.min(9 - hueSector(sectorOffset), 1)))
  return format([channelValue(0) * 255, channelValue(8) * 255, channelValue(4) * 255] as [
    number,
    number,
    number,
  ])
}

/** Inverse of `hsl`: returns `[hue, saturation, lightness]` in 0-360 / 0-100. */
export function toHsl(color: string): [number, number, number] {
  const [red, green, blue] = parse(color).map((channel) => channel / 255)
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const lightness = (max + min) / 2
  const chroma = max - min
  if (chroma === 0) return [0, 0, lightness * 100]
  const saturation = chroma / (1 - Math.abs(2 * lightness - 1))
  let hue: number
  if (max === red) hue = ((green - blue) / chroma) % 6
  else if (max === green) hue = (blue - red) / chroma + 2
  else hue = (red - green) / chroma + 4
  return [(((hue * 60) % 360) + 360) % 360, saturation * 100, lightness * 100]
}

// Composites `color` over `backdrop`, honouring an `#rrggbbaa` suffix. Measuring the raw hex
// of a translucent surface reports one lighter than the one that actually renders.
export function over(color: string, backdrop: string): string {
  const alpha = color.length === 9 ? parseInt(color.slice(7, 9), 16) / 255 : 1
  if (alpha === 1) return opaque(color)
  const [frontRed, frontGreen, frontBlue] = parse(opaque(color))
  const [backRed, backGreen, backBlue] = parse(opaque(backdrop))
  return format([
    frontRed * alpha + backRed * (1 - alpha),
    frontGreen * alpha + backGreen * (1 - alpha),
    frontBlue * alpha + backBlue * (1 - alpha),
  ])
}

// Drops an `#rrggbbaa` suffix. Alpha is a compositing question, so reach for `over` when the
// surface underneath matters; this is for the cases where it genuinely does not.
export function opaque(color: string): string {
  return color.slice(0, 7)
}

/** Relative luminance, per WCAG 2.x. */
export function luminance(color: string): number {
  const [red, green, blue] = parse(color).map((channel) => {
    const channelFraction = channel / 255
    return channelFraction <= 0.03928
      ? channelFraction / 12.92
      : ((channelFraction + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

/** Contrast ratio between two colours. */
export function contrast(first: string, second: string): number {
  const [lighter, darker] = [luminance(first), luminance(second)].sort(
    (leftLuminance, rightLuminance) => rightLuminance - leftLuminance,
  )
  return (lighter + 0.05) / (darker + 0.05)
}

// Black or white, whichever the colour carries better. Assuming black is wrong for
// mid-tones: #2578b3 gives 4.42:1 on black but 4.76:1 on white, so only one clears AA.
export function bestOn(color: string): string {
  return contrast(color, '#000000') >= contrast(color, '#ffffff') ? '#000000' : '#ffffff'
}

// Walks bg -> fg and returns the first step clearing `ratio`. Pins UI text to a contrast
// floor instead of a fixed lightness, so a palette tuned for mood stays legible.
export function atLeast(bg: string, fg: string, ratio: number, from = 0): string {
  for (let blend = Math.max(0, from); blend <= 1; blend += 0.01) {
    const candidate = mix(bg, fg, blend)
    if (contrast(bg, candidate) >= ratio) return candidate
  }
  return fg
}
