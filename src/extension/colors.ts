import type * as vscode from 'vscode'

import { resolveAccent } from '../core/accents'
import { bestOn, mix } from '../core/color'
import { RUNTIME } from '../generated'
import { readOwned, stripOwned, writeOwned, type Owned } from './ledger'
import {
  activeVariant,
  readGlobalObject,
  writeGlobalObject,
  type Settings,
  type Variant,
} from './settings'

const SECTION = 'workbench.colorCustomizations'

// Only the keys a setting actually changes are emitted, so the theme file stays the
// source of truth for everything else and an untouched install writes nothing.
export function overrides(settings: Settings, variant: Variant): Record<string, string> {
  const out: Record<string, string> = {}
  const picked = resolveAccent(settings.accent, settings.customAccent)
  const accent = picked ?? variant.accent
  const onAccent = bestOn(accent)
  // Every override that lifts a surface off the background has to know which way that is.
  // Mixing toward white on a near-white variant produces a colour nobody can see.
  const away = (amount: number) => mix(variant.bg, variant.light ? '#000000' : '#ffffff', amount)

  // Which keys carry the accent is discovered at build time from workbench.ts, so this set
  // cannot drift from the mapping that produced the themes.
  if (picked && picked !== variant.accent) {
    for (const { key, alpha } of RUNTIME.accentKeys) out[key] = `${picked}${alpha}`
    const dim = mix(variant.bg, picked, 0.28)
    for (const { key, alpha } of RUNTIME.accentDimKeys) out[key] = `${dim}${alpha}`
    // Text on the accent has to be re-picked too: a light accent needs black where a dark one
    // needs white, and getting it wrong makes button labels unreadable.
    for (const { key, alpha } of RUNTIME.onAccentKeys) out[key] = `${onAccent}${alpha}`
  }

  // Selection normally tints the room's own hue so it belongs to the variant; this pulls it
  // onto the accent instead, for people who want one colour running through everything.
  if (settings.selectionStyle === 'accent') {
    const dim = mix(variant.bg, accent, 0.28)
    for (const { key, alpha } of RUNTIME.accentDimKeys) out[key] = `${dim}${alpha}`
  }

  // The cursor is deliberately its own colour so it stays findable when the accent is dim.
  if (settings.cursorStyle === 'accent') {
    out['editorCursor.foreground'] = accent
    out['editorCursor.background'] = onAccent
  }

  if (settings.accentedStatusBar) {
    out['statusBar.background'] = accent
    out['statusBar.foreground'] = onAccent
    out['statusBar.border'] = accent
    out['statusBar.noFolderBackground'] = accent
    out['statusBarItem.hoverBackground'] = `${onAccent}22`
    out['statusBarItem.remoteBackground'] = `${onAccent}22`
    out['statusBarItem.remoteForeground'] = onAccent
  }

  if (settings.borders !== 'none') {
    const border = away(settings.borders === 'strong' ? 0.22 : 0.1)
    for (const key of [
      'activityBar.border',
      'sideBar.border',
      'panel.border',
      'statusBar.border',
      'titleBar.border',
      'editorGroup.border',
      'tab.border',
      'menu.border',
    ]) {
      out[key] = border
    }
    // Re-applied after, so an accented status bar keeps its own edge.
    if (settings.accentedStatusBar) out['statusBar.border'] = accent
  }

  if (settings.tabBar === 'contrasted') {
    // A light variant needs a far gentler step: 0.35 toward black turns a pale tab bar into
    // a dark slab rather than a shade of the same paper.
    const bar = away(variant.light ? 0.07 : 0.35)
    out['editorGroupHeader.tabsBackground'] = bar
    out['tab.inactiveBackground'] = bar
    out['tab.activeBackground'] = variant.bg
  }

  if (settings.currentLine === 'solid') {
    out['editor.lineHighlightBackground'] = away(0.05)
    out['editor.lineHighlightBorder'] = '#00000000'
  } else if (settings.currentLine === 'none') {
    out['editor.lineHighlightBackground'] = '#00000000'
    out['editor.lineHighlightBorder'] = '#00000000'
  }

  // Split editors paint their active tab from the unfocused pair, so setting only the
  // focused keys leaves every group but the one you clicked showing the old indicator.
  if (settings.tabIndicator === 'top') {
    out['tab.activeBorderTop'] = accent
    out['tab.unfocusedActiveBorderTop'] = accent
    out['tab.activeBorder'] = '#00000000'
    out['tab.unfocusedActiveBorder'] = '#00000000'
  } else if (settings.tabIndicator === 'none') {
    for (const key of [
      'tab.activeBorderTop',
      'tab.unfocusedActiveBorderTop',
      'tab.activeBorder',
      'tab.unfocusedActiveBorder',
    ]) {
      out[key] = '#00000000'
    }
  }

  if (!settings.shadows) {
    for (const key of ['widget.shadow', 'scrollbar.shadow']) out[key] = '#00000000'
  }

  // Last, so a role someone edited by hand wins over anything a setting derived. Each role
  // expands into every workbench key it paints, at the alpha that key renders it: 119 of the
  // 279 are translucent, and flattening those turns borders and hover states into slabs.
  for (const [id, value] of Object.entries(settings.roleOverrides[variant.label] ?? {})) {
    const role = RUNTIME.roles.find((entry) => entry.id === id)
    if (!role) continue
    for (const { key, alpha } of role.keys) out[key] = `${value}${alpha}`
  }

  return out
}

/** Writes our overrides into the scoped block for the active theme. */
export async function applyColors(
  context: vscode.ExtensionContext,
  settings: Settings,
): Promise<void> {
  const variant = activeVariant()
  const all = readGlobalObject(SECTION)

  stripOwned(all, readOwned(context))

  const next: Owned = {}
  if (variant) {
    const values = overrides(settings, variant)
    const keys = Object.keys(values)
    if (keys.length > 0) {
      const scope = `[${variant.label}]`
      const existing = (all[scope] ?? {}) as Record<string, string>
      all[scope] = { ...existing, ...values }
      next[scope] = keys
    }
  }

  await writeGlobalObject(SECTION, all)
  await writeOwned(context, next)
}

/** Removes everything we wrote, leaving hand-authored customisations untouched. */
export async function clearColors(context: vscode.ExtensionContext): Promise<void> {
  const all = readGlobalObject(SECTION)
  stripOwned(all, readOwned(context))
  await writeGlobalObject(SECTION, all)
  await writeOwned(context, {})
}
