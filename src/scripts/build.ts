import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildIcons } from '../icons/build'
import { highContrast } from '../theme/high-contrast'
import type { Palette } from '../core/palette'
import { type Floor, ROLES } from '../core/roles'
import { semantic } from '../theme/semantic'
import { tokens } from '../theme/tokens'
import { DEFAULT_ACCENT, VARIANTS } from '../theme/variants'
import { workbench } from '../theme/workbench'

/** Change this one string to rebrand every theme label, id and filename. */
export const BRAND = 'Chromaleon'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const OUT = join(ROOT, 'themes')

interface BuiltTheme {
  label: string
  file: string
  light: boolean
  json: unknown
}

function build(palette: Palette, label: string, italics: boolean, light: boolean): BuiltTheme {
  return {
    label,
    light,
    file: `${label.replace(/\s+/g, '-')}.json`,
    json: {
      name: label,
      type: light ? 'light' : 'dark',
      semanticHighlighting: true,
      colors: workbench(palette),
      tokenColors: tokens(palette, italics),
      semanticTokenColors: semantic(palette, italics),
    },
  }
}

/** A workbench key that renders the accent, plus the alpha it renders it at. */
interface AccentKey {
  key: string
  alpha: string
}

// Discovers which workbench keys carry the accent by rendering the mapping with sentinel
// colours and finding where they land. Introspection, not a hand-kept list, so the runtime
// override set cannot fall out of step with workbench.ts.
function accentKeys(palette: Palette): {
  accent: AccentKey[]
  accentDim: AccentKey[]
  onAccent: AccentKey[]
} {
  const ACCENT = '#010203'
  const DIM = '#040506'
  const ON = '#070809'
  const probe = workbench({ ...palette, accent: ACCENT, accentDim: DIM, onAccent: ON })

  const collect = (sentinel: string): AccentKey[] =>
    Object.entries(probe)
      .filter(([, value]) => value.toLowerCase().startsWith(sentinel))
      .map(([key, value]) => ({ key, alpha: value.slice(sentinel.length) }))

  return { accent: collect(ACCENT), accentDim: collect(DIM), onAccent: collect(ON) }
}

/** A role, with everything it paints discovered rather than listed by hand. */
interface RoleEntry {
  id: string
  label: string
  group: string
  floor: Floor
  keys: string[]
  scopes: string[]
}

// Renders the three mappings with a unique sentinel per role and reads back where each one
// landed. The counts the customizer shows are therefore the real ones: a role that stops
// painting something loses the key here in the same build that changed it.
function roleCatalogue(palette: Palette, italics: boolean): RoleEntry[] {
  // Scattered rather than sequential, so a value mixed from two sentinels can never collide
  // with a third and be attributed to the wrong role.
  const sentinel = (i: number) =>
    '#' + ((((i + 1) * 2654435761) >>> 0) % 0xffffff).toString(16).padStart(6, '0')

  // Every Palette role is a string, so a record over the same keys satisfies the type.
  const probe = {} as Record<keyof Palette, string>
  ROLES.forEach((role, i) => (probe[role.id] = sentinel(i)))
  const owner = new Map(ROLES.map((role, i) => [sentinel(i), role.id as string]))

  const entries = new Map<string, RoleEntry>(
    ROLES.map((role) => [role.id, { ...role, keys: [], scopes: [] }]),
  )
  const attribute = (value: unknown, into: 'keys' | 'scopes', name: string) => {
    if (typeof value !== 'string' || !value.startsWith('#')) return false
    const id = owner.get(value.slice(0, 7).toLowerCase())
    if (!id) return false
    entries.get(id)![into].push(name)
    return true
  }

  let unattributed = 0
  for (const [key, value] of Object.entries(workbench(probe))) {
    if (!attribute(value, 'keys', key)) unattributed++
  }
  // Rules that carry only a fontStyle set no colour, so they have no role to belong to.
  for (const rule of tokens(probe, italics)) {
    if (!rule.settings.foreground) continue
    const scope = Array.isArray(rule.scope) ? rule.scope.join(', ') : rule.scope
    if (!attribute(rule.settings.foreground, 'scopes', scope || 'default')) unattributed++
  }
  for (const [token, value] of Object.entries(semantic(probe, italics))) {
    const colour =
      typeof value === 'string' ? value : (value as { foreground?: string })?.foreground
    if (!colour) continue
    if (!attribute(colour, 'scopes', `${token} (semantic)`)) unattributed++
  }

  // A composed value would be unreachable from the role list, so the panel would show a
  // colour the user cannot edit. Fail the build rather than ship a dead control.
  if (unattributed > 0) {
    throw new Error(
      `${unattributed} theme values are not traceable to a single role. ` +
        'The customizer can only edit what it can attribute.',
    )
  }

  return [...entries.values()]
}

