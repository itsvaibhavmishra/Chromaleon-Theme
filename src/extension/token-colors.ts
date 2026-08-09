import { activeOverrides } from '@/extension/colors'
import { OWNED_MARK } from '@/config/extension'
import { RUNTIME } from '@/generated'
import {
  activeVariant,
  readGlobalObject,
  writeGlobalObject,
  type Settings,
} from '@/extension/settings'

const SECTION = 'editor.tokenColorCustomizations'

interface Rule {
  name?: unknown
  scope?: unknown
  settings?: { fontStyle?: string; foreground?: string }
}

interface TokenBlock {
  textMateRules?: Rule[]
  [key: string]: unknown
}

const ITALIC_SCOPES = new Set<string>(RUNTIME.italicScopes)

// Colour rules carry a name, so they can be recognised exactly rather than by shape. The
// italic ones predate this and are still matched by shape, which is why both tests exist.

// Only the rules we write: a named colour rule of ours, or a build italic scope with
// fontStyle cleared. Anything else in the block is the user's and stays.
function isOurs(rule: Rule): boolean {
  if (typeof rule.name === 'string' && rule.name.startsWith(OWNED_MARK)) return true
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

// Red paints 12 workbench keys and 17 scopes. Recolouring the keys alone would move error
// badges and leave the syntax untouched, which is the opposite of the request.
function roleRules(settings: Settings, label: string): Rule[] {
  const rules: Rule[] = []
  for (const [id, value] of Object.entries(activeOverrides(settings, label))) {
    const role = RUNTIME.roles.find((entry) => entry.id === id)
    if (!role) continue
    for (const { key, alpha } of role.scopes) {
      // Semantic tokens are named in the catalogue for display; they are not TextMate scopes
      // and a rule targeting one would never match.
      if (key.endsWith('(semantic)')) continue
      rules.push({
        name: `${OWNED_MARK} ${id}`,
        scope: key,
        settings: { foreground: `${value}${alpha}` },
      })
    }
  }
  return rules
}

/** Writes every token-colour rule we own: italics off, and any recoloured syntax roles. */
export async function applyTokenColors(settings: Settings): Promise<void> {
  const all = readGlobalObject(SECTION)
  const variant = activeVariant()

  stripOurs(all)

  if (variant) {
    const ours: Rule[] = [
      ...(settings.italics
        ? []
        : RUNTIME.italicScopes.map((italicScope) => ({
            scope: italicScope,
            settings: { fontStyle: '' },
          }))),
      ...roleRules(settings, variant.label),
    ]
    if (ours.length > 0) {
      const scope = `[${variant.label}]`
      const block = { ...((all[scope] as TokenBlock) ?? {}) }
      const rules = Array.isArray(block.textMateRules) ? block.textMateRules : []
      block.textMateRules = [...rules, ...ours]
      all[scope] = block
    }
  }

  await writeGlobalObject(SECTION, all)
}

/** Removes our rules without disturbing anything else. */
export async function clearTokenColors(): Promise<void> {
  const all = readGlobalObject(SECTION)
  stripOurs(all)
  await writeGlobalObject(SECTION, all)
}
