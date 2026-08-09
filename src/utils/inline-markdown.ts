// Only the inline markdown VS Code's settings editor renders, so no raw backticks show.

export type SegmentKind = 'plain' | 'code' | 'strong' | 'em' | 'setting' | 'link'

export interface Segment {
  text: string
  kind: SegmentKind
  /** Only on a link. */
  href?: string
}

// Two asterisks before one, or `**bold**` is read as an empty emphasis followed by a stray.
const INLINE = /`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|#([\w.]+)#/g

export function inlineSegments(description: string): Segment[] {
  const segments: Segment[] = []
  let plainFrom = 0

  INLINE.lastIndex = 0
  for (let match = INLINE.exec(description); match; match = INLINE.exec(description)) {
    if (match.index > plainFrom) {
      segments.push({ text: description.slice(plainFrom, match.index), kind: 'plain' })
    }
    const [, code, linkText, href, strong, emphasis, setting] = match
    // Letting code win here would print #chromaleon.accent# at somebody, hashes and all.
    if (code !== undefined) {
      const reference = /^#([\w.]+)#$/.exec(code)
      segments.push(
        reference
          ? { text: shortKey(reference[1]), kind: 'setting' }
          : { text: code, kind: 'code' },
      )
    } else if (linkText !== undefined) segments.push({ text: linkText, kind: 'link', href })
    else if (strong !== undefined) segments.push({ text: strong, kind: 'strong' })
    else if (emphasis !== undefined) segments.push({ text: emphasis, kind: 'em' })
    else segments.push({ text: shortKey(setting), kind: 'setting' })
    plainFrom = match.index + match[0].length
  }

  if (plainFrom < description.length) {
    segments.push({ text: description.slice(plainFrom), kind: 'plain' })
  }
  return segments
}

/** `chromaleon.accent` reads as `accent` inside our own settings pane. */
const shortKey = (reference: string) => reference.replace(/^chromaleon\./, '')

// Derivable from the key, so a new setting needs no second list naming it.
export function humanise(identifier: string): string {
  if (/\s/.test(identifier)) return identifier
  const spaced = identifier
    .replace(/([A-Z])/g, ' $1')
    .toLowerCase()
    .trim()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}
