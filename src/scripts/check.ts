import { readdir, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { fingerprint, readLock, ROOT } from './fingerprint'

/** Relative luminance per WCAG 2.x. */
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1, 7), 16)
  const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

// Composites `color` over `backdrop`, honouring an `#rrggbbaa` suffix. Measuring the raw
// hex of a translucent surface reports one lighter than the one that actually renders.
function over(color: string, backdrop: string): string {
  const alpha = color.length === 9 ? parseInt(color.slice(7, 9), 16) / 255 : 1
  if (alpha === 1) return color.slice(0, 7)
  const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  const [fr, fg, fb] = channels(color)
  const [br, bg, bb] = channels(backdrop)
  const blend = [
    fr * alpha + br * (1 - alpha),
    fg * alpha + bg * (1 - alpha),
    fb * alpha + bb * (1 - alpha),
  ]
  return `#${blend.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`
}

function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

// A broken icon theme fails silently in VS Code: a missing file or dangling reference
// renders nothing and logs nothing. So verify every definition resolves, every association
// points at a real definition, and every SVG is well-formed.
async function checkIconTheme(dir: string, file: string): Promise<number> {
  const theme = JSON.parse(await readFile(join(dir, file), 'utf8'))
  const problems: string[] = []

  const definitions: Record<string, { iconPath: string }> = theme.iconDefinitions
  for (const [name, definition] of Object.entries(definitions)) {
    const path = resolve(dir, definition.iconPath)
    try {
      const svg = await readFile(path, 'utf8')
      // Cheap well-formedness check: a self-contained single-root SVG.
      if (!svg.startsWith('<svg') || !svg.trimEnd().endsWith('</svg>')) {
        problems.push(`${name}: malformed svg`)
      }
    } catch {
      problems.push(`${name}: missing ${definition.iconPath}`)
    }
  }

  const TABLES = [
    'fileExtensions',
    'fileNames',
    'languageIds',
    'folderNames',
    'folderNamesExpanded',
  ] as const
  let associations = 0
  for (const table of TABLES) {
    for (const [key, ref] of Object.entries(theme[table] ?? {})) {
      associations++
      if (!((ref as string) in definitions)) problems.push(`${table}["${key}"] -> unknown ${ref}`)
    }
  }

  for (const key of ['file', 'folder', 'folderExpanded', 'rootFolder', 'rootFolderExpanded']) {
    if (theme[key] && !(theme[key] in definitions)) {
      problems.push(`${key} -> unknown ${theme[key]}`)
    }
  }

  if (problems.length > 0) {
    console.log(`FAIL ${file}`)
    for (const p of problems.slice(0, 10)) console.log(`       ${p}`)
    if (problems.length > 10) console.log(`       ... and ${problems.length - 10} more`)
    return 1
  }

  console.log(
    `ok   ${file}  ${Object.keys(definitions).length} icons, ${associations} associations`,
  )
  return 0
}

// High contrast must separate REGIONS, not brighten in-editor texture. Lifting the indent
// guides stripes the editor at every indentation level, which reads as noise, not contrast.
async function checkHighContrastPairs(dir: string, files: string[]): Promise<number> {
  const TEXTURE = [
    'editorIndentGuide.activeBackground',
    'editorIndentGuide.background',
    'editorWhitespace.foreground',
    'editorRuler.foreground',
    'tree.indentGuidesStroke',
  ]
  let failures = 0

  for (const file of files.filter((f) => f.includes('-High-Contrast'))) {
    const base = file.replace('-High-Contrast', '')
    if (!files.includes(base)) continue

    const hc = JSON.parse(await readFile(join(dir, file), 'utf8'))
    const plain = JSON.parse(await readFile(join(dir, base), 'utf8'))
    const problems = TEXTURE.filter((key) => hc.colors[key] !== plain.colors[key]).map(
      (key) => `${key}: ${plain.colors[key]} -> ${hc.colors[key]}`,
    )

    if (problems.length > 0) {
      failures++
      console.log(`FAIL ${file} brightens in-editor texture`)
      for (const p of problems) console.log(`       ${p}`)
    }
  }

  if (failures === 0) console.log(`ok   high contrast pairs leave in-editor texture alone`)
  return failures
}

