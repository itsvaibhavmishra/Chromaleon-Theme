import { readdir, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { contrast, luminance, opaque, over } from '@/core/color'
import { FLOORS } from '@/core/roles'
import { fingerprint, readLock, ROOT } from '@/scripts/fingerprint'

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
    for (const problem of problems.slice(0, 10)) console.log(`       ${problem}`)
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

  for (const file of files.filter((name) => name.includes('-High-Contrast'))) {
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
      for (const problem of problems) console.log(`       ${problem}`)
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
  const drifted = actual !== expected
  if (drifted) {
    console.log('FAIL theme fingerprint changed')
    console.log(`       expected ${expected}`)
    console.log(`       actual   ${actual}`)
    console.log('       If the change to appearance was intended, run: npm run lock')
    // Deliberately not fatal here. The moment you are most likely to have broken contrast is
    // the moment you changed a colour, so the audits below have to run and report before you
    // decide whether to lock. Exiting here would hide exactly the failure worth seeing.
  } else {
    console.log(`ok   theme fingerprint ${actual.slice(0, 16)}...`)
  }

  const dir = join(ROOT, 'themes')
  const all = (await readdir(dir)).filter((name) => name.endsWith('.json')).sort()
  const iconThemes = all.filter((name) => name.includes('-Icons'))
  const files = all.filter((name) => !name.includes('-Icons'))
  if (files.length === 0) throw new Error('no themes found: run the build first')

  // Imported, not restated. The customizer judges an edited theme by the same table, so a
  // number changed here changes what the panel reports in the same commit.
  const BODY_MIN = FLOORS.body
  const SYNTAX_MIN = FLOORS.syntax
  const ACCENT_MIN = FLOORS.nonText
  const ON_ACCENT_MIN = FLOORS.ui
  let failures = 0

  failures += await checkHighContrastPairs(dir, files)

  for (const file of iconThemes) {
    failures += await checkIconTheme(dir, file)
  }

  for (const file of files) {
    const theme = JSON.parse(await readFile(join(dir, file), 'utf8'))
    const bg: string = theme.colors['editor.background']
    const problems: string[] = []

    const body = contrast(bg, opaque(theme.colors['editor.foreground']))
    if (body < BODY_MIN) problems.push(`body text ${body.toFixed(2)}:1 (want >= ${BODY_MIN})`)

    // The accent must read as a UI element against the background (3:1), and
    // whatever sits on top of it must read as text (4.5:1). The second one is
    // easy to get wrong: a mid-tone accent fails against black *and* is not
    // obviously wrong until you look at a button label.
    const accent = theme.colors['button.background']
    const onAccent = theme.colors['button.foreground']
    const accentVsBg = contrast(bg, opaque(accent))
    if (accentVsBg < ACCENT_MIN) {
      problems.push(`accent ${accent} on bg ${accentVsBg.toFixed(2)}:1 (want >= ${ACCENT_MIN})`)
    }
    const onAccentRatio = contrast(opaque(accent), opaque(onAccent))
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
      // Both of these once reached for pure white as "the brightest tone", which reads as
      // invisible the moment the surface underneath is light.
      ['tab.activeForeground', 'tab.activeBackground'],
      ['list.hoverForeground', 'list.hoverBackground'],
    ] as const) {
      // Composite the surface over the editor background first. Several of
      // these are translucent, and measuring the raw hex reports a surface
      // lighter than the one that actually renders.
      const ratio = contrast(over(theme.colors[bgKey], bg), opaque(theme.colors[fgKey]))
      if (ratio < ON_ACCENT_MIN) {
        problems.push(`${fgKey} ${ratio.toFixed(2)}:1 (want >= ${ON_ACCENT_MIN})`)
      }
    }

    // Hairlines are meant to be barely there, so no contrast floor can catch them going
    // wrong. What can be caught is direction: a faint lift has to move away from the
    // background, and on a light variant that means darker. Getting this backwards costs
    // every widget border, the find-match washes and the input outlines at once, and
    // nothing else here would notice.
    const isLight = luminance(bg) > 0.5
    const lightens = luminance(over(theme.colors['widget.border'], bg)) > luminance(bg)
    if (lightens === isLight) {
      problems.push(
        `hairlines move the wrong way: ${theme.colors['widget.border']} over ${bg} ` +
          `${lightens ? 'lightens' : 'darkens'} on a ${isLight ? 'light' : 'dark'} variant`,
      )
    }

    // Comments and preprocessor directives are meant to recede: they carry
    // no meaning through colour, so the syntax floor does not apply to them.
    const RECEDES = ['comment', 'preprocessor']
    // Receding text still has to be readable. Without a floor here a light variant can sink
    // its comments to near-invisible and every other check still passes.
    const RECEDE_MIN = FLOORS.recede

    for (const rule of theme.tokenColors as Array<{
      name?: string
      settings: { foreground?: string }
    }>) {
      const fg = rule.settings.foreground
      const name = rule.name?.toLowerCase() ?? ''
      if (!fg) continue
      if (RECEDES.some((recedingWord) => name.includes(recedingWord))) {
        const ratio = contrast(bg, opaque(fg))
        if (ratio < RECEDE_MIN) {
          problems.push(
            `${rule.name ?? 'unnamed'} ${fg} ${ratio.toFixed(2)}:1 (want >= ${RECEDE_MIN})`,
          )
        }
        continue
      }
      const ratio = contrast(bg, opaque(fg))
      if (ratio < SYNTAX_MIN) {
        problems.push(`${rule.name ?? 'unnamed'} ${fg} ${ratio.toFixed(2)}:1`)
      }
    }

    const unique = [...new Set(problems)]
    if (unique.length > 0) {
      failures++
      console.log(`FAIL ${file}`)
      for (const problem of unique) console.log(`       ${problem}`)
    } else {
      console.log(`ok   ${file}  body ${body.toFixed(2)}:1`)
    }
  }

  console.log(`\n${files.length - failures}/${files.length} themes pass`)
  if (failures > 0 || drifted) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
