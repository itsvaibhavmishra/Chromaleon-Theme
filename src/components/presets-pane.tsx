import { useRef, useState } from 'preact/hooks'

import { Eye } from '@/components/eye'
import { paletteFor, shortName } from '@/webview/model'
import type { PanelState } from '@/webview/protocol'

// Absolute rather than "3 days ago": a preset is a thing you come back to months later, and a
// relative age stops meaning anything past a week.
function when(stamp: string | undefined): string {
  if (!stamp) return 'no date'
  const at = new Date(stamp)
  if (Number.isNaN(at.getTime())) return 'no date'
  return at.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

// The card shows the theme rather than describing it. One swatch cannot tell two dark presets
// apart; the surfaces and the hue ramp can.
const BANDS = [
  'bg',
  'chrome',
  'surfaceAlt',
  'accent',
  'red',
  'orange',
  'yellow',
  'green',
  'cyan',
  'blue',
  'purple',
]

function Preview({ palette }: { palette: Record<string, string> }) {
  return (
    <div class="preset-preview" style={{ background: palette.bg }}>
      {BANDS.map((role) => (
        <span key={role} style={{ background: palette[role] }} />
      ))}
    </div>
  )
}

export function PresetsPane({
  state,
  selected,
  onSelect,
  onEdit,
  onApply,
  onDelete,
  onExport,
  onCompare,
  onDrop,
}: {
  state: PanelState
  selected: Set<string>
  onSelect: (ids: Set<string>) => void
  onEdit: (id: string) => void
  onApply: (id: string) => void
  onDelete: (ids: string[]) => void
  onExport: (ids: string[]) => void
  onCompare: (id: string, held: boolean) => void
  onDrop: (files: File[]) => void
}) {
  const [query, setQuery] = useState('')
  const [over, setOver] = useState(false)
  const chooser = useRef<HTMLInputElement>(null)

  const all = Object.entries(state.presets)
  const needle = query.trim().toLowerCase()
  const shown = needle
    ? all.filter(
        ([, preset]) =>
          preset.name.toLowerCase().includes(needle) ||
          shortName(preset.base).toLowerCase().includes(needle),
      )
    : all

  // Every click toggles, so building up a selection needs no modifier anyone has to know about.
  const toggle = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onSelect(next)
  }

  const chosen = [...selected].filter((id) => state.presets[id])

  return (
    <div
      class={over ? 'presets-pane over' : 'presets-pane'}
      onDragOver={(event) => {
        event.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault()
        setOver(false)
        onDrop([...(event.dataTransfer?.files ?? [])])
      }}
    >
      <div class="presets-bar">
        <input
          type="search"
          placeholder="Search presets by name or theme"
          value={query}
          onInput={(event) => setQuery((event.target as HTMLInputElement).value)}
        />
        <span class="presets-count">
          {chosen.length > 0 ? `${chosen.length} selected` : `${all.length} saved`}
        </span>
        <button onClick={() => chooser.current?.click()}>Import</button>
        {/* A file input opens inside the webview, where a drop has to get past VS Code first. */}
        <input
          ref={chooser}
          class="presets-file"
          type="file"
          accept=".json,application/json"
          multiple
          onChange={(event) => {
            const input = event.target as HTMLInputElement
            onDrop([...(input.files ?? [])])
            input.value = ''
          }}
        />
        <button onClick={() => onExport(chosen)} disabled={chosen.length === 0}>
          Export
        </button>
        <button class="danger-text" onClick={() => onDelete(chosen)} disabled={chosen.length === 0}>
          Delete
        </button>
      </div>

      {all.length === 0 ? (
        <div class="presets-empty">
          <h3>No presets yet</h3>
          <p>
            Change any colour on the Colours tab and save, and it lands here. Import brings in
            preset files somebody exported.
          </p>
        </div>
      ) : (
        <div class="preset-grid" role="listbox" aria-multiselectable="true">
          {shown.map(([id, preset]) => {
            const live = state.activePresets[preset.base] === id && preset.base === state.active
            const count = Object.keys(preset.overrides).length
            return (
              <div
                key={id}
                class={selected.has(id) ? 'preset-card on' : 'preset-card'}
                role="option"
                aria-selected={selected.has(id)}
                tabIndex={0}
                onClick={() => toggle(id)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return
                  event.preventDefault()
                  toggle(id)
                }}
              >
                <Preview palette={paletteFor(state, id)} />

                {/* Held, not clicked: it is a look at the miniature, never a change. */}
                <button
                  class="preset-peek"
                  title="Hold to see it in the canvas above"
                  aria-label={`Hold to preview ${preset.name}`}
                  onClick={(event) => event.stopPropagation()}
                  onPointerDown={(event) => {
                    event.stopPropagation()
                    onCompare(id, true)
                  }}
                  onPointerUp={() => onCompare(id, false)}
                  onPointerLeave={() => onCompare(id, false)}
                >
                  <Eye />
                </button>

                <div class="preset-body">
                  <div class="preset-title">
                    <strong>{preset.name}</strong>
                    {live && <span class="tag">In VS Code</span>}
                  </div>
                  <div class="preset-sub">
                    {shortName(preset.base)} · {count} {count === 1 ? 'colour' : 'colours'} ·{' '}
                    {when(preset.updated ?? preset.created)}
                  </div>
                </div>

                {/* The card owns the click, so the buttons have to stop theirs reaching it. */}
                <div class="preset-actions" onClick={(event) => event.stopPropagation()}>
                  <button onClick={() => onEdit(id)}>Edit</button>
                  <button class="apply" onClick={() => onApply(id)} disabled={live}>
                    {live ? 'Applied' : 'Apply'}
                  </button>
                </div>
              </div>
            )
          })}
          {shown.length === 0 && <p class="muted">No preset matches that.</p>}
        </div>
      )}

      {/* VS Code claims a plain drop and opens the file, and holding shift is its own gesture
          for handing the drag to the page. Import is the path that always works. */}
      <p class="presets-drop">
        Use Import, or drop preset files here holding <kbd>shift</kbd>.
      </p>
    </div>
  )
}
