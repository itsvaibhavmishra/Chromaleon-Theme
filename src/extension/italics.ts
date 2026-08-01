import { RUNTIME } from '../generated'
import { activeVariant, readGlobalObject, writeGlobalObject, type Settings } from './settings'

const SECTION = 'editor.tokenColorCustomizations'

interface TokenBlock {
  textMateRules?: Array<{ scope?: unknown; settings?: { fontStyle?: string } }>
  [key: string]: unknown
}

const ITALIC_SCOPES = new Set<string>(RUNTIME.italicScopes)

// Recognises only the rules this extension writes: one of the build's italic scopes,
// with fontStyle cleared. Anything else in the block is the user's and stays.
function isOurs(rule: { scope?: unknown; settings?: { fontStyle?: string } }): boolean {
  return (
    typeof rule.scope === 'string' &&
    ITALIC_SCOPES.has(rule.scope) &&
    rule.settings?.fontStyle === ''
  )
}

// Removes our rules from every scope block, dropping keys and blocks only once they are
// empty. Deleting whole blocks by brand name would destroy a user's own entry.
function stripOurs(all: Record<string, unknown>): void {
  for (const [scope, value] of Object.entries(all)) {
    if (typeof value !== 'object' || value === null) continue
    const block = { ...(value as TokenBlock) }
    if (!Array.isArray(block.textMateRules)) continue

    const kept = block.textMateRules.filter((rule) => !isOurs(rule))
    if (kept.length === block.textMateRules.length) continue

    if (kept.length > 0) block.textMateRules = kept
    else delete block.textMateRules

    if (Object.keys(block).length === 0) delete all[scope]
    else all[scope] = block
  }
}

/** Strips italics by overriding the scopes the build reported as italic. */
export async function applyItalics(settings: Settings): Promise<void> {
  const all = readGlobalObject(SECTION)
  const variant = activeVariant()

  stripOurs(all)

  if (variant && !settings.italics) {
    const scope = `[${variant.label}]`
    const block = { ...((all[scope] as TokenBlock) ?? {}) }
    const rules = Array.isArray(block.textMateRules) ? block.textMateRules : []
    block.textMateRules = [
      ...rules,
      ...RUNTIME.italicScopes.map((s) => ({ scope: s, settings: { fontStyle: '' } })),
    ]
    all[scope] = block
  }

  await writeGlobalObject(SECTION, all)
}

/** Removes our italic rules without disturbing anything else. */
export async function clearItalics(): Promise<void> {
  const all = readGlobalObject(SECTION)
  stripOurs(all)
  await writeGlobalObject(SECTION, all)
}
