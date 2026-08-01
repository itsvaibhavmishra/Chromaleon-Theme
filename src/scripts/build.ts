import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildIcons } from '../icons/build'
import { highContrast } from '../theme/high-contrast'
import type { Palette } from '../core/palette'
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
