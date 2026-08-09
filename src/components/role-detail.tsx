import { useEffect, useRef, useState } from 'preact/hooks'

import { hsl, toHsl } from '@/core/color'
import { KEY_PREVIEW } from '@/constants/panel'
import { Swatch } from '@/components/swatch'
import { HEX, isFailing, type RoleView } from '@/webview/model'
import type { Concept } from '@/webview/protocol'

export function contrastLine(role: RoleView): string {
  if (role.floor.on === 'none') {
    return 'No floor of its own. Other roles are measured against this one.'
  }
  const surface = role.floor.on === 'accent' ? 'the accent' : 'the editor background'
  const reads = `Reads at ${role.ratio!.toFixed(1)}:1 on ${surface}.`
  return isFailing(role)
    ? `${reads} Below its ${role.floor.min}:1 target.`
    : `${reads} Clears its ${role.floor.min}:1 target.`
}

// Saturation across, lightness down, hue on its own slider. HSL throughout, because the
// palettes are authored in HSL and the square should move the axes they were designed on.
export function Picker({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  // Held here rather than re-derived from the hex every frame. A grey has no hue to read
  // back, so dragging to the left edge would otherwise snap the whole square to red.
  const [[hue, saturation, lightness], setHsl] = useState(() => toHsl(value))
  const ours = useRef<string | null>(null)
  const square = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (value !== ours.current) setHsl(toHsl(value))
  }, [value])

  const emit = (next: [number, number, number]) => {
    setHsl(next)
    const hex = hsl(...next)
    ours.current = hex
    onChange(hex)
  }

  const drag = (event: PointerEvent) => {
    const box = square.current!
    box.setPointerCapture(event.pointerId)
    const move = (at: PointerEvent) => {
      const rect = box.getBoundingClientRect()
      const acrossFraction = Math.min(1, Math.max(0, (at.clientX - rect.left) / rect.width))
      const downFraction = Math.min(1, Math.max(0, (at.clientY - rect.top) / rect.height))
      emit([hue, acrossFraction * 100, (1 - downFraction) * 100])
    }
    move(event)
    const stop = () => {
      box.releasePointerCapture(event.pointerId)
      box.removeEventListener('pointermove', move)
      box.removeEventListener('pointerup', stop)
    }
    box.addEventListener('pointermove', move)
    box.addEventListener('pointerup', stop)
  }

  return (
    <div class="picker-body">
      <div class="sv" ref={square} onPointerDown={drag} style={{ '--hue': hsl(hue, 100, 50) }}>
        <span
          class="sv-dot"
          style={{ left: `${saturation}%`, top: `${100 - lightness}%`, background: value }}
        />
      </div>
      <input
        class="hue"
        type="range"
        min="0"
        max="359"
        value={Math.round(hue)}
        aria-label="Hue"
        onInput={(event) =>
          emit([Number((event.target as HTMLInputElement).value), saturation, lightness])
        }
      />
    </div>
  )
}

// Committed on Enter or blur rather than per keystroke: "#ff" is not a colour, and writing
// one per character would churn the draft a dozen times a word. Escape abandons the edit.
export function HexField({
  role,
  onCommit,
}: {
  role: RoleView
  onCommit: (value: string) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const text = draft ?? role.value
  const valid = HEX.test(text)

  const commit = () => {
    if (draft !== null && valid && draft !== role.value) onCommit(draft)
    setDraft(null)
  }

  return (
    <input
      class={valid ? 'detail-value' : 'detail-value invalid'}
      value={text}
      spellcheck={false}
      aria-label="Colour, as a hex value"
      onInput={(event) => setDraft((event.target as HTMLInputElement).value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') (event.target as HTMLInputElement).blur()
        else if (event.key === 'Escape') {
          setDraft(null)
          ;(event.target as HTMLInputElement).blur()
        }
      }}
    />
  )
}

export function RoleDetail({
  role,
  concepts,
  onClear,
  onEdit,
  onRevert,
}: {
  role: RoleView
  concepts: Concept[]
  onClear: () => void
  onEdit: (value: string) => void
  onRevert: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  // Every concept resolving here, not just the first. Two of them land on Cyan, and hiding
  // one would understate what moves when this role changes.
  const named = concepts.filter((concept) => concept.role === role.id)

  // Keys first, then scopes: the workbench ones are what someone is usually verifying, and
  // the scopes read as a different kind of thing rather than more of the same.
  const painted = [
    ...role.keys.map((name) => ({ name, scope: false })),
    ...role.scopes.map((name) => ({ name, scope: true })),
  ]

  return (
    <div class="detail">
      <header>
        <Swatch value={role.value} />
        <div>
          <strong>{role.label}</strong>
          <div class="detail-sub">
            <code>{role.id}</code> · {role.count} {role.count === 1 ? 'key' : 'keys'}
            {role.edited && <span class="badge-edited">CHANGED</span>}
          </div>
        </div>
        <button onClick={onRevert} disabled={!role.edited}>
          Reset this role
        </button>
        <button class="icon-button" onClick={onClear} title="Clear selection">
          &times;
        </button>
      </header>

      <Picker value={role.value} onChange={onEdit} />
      <HexField role={role} onCommit={onEdit} />

      {named.length > 0 && (
        <p class="detail-note">{named.map((concept) => concept.reads).join('. ')}.</p>
      )}

      <p class={isFailing(role) ? 'detail-contrast warn' : 'detail-contrast'}>
        {contrastLine(role)}
      </p>

      <h3>What it paints</h3>
      <div class="paints">
        {painted.slice(0, expanded ? undefined : KEY_PREVIEW).map((entry) => (
          <div key={entry.name}>
            <code>{entry.name}</code>
            {entry.scope && <span class="paints-kind">scope</span>}
          </div>
        ))}
        {role.count === 0 && <p class="muted">Nothing yet.</p>}
      </div>
      {role.count > KEY_PREVIEW && (
        <button class="link" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Show fewer' : `Show all ${role.count}`}
        </button>
      )}
    </div>
  )
}
