// Folder recolouring, shared by the build and the extension host. Material draws each
// folder as a saturated `id="folder"` body plus a pale `id="motive"` glyph, so recolouring
// rewrites exactly those two fills. Plain folder icons carry no id, so an unidentified
// path is treated as the body.

/** Matches a whole `<path .../>` element. */
const PATH = /<path\b[^>]*\/?>/g

/** Matches a fill attribute carrying a hex colour. */
const FILL = /fill="#[0-9a-fA-F]{3,8}"/

function mixHex(bottom: string, top: string, amount: number): string {
  const parse = (hex: string): [number, number, number] => {
    const packed = parseInt(hex.slice(1), 16)
    return [(packed >> 16) & 255, (packed >> 8) & 255, packed & 255]
  }
  const bottomRgb = parse(bottom)
  const topRgb = parse(top)
  const out = [0, 1, 2].map((channelIndex) =>
    Math.round(
      bottomRgb[channelIndex] + (topRgb[channelIndex] - bottomRgb[channelIndex]) * amount,
    ),
  )
  return `#${out.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`
}

// Returns the input unchanged when there is no fill to rewrite, so an unexpected icon
// shape degrades to Material's original rather than to a blank.
export function recolorFolder(svg: string, accent: string): string {
  // Same relationship Material uses between body and glyph: the motive is a
  // heavily lightened version of the body colour.
  const motive = mixHex(accent, '#ffffff', 0.68)

  return svg.replace(PATH, (element) => {
    if (!FILL.test(element)) return element
    const isMotive = /id="motive"/.test(element)
    return element.replace(FILL, `fill="${isMotive ? motive : accent}"`)
  })
}