// Catches what survives a successful build: body text unreadable on its own background,
// and syntax hues below the floor where they stop being distinguishable at small sizes.
async function main() {
  // Guards every refactor: the generated themes must stay byte-identical unless a visual
  // change was intended and re-locked with `npm run lock`.
  const expected = (await readLock()).sha256
  const actual = await fingerprint()
  if (actual !== expected) {
    console.log('FAIL theme fingerprint changed')
    console.log(`       expected ${expected}`)
    console.log(`       actual   ${actual}`)
    console.log('       If the change to appearance was intended, run: npm run lock')
    process.exit(1)
  }
  console.log(`ok   theme fingerprint ${actual.slice(0, 16)}...`)

  const dir = join(ROOT, 'themes')
  const all = (await readdir(dir)).filter((f) => f.endsWith('.json')).sort()
  const iconThemes = all.filter((f) => f.includes('-Icons'))
  const files = all.filter((f) => !f.includes('-Icons'))
  if (files.length === 0) throw new Error('no themes found: run the build first')

  const BODY_MIN = 7
  const SYNTAX_MIN = 3.5
  /** Non-text UI floor, WCAG 1.4.11. */
  const ACCENT_MIN = 3
  /** Normal-text floor, WCAG 1.4.3 AA. */
  const ON_ACCENT_MIN = 4.5
  let failures = 0

  failures += await checkHighContrastPairs(dir, files)

  for (const file of iconThemes) {
    failures += await checkIconTheme(dir, file)
  }

  for (const file of files) {
    const theme = JSON.parse(await readFile(join(dir, file), 'utf8'))
    const bg: string = theme.colors['editor.background']
    const problems: string[] = []

    const body = contrast(bg, theme.colors['editor.foreground'])
    if (body < BODY_MIN) problems.push(`body text ${body.toFixed(2)}:1 (want >= ${BODY_MIN})`)

    // The accent must read as a UI element against the background (3:1), and
    // whatever sits on top of it must read as text (4.5:1). The second one is
    // easy to get wrong: a mid-tone accent fails against black *and* is not
    // obviously wrong until you look at a button label.
    const accent = theme.colors['button.background']
    const onAccent = theme.colors['button.foreground']
    const accentVsBg = contrast(bg, accent)
    if (accentVsBg < ACCENT_MIN) {
      problems.push(`accent ${accent} on bg ${accentVsBg.toFixed(2)}:1 (want >= ${ACCENT_MIN})`)
    }
    const onAccentRatio = contrast(accent, onAccent)
    if (onAccentRatio < ON_ACCENT_MIN) {
      problems.push(
        `${onAccent} on accent ${onAccentRatio.toFixed(2)}:1 (want >= ${ON_ACCENT_MIN})`,
      )
    }

    // Active UI text, as opposed to inactive states. Tuning the neutral ramp
    // for mood pulls these down first, and nothing else here would catch it.
    for (const [fgKey, bgKey] of [
      ['statusBar.foreground', 'statusBar.background'],
      ['editorSuggestWidget.foreground', 'editorSuggestWidget.background'],
      ['badge.foreground', 'badge.background'],
    ] as const) {
      // Composite the surface over the editor background first. Several of
      // these are translucent, and measuring the raw hex reports a surface
      // lighter than the one that actually renders.
      const ratio = contrast(over(theme.colors[bgKey], bg), theme.colors[fgKey].slice(0, 7))
      if (ratio < ON_ACCENT_MIN) {
        problems.push(`${fgKey} ${ratio.toFixed(2)}:1 (want >= ${ON_ACCENT_MIN})`)
      }
    }

    // Comments and preprocessor directives are meant to recede: they carry
    // no meaning through colour, so the syntax floor does not apply to them.
    const RECEDES = ['comment', 'preprocessor']
    // Receding text still has to be readable. Without a floor here a light variant can sink
    // its comments to near-invisible and every other check still passes.
    const RECEDE_MIN = 1.9

    for (const rule of theme.tokenColors as Array<{
      name?: string
      settings: { foreground?: string }
    }>) {
      const fg = rule.settings.foreground
      const name = rule.name?.toLowerCase() ?? ''
      if (!fg) continue
      if (RECEDES.some((r) => name.includes(r))) {
        const ratio = contrast(bg, fg.slice(0, 7))
        if (ratio < RECEDE_MIN) {
          problems.push(
            `${rule.name ?? 'unnamed'} ${fg} ${ratio.toFixed(2)}:1 (want >= ${RECEDE_MIN})`,
          )
        }
        continue
      }
      const ratio = contrast(bg, fg.slice(0, 7))
      if (ratio < SYNTAX_MIN) {
        problems.push(`${rule.name ?? 'unnamed'} ${fg} ${ratio.toFixed(2)}:1`)
      }
    }

    const unique = [...new Set(problems)]
    if (unique.length > 0) {
      failures++
      console.log(`FAIL ${file}`)
      for (const p of unique) console.log(`       ${p}`)
    } else {
      console.log(`ok   ${file}  body ${body.toFixed(2)}:1`)
    }
  }

  console.log(`\n${files.length - failures}/${files.length} themes pass`)
  if (failures > 0) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
