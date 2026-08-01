// Colour maths. Pure, dependency-free, shared by the build and the extension host.

const HEX = /^#([0-9a-f]{6})$/i

function parse(color: string): [number, number, number] {
  const m = HEX.exec(color)
  if (!m) throw new Error(`expected #rrggbb, got ${color}`)
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function format(rgb: [number, number, number]): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  return `#${rgb.map((v) => clamp(v).toString(16).padStart(2, '0')).join('')}`
}

/** Attaches an 8-bit alpha suffix to a `#rrggbb` colour. */
export function a(color: string, alpha: string): string {
  return `${color}${alpha}`
}

/** Blends `top` over `bottom` at `amount` (0 = bottom, 1 = top). */
export function mix(bottom: string, top: string, amount: number): string {
  const b = parse(bottom)
  const t = parse(top)
  return format([0, 1, 2].map((i) => b[i] + (t[i] - b[i]) * amount) as [number, number, number])
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
export function hsl(h: number, s: number, l: number): string {
  const S = s / 100
  const L = l / 100
  const k = (n: number) => (n + h / 30) % 12
  const amp = S * Math.min(L, 1 - L)
  const f = (n: number) => L - amp * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return format([f(0) * 255, f(8) * 255, f(4) * 255] as [number, number, number])
}

/** Inverse of `hsl`: returns `[hue, saturation, lightness]` in 0-360 / 0-100. */
export function toHsl(color: string): [number, number, number] {
  const [r, g, b] = parse(color).map((v) => v / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return [0, 0, l * 100]
  const s = d / (1 - Math.abs(2 * l - 1))
  let h: number
  if (max === r) h = ((g - b) / d) % 6
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return [(((h * 60) % 360) + 360) % 360, s * 100, l * 100]
}

/** Relative luminance, per WCAG 2.x. */
export function luminance(color: string): number {
  const [r, g, b] = parse(color).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Contrast ratio between two colours. */
export function contrast(x: string, y: string): number {
  const [hi, lo] = [luminance(x), luminance(y)].sort((p, q) => q - p)
  return (hi + 0.05) / (lo + 0.05)
}

// Black or white, whichever the colour carries better. Assuming black is wrong for
// mid-tones: #2578b3 gives 4.42:1 on black but 4.76:1 on white, so only one clears AA.
export function bestOn(color: string): string {
  return contrast(color, '#000000') >= contrast(color, '#ffffff') ? '#000000' : '#ffffff'
}

// Walks bg -> fg and returns the first step clearing `ratio`. Pins UI text to a contrast
// floor instead of a fixed lightness, so a palette tuned for mood stays legible.
export function atLeast(bg: string, fg: string, ratio: number, from = 0): string {
  for (let t = Math.max(0, from); t <= 1; t += 0.01) {
    const candidate = mix(bg, fg, t)
    if (contrast(bg, candidate) >= ratio) return candidate
  }
  return fg
}
