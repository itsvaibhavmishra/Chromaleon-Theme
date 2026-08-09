// Reading and writing the file presets travel in. Pure, so the awkward half of importing
// (a truncated file, someone else's JSON, a base we do not ship) is testable without a DOM.

const HEX = /^#[0-9a-fA-F]{6}$/

/** Bumped only when an older reader could misread a newer file. */
export const FORMAT = 1

export interface PortablePreset {
  name: string
  base: string
  overrides: Record<string, string>
  created?: string
  updated?: string
}

export interface ReadResult {
  file: string
  presets: PortablePreset[]
  /** Set when the file yielded nothing, and says why in words a person can act on. */
  problem?: string
  /** Presets inside a readable file that were dropped, each with its reason. */
  skipped: string[]
}

// What makes two presets the same preset: the name, the theme under it, and every colour.
// Dates are deliberately out, or re-exporting the same preset would read as a different one.
//
// A string rather than a deep compare, so a whole library goes into a Set once and each
// incoming preset is one lookup instead of a walk over everything already saved.
export function presetSignature(preset: {
  name: string
  base: string
  overrides: Record<string, string>
}): string {
  const colours = Object.keys(preset.overrides)
    .sort()
    .map((role) => `${role}:${preset.overrides[role].toLowerCase()}`)
    .join(',')
  return `${preset.name.trim()}\u0000${preset.base}\u0000${colours}`
}

export function writePresetFile(presets: PortablePreset[]): string {
  return `${JSON.stringify({ chromaleon: FORMAT, presets }, null, 2)}\n`
}

function readPreset(
  candidate: unknown,
  index: number,
  knownBases: string[],
): { preset?: PortablePreset; skipped?: string } {
  if (!candidate || typeof candidate !== 'object')
    return { skipped: `#${index + 1} is not an entry` }
  const entry = candidate as Record<string, unknown>

  const name = typeof entry.name === 'string' ? entry.name.trim() : ''
  if (!name) return { skipped: `#${index + 1} has no name` }
  if (typeof entry.base !== 'string') return { skipped: `${name} names no theme` }
  // A base we do not ship can never be applied, so it is refused rather than half-imported.
  if (knownBases.length > 0 && !knownBases.includes(entry.base)) {
    return { skipped: `${name} is built on ${entry.base}, which is not installed` }
  }

  const source = (entry.overrides ?? {}) as Record<string, unknown>
  if (typeof source !== 'object') return { skipped: `${name} has no colours` }
  const overrides = Object.fromEntries(
    Object.entries(source).filter(([, value]) => typeof value === 'string' && HEX.test(value)),
  ) as Record<string, string>

  return {
    preset: {
      name,
      base: entry.base,
      overrides,
      created: typeof entry.created === 'string' ? entry.created : undefined,
      updated: typeof entry.updated === 'string' ? entry.updated : undefined,
    },
  }
}

export function readPresetFile(file: string, text: string, knownBases: string[] = []): ReadResult {
  const empty = { file, presets: [], skipped: [] }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ...empty, problem: 'not valid JSON' }
  }
  if (!parsed || typeof parsed !== 'object') return { ...empty, problem: 'not a preset file' }

  const body = parsed as Record<string, unknown>
  const version = body.chromaleon
  if (typeof version !== 'number') return { ...empty, problem: 'not a Chromaleon preset file' }
  if (version > FORMAT)
    return { ...empty, problem: `made by a newer Chromaleon (format ${version})` }

  // One preset unwrapped is the shape people hand-write, so it is accepted alongside a list.
  const list = Array.isArray(body.presets) ? body.presets : [body.presets ?? body]

  const presets: PortablePreset[] = []
  const skipped: string[] = []
  list.forEach((candidate, index) => {
    const read = readPreset(candidate, index, knownBases)
    if (read.preset) presets.push(read.preset)
    else if (read.skipped) skipped.push(read.skipped)
  })

  if (presets.length === 0 && skipped.length === 0) return { ...empty, problem: 'holds no presets' }
  return { file, presets, skipped }
}