/** Scopes whose only difference between italic and non-italic builds is style. */
function italicScopes(palette: Palette): string[] {
  const on = tokens(palette, true)
  const scopes = new Set<string>()
  for (const rule of on) {
    if (!rule.settings.fontStyle?.includes('italic')) continue
    for (const scope of Array.isArray(rule.scope) ? rule.scope : [rule.scope]) {
      if (scope) scopes.add(scope)
    }
  }
  return [...scopes].sort()
}

async function main() {
  const italics = !process.argv.includes('--no-italics')

  // Rebuild from scratch so a renamed or removed variant can't leave a stale
  // file behind that package.json no longer references.
  await rm(OUT, { recursive: true, force: true })
  await mkdir(OUT, { recursive: true })

  const built: BuiltTheme[] = []
  const variantMeta: Record<string, { bg: string; accent: string; light: boolean }> = {}
  const palettes: Record<string, Palette> = {}

  for (const variant of VARIANTS) {
    const { name, light, ...palette } = variant
    const base = `${BRAND} ${name}`
    const hc = `${BRAND} ${name} High Contrast`

    built.push(build(palette, base, italics, light))
    built.push(build(highContrast(palette, light), hc, italics, light))

    // The runtime needs each theme's own background and polarity: it mixes overrides
    // against the background, and which direction "away from it" points depends on whether
    // the variant is light or dark.
    variantMeta[base] = { bg: palette.bg, accent: palette.accent, light }
    variantMeta[hc] = { bg: highContrast(palette, light).bg, accent: palette.accent, light }

    // The customizer paints its canvas and its swatches from these, so it never has to read
    // a theme file back off disk or guess at a colour the build already knows.
    palettes[base] = palette
    palettes[hc] = highContrast(palette, light)
  }

  for (const theme of built) {
    await writeFile(join(OUT, theme.file), `${JSON.stringify(theme.json, null, 2)}\n`)
  }

  const reference = VARIANTS[0]
  const icons = await buildIcons(ROOT, BRAND, {
    accent: DEFAULT_ACCENT,
    accentFolders: false,
  })

  // Everything the extension host needs at runtime, derived from the same
  // source the themes were generated from.
  const { accent, accentDim, onAccent } = accentKeys(reference)
  const runtime = {
    brand: BRAND,
    iconThemeId: icons.id,
    iconThemeFile: icons.file,
    defaultAccent: DEFAULT_ACCENT,
    accentKeys: accent,
    accentDimKeys: accentDim,
    onAccentKeys: onAccent,
    italicScopes: italicScopes(reference),
    variants: variantMeta,
    roles: roleCatalogue(reference, italics),
    palettes,
  }

  // Guard the serialisation: JSON silently drops undefined, and a key missing
  // from the manifest is one the accent setting would then never repaint.
  const serialised = JSON.stringify(runtime, null, 2)
  const roundTripped = JSON.parse(serialised) as Record<string, unknown>
  for (const [name, expected] of [
    ['accentKeys', accent.length],
    ['accentDimKeys', accentDim.length],
    ['onAccentKeys', onAccent.length],
    ['italicScopes', runtime.italicScopes.length],
    ['variants', Object.keys(variantMeta).length],
    ['roles', ROLES.length],
    ['palettes', Object.keys(palettes).length],
  ] as const) {
    const value = roundTripped[name]
    const actual = Array.isArray(value) ? value.length : Object.keys(value as object).length
    if (actual !== expected) {
      throw new Error(
        `runtime manifest lost ${name} in serialisation: ${actual}/${expected} survived`,
      )
    }
  }

  await writeFile(
    join(ROOT, 'src', 'generated.ts'),
    '// Generated by src/build.ts. Do not edit.\n' +
      `export const RUNTIME = ${serialised} as const\n`,
  )

  // The manifest is derived, never hand-edited: it cannot drift from VARIANTS.
  const manifestPath = join(ROOT, 'package.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  manifest.contributes ??= {}
  manifest.contributes.themes = built.map((theme) => ({
    label: theme.label,
    path: `./themes/${theme.file}`,
    uiTheme: theme.light ? 'vs' : 'vs-dark',
  }))
  manifest.contributes.iconThemes = [
    { id: icons.id, label: icons.label, path: `./themes/${icons.file}`, _watch: true },
  ]
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

  const keys = Object.keys((built[0].json as { colors: object }).colors).length
  console.log(
    `${built.length} themes -> themes/  (${VARIANTS.length} variants x base+HC, ` +
      `${keys} colour keys each, italics ${italics ? 'on' : 'off'})`,
  )
  console.log(
    `icons: ${icons.fileIcons} file + ${icons.folderIcons} folder, ` +
      `${icons.associations} associations`,
  )
  console.log(
    `       source: ${icons.source.name}@${icons.source.version} (${icons.source.license})`,
  )
  console.log(
    `runtime: accent ${DEFAULT_ACCENT}, ${accent.length} accent keys, ` +
      `${accentDim.length} dim, ${onAccent.length} on-accent`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
