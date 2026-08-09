import { render } from 'preact'

import '@/webview/style.css'
import { useEffect, useRef, useState } from 'preact/hooks'

import { contrast, hsl, toHsl } from '@/core/color'
import { Canvas } from '@/webview/canvas'
import type {
  Concept,
  PanelState,
  RoleGroup,
  PresetView,
  RoleMeta,
  ToHost,
  ToWebview,
} from '@/webview/protocol'

/** Survives a reload. Everything here is the panel's own, never the user's settings. */
interface Persisted {
  state?: PanelState
  canvasHeight?: number
}

// Injected by VS Code into every webview. Also the only channel to the host.
declare function acquireVsCodeApi(): {
  postMessage(message: ToHost): void
  getState(): Persisted | undefined
  setState(value: Persisted): void
}

const vscode = acquireVsCodeApi()

function post(message: ToHost) {
  vscode.postMessage(message)
}

// Merges rather than replaces, so persisting the canvas height cannot drop the cached state
// the panel repaints from on reload, or the other way round.
function persist(patch: Partial<Persisted>) {
  vscode.setState({ ...(vscode.getState() ?? {}), ...patch })
}

const CANVAS_DEFAULT = 300
const CANVAS_MIN = 150
/** Leaves the list and the editor a workable share no matter how far the handle is dragged. */
const LOWER_MIN = 220

const clampCanvas = (height: number) =>
  Math.max(CANVAS_MIN, Math.min(height, window.innerHeight - LOWER_MIN))

// Regions that own a click; anywhere else clears the selection. The detail pane is here
// because it is the selection, and the resizer because a drag ends in a click.
const KEEPS_SELECTION = '.canvas, .list-pane, .detail, .resizer, .menu, button, input'

const GROUPS: RoleGroup[] = ['Surfaces', 'Foregrounds', 'Accent', 'Hue ramp', 'Fixed']
const TABS = ['Colours', 'Settings', 'Presets'] as const
type Tab = (typeof TABS)[number]

interface RoleView extends RoleMeta {
  value: string
  ratio?: number
  /** Everything it paints, keys and scopes together. */
  count: number
  /** True when this is the user's colour rather than the one the theme ships. */
  edited: boolean
}

// Resolved in the panel rather than the host, so switching which theme is being edited costs
// nothing: every palette is already here.
function resolve(
  roles: RoleMeta[],
  palette: Record<string, string>,
  accent: string,
  edits: Record<string, string>,
): RoleView[] {
  return roles.map((role) => {
    const edited = edits[role.id]
    const value = edited ?? (role.id === 'accent' ? accent : palette[role.id])
    const count = role.keys.length + role.scopes.length
    const view = { ...role, value, count, edited: edited !== undefined }
    if (role.floor.on === 'none') return view
    const against = role.floor.on === 'accent' ? accent : palette.bg
    return { ...view, ratio: contrast(value, against) }
  })
}

const HEX = /^#[0-9a-fA-F]{6}$/

const same = (a: Record<string, string>, b: Record<string, string>) => {
  const keys = Object.keys(a)
  return keys.length === Object.keys(b).length && keys.every((k) => a[k] === b[k])
}

// What a preset or a shipped theme actually renders at. `palettes` is keyed by shipped label
// only, so looking a preset id up in it directly returns nothing and every swatch goes black.
function paletteFor(state: PanelState, id: string): Record<string, string> {
  const preset = state.presets[id]
  const shipped = state.palettes[preset ? preset.base : id] ?? {}
  return preset ? { ...shipped, ...preset.overrides } : shipped
}

const HIGH_CONTRAST = ' High Contrast'
const shortName = (label: string) => label.replace(/^Chromaleon /, '')

function matches(role: RoleMeta, query: string): boolean {
  const q = query.toLowerCase()
  return role.label.toLowerCase().includes(q) || role.id.toLowerCase().includes(q)
}

// A concept is a way in, not a row. Typing "comment" names the role that paints comments
// rather than implying a Comment role the theme does not have.
function conceptFor(concepts: Concept[], query: string): Concept | undefined {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return undefined
  return concepts.find((concept) => concept.term.startsWith(q))
}

function Swatch({ value }: { value: string }) {
  return <span class="swatch" style={{ background: value }} />
}

function Chevron() {
  return (
    <svg viewBox="0 0 16 16" class="chev" fill="none" stroke="currentColor" stroke-width="1.4">
      <path d="M4 6l4 4 4-4" />
    </svg>
  )
}

/** Closes a popover on an outside click or Escape, which is what both are expected to do. */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) close()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close])
  return ref
}

function ThemePicker({
  state,
  viewing,
  label,
  onPick,
}: {
  state: PanelState
  viewing: string
  label: string
  onPick: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useDismiss(open, () => setOpen(false))
  const mine = Object.entries(state.presets)
  // The background, for the button and every row alike: it is what tells two themes apart at
  // a glance. Read from saved presets, so it moves on save rather than mid-edit.
  const swatch = (id: string) => paletteFor(state, id).bg ?? '#000000'

  const choose = (id: string) => {
    onPick(id)
    setOpen(false)
  }

  return (
    <div class="picker" ref={ref}>
      <button class="picker-button" onClick={() => setOpen(!open)} aria-expanded={open}>
        <Swatch value={swatch(viewing)} />
        <span>{label}</span>
        <Chevron />
      </button>

      {open && (
        <div class={mine.length > 0 ? 'menu menu-wide' : 'menu'}>
          {/* Yours first: once you have made one, it is what you came back for. */}
          {mine.length > 0 && (
            <div class="menu-col">
              <h3>Yours</h3>
              <div class="menu-scroll">
                {mine.map(([id, preset]) => (
                  <button
                    key={id}
                    class={id === viewing ? 'menu-item on' : 'menu-item'}
                    onClick={() => choose(id)}
                  >
                    <Swatch value={swatch(id)} />
                    <span class="menu-name">
                      {preset.name}
                      <i class="hc">from {shortName(preset.base).replace(HIGH_CONTRAST, '')}</i>
                    </span>
                    {state.activePresets[preset.base] === id && preset.base === state.active && (
                      <span class="tag">In VS Code</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div class="menu-col">
            <h3>Shipped</h3>
            <div class="menu-scroll">
              {state.themes.map((theme) => (
                <button
                  key={theme.label}
                  class={theme.label === viewing ? 'menu-item on' : 'menu-item'}
                  onClick={() => choose(theme.label)}
                >
                  <Swatch value={swatch(theme.label)} />
                  <span class="menu-name">
                    {shortName(theme.label).replace(HIGH_CONTRAST, '')}
                    {theme.highContrast && <i class="hc">High Contrast</i>}
                  </span>
                  {theme.label === state.active && !state.activePresets[theme.label] && (
                    <span class="tag">In VS Code</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Overflow() {
  const [open, setOpen] = useState(false)
  const ref = useDismiss(open, () => setOpen(false))
  return (
    <div class="overflow" ref={ref}>
      <button class="icon-button" onClick={() => setOpen(!open)} title="More actions">
        &#8943;
      </button>
      {open && (
        <div class="menu menu-small">
          <button class="menu-item" disabled>
            Import theme file
          </button>
          <button class="menu-item" disabled>
            Export current theme
          </button>
          <hr />
          <button
            class="menu-item"
            onClick={() => {
              post({ type: 'openSettings' })
              setOpen(false)
            }}
          >
            Chromaleon settings
          </button>
        </div>
      )}
    </div>
  )
}

function isFailing(role: RoleView): boolean {
  return role.ratio !== undefined && role.floor.min !== undefined && role.ratio < role.floor.min
}

function RoleRow({ role, on, onPick }: { role: RoleView; on: boolean; onPick: () => void }) {
  return (
    <button class={on ? 'role on' : 'role'} onClick={onPick} aria-pressed={on}>
      <Swatch value={role.value} />
      <span class="role-label">{role.label}</span>
      <code class="role-id">{role.id}</code>
      {isFailing(role) && <span class="role-ratio">{role.ratio!.toFixed(1)}</span>}
      <span class="role-count">{role.count}</span>
    </button>
  )
}

function RoleChip({ role, on, onPick }: { role: RoleView; on: boolean; onPick: () => void }) {
  return (
    <button class={on ? 'chip on' : 'chip'} onClick={onPick} aria-pressed={on}>
      <Swatch value={role.value} />
      {role.label}
      <span class="chip-count">{role.count}</span>
    </button>
  )
}

function RoleList({
  roles,
  concepts,
  query,
  selected,
  onPick,
}: {
  roles: RoleView[]
  concepts: Concept[]
  query: string
  selected: string | null
  onPick: (role: string) => void
}) {
  const listRef = useRef<HTMLDivElement>(null)
  const concept = conceptFor(concepts, query)
  // Concept and selection are included by id. Otherwise searching "comment" names Dimmest
  // readable text and then filters that very row out, since no role contains the word.
  const visible = query
    ? roles.filter(
        (role) => matches(role, query) || role.id === concept?.role || role.id === selected,
      )
    : roles

  // Centre a row picked in the canvas, since it is usually off screen and an edge reads as
  // the end of the list. Only when off screen, or the list jumps under your own click.
  useEffect(() => {
    if (!selected) return
    const row = listRef.current?.querySelector('.on')
    if (!row) return
    const rowBox = row.getBoundingClientRect()
    const listBox = listRef.current!.getBoundingClientRect()
    if (rowBox.top < listBox.top || rowBox.bottom > listBox.bottom) {
      row.scrollIntoView({ block: 'center' })
    }
  }, [selected])

  return (
    <div class="list" ref={listRef}>
      {concept && (
        <div class="match">
          <span class="match-tag">MATCH</span>
          {concept.reads}
        </div>
      )}

      {GROUPS.map((group) => {
        const inGroup = visible.filter((role) => role.group === group)
        if (inGroup.length === 0) return null
        const chips = group === 'Hue ramp' || group === 'Fixed'
        return (
          <section key={group}>
            <h2>
              {group === 'Fixed' ? 'Fixed, not editable' : group}
              <span class="group-count">{inGroup.length}</span>
            </h2>
            {chips ? (
              <div class="chips">
                {inGroup.map((role) => (
                  <RoleChip
                    key={role.id}
                    role={role}
                    on={role.id === selected}
                    onPick={() => onPick(role.id)}
                  />
                ))}
              </div>
            ) : (
              inGroup.map((role) => (
                <RoleRow
                  key={role.id}
                  role={role}
                  on={role.id === selected}
                  onPick={() => onPick(role.id)}
                />
              ))
            )}
          </section>
        )
      })}

      {visible.length === 0 && !concept && <p class="muted">No role matches that.</p>}
    </div>
  )
}

// Pointer capture keeps a fast drag on the handle rather than selecting text behind it.
// onResize repaints, onCommit writes: otherwise a drag persists sixty times a second.
function Resizer({
  height,
  onResize,
  onCommit,
}: {
  height: number
  onResize: (next: number) => void
  onCommit: (next: number) => void
}) {
  const drag = (event: PointerEvent) => {
    const handle = event.currentTarget as HTMLElement
    const startY = event.clientY
    const startHeight = height
    let latest = height
    handle.setPointerCapture(event.pointerId)

    const move = (moved: PointerEvent) => {
      latest = clampCanvas(startHeight + moved.clientY - startY)
      onResize(latest)
    }
    const stop = () => {
      handle.releasePointerCapture(event.pointerId)
      handle.removeEventListener('pointermove', move)
      handle.removeEventListener('pointerup', stop)
      onCommit(latest)
    }
    handle.addEventListener('pointermove', move)
    handle.addEventListener('pointerup', stop)
  }

  return (
    <div
      class="resizer"
      role="separator"
      aria-orientation="horizontal"
      aria-label="Resize the canvas"
      tabIndex={0}
      onPointerDown={drag}
      onDblClick={() => onCommit(CANVAS_DEFAULT)}
      onKeyDown={(event) => {
        if (event.key === 'ArrowUp') onCommit(clampCanvas(height - 16))
        else if (event.key === 'ArrowDown') onCommit(clampCanvas(height + 16))
        else return
        event.preventDefault()
      }}
    >
      <span />
    </div>
  )
}

// Reads the contrast as a relationship rather than a bare number. A ratio on its own means
// nothing to someone who does not already know the floor it is being held to.
function contrastLine(role: RoleView): string {
  if (role.floor.on === 'none') {
    return 'No floor of its own. Other roles are measured against this one.'
  }
  const surface = role.floor.on === 'accent' ? 'the accent' : 'the editor background'
  const reads = `Reads at ${role.ratio!.toFixed(1)}:1 on ${surface}.`
  return isFailing(role)
    ? `${reads} Below its ${role.floor.min}:1 target.`
    : `${reads} Clears its ${role.floor.min}:1 target.`
}

// Primary text paints 70 things and nobody reads 70 identifiers. The canvas answers "where"
// better anyway, by ringing every region the role touches.
const KEY_PREVIEW = 6

// Saturation across, lightness down, hue on its own slider. HSL throughout, because the
// palettes are authored in HSL and the square should move the axes they were designed on.
function Picker({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  // Held here rather than re-derived from the hex every frame. A grey has no hue to read
  // back, so dragging to the left edge would otherwise snap the whole square to red.
  const [[h, s, l], setHsl] = useState(() => toHsl(value))
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
      const x = Math.min(1, Math.max(0, (at.clientX - rect.left) / rect.width))
      const y = Math.min(1, Math.max(0, (at.clientY - rect.top) / rect.height))
      emit([h, x * 100, (1 - y) * 100])
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
      <div class="sv" ref={square} onPointerDown={drag} style={{ '--hue': hsl(h, 100, 50) }}>
        <span class="sv-dot" style={{ left: `${s}%`, top: `${100 - l}%`, background: value }} />
      </div>
      <input
        class="hue"
        type="range"
        min="0"
        max="359"
        value={Math.round(h)}
        aria-label="Hue"
        onInput={(event) => emit([Number((event.target as HTMLInputElement).value), s, l])}
      />
    </div>
  )
}

// Committed on Enter or blur rather than per keystroke: "#ff" is not a colour, and writing
// one per character would churn the draft a dozen times a word. Escape abandons the edit.
function HexField({ role, onCommit }: { role: RoleView; onCommit: (value: string) => void }) {
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

function RoleDetail({
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

function App() {
  // Seeded from the webview's own persisted state so a reload paints immediately rather
  // than flashing empty while the host replies.
  const [state, setState] = useState<PanelState | null>(vscode.getState()?.state ?? null)
  const [editing, setEditing] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('Colours')
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState(false)
  const [showTerminal, setShowTerminal] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  // Edits live here until saved, and nothing the panel does reaches the editor on its own.
  // Null means untouched; once set it is the complete override set, not a layer over the
  // saved one, so a draft can remove a saved colour as well as add one.
  const [draft, setDraft] = useState<Record<string, string> | null>(null)
  const [comparing, setComparing] = useState(false)
  const [canvasHeight, setCanvasHeight] = useState(
    vscode.getState()?.canvasHeight ?? CANVAS_DEFAULT,
  )

  useEffect(() => {
    const onMessage = (event: MessageEvent<ToWebview>) => {
      // Saving a shipped theme forks it, so follow the panel onto the preset that now holds
      // the edits. The draft is left alone: it matches what was just saved, and clearing it
      // before the new state arrives would flash the canvas back to the base.
      if (event.data.type === 'saved') return setEditing(event.data.preset)
      if (event.data.type !== 'state') return
      setState(event.data.state)
      persist({ state: event.data.state })
    }
    window.addEventListener('message', onMessage)
    post({ type: 'ready' })
    return () => window.removeEventListener('message', onMessage)
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelected(null)
    }
    const onClick = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest(KEEPS_SELECTION)) setSelected(null)
    }
    window.addEventListener('keydown', onKey)
    document.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('click', onClick)
    }
  }, [])

  // The window can shrink below whatever height was dragged, or restored from a wider one.
  useEffect(() => {
    const onResize = () => setCanvasHeight((current) => clampCanvas(current))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const commit = (next: number) => {
    setCanvasHeight(next)
    persist({ canvasHeight: next })
  }

  if (!state) return <p class="muted">Loading</p>
  if (state.themes.length === 0) return <p class="muted">No themes available.</p>

  // A preset id or a shipped theme label. Follows VS Code until you pick something here, and
  // never the other way round: switching in the panel must not restyle the editor.
  const fallback = state.active ?? state.themes[0].label
  const suggested = state.active ? (state.activePresets[state.active] ?? state.active) : fallback
  const viewing =
    editing && (state.presets[editing] || state.palettes[editing]) ? editing : suggested

  const viewingPreset = state.presets[viewing] as PresetView | undefined
  const base = viewingPreset ? viewingPreset.base : viewing
  const palette = state.palettes[base] ?? state.palettes[fallback]
  const accent = state.accentOverride ?? palette.accent
  const saved = viewingPreset ? viewingPreset.overrides : {}
  // Compare is a view state and must not reach this, or holding it would make Save write an
  // empty set and disable the compare button out from under the hold.
  const edits = draft ?? saved
  const roles = resolve(state.roles, palette, accent, edits)

  const unsaved = draft !== null && !same(draft, saved)
  const changed = Object.keys(edits).length

  const setRole = (role: string, value: string | null) => {
    const next = { ...edits }
    if (value === null) delete next[role]
    else next[role] = value
    setDraft(next)
  }

  // Saving a draft against a shipped theme forks it: the host decides that, not the panel.
  const save = () =>
    post({ type: 'save', base, preset: viewingPreset ? viewing : null, overrides: edits })

  const label = viewingPreset ? viewingPreset.name : shortName(base)
  const activeRole = roles.find((role) => role.id === selected) ?? null
  const measured = roles.filter((role) => role.floor.min !== undefined)
  const failing = measured.filter((role) => role.ratio! < role.floor.min!).length
  // Previewing means the editor is not showing what the panel is: either a different base,
  // or a preset that is not the one switched on for it.
  const previewing =
    base !== state.active || state.activePresets[base] !== (viewingPreset ? viewing : undefined)

  return (
    <div class="app">
      <header class="context">
        <div class="context-actions">
          <button onClick={save} disabled={!unsaved}>
            {viewingPreset ? 'Save' : 'Save as preset'}
          </button>
          <button
            onClick={() => viewingPreset && post({ type: 'deletePreset', preset: viewing })}
            disabled={!viewingPreset}
          >
            Delete preset
          </button>
          {/* Staged like any other edit, so it needs saving. Writing straight through would
              be the one destructive action in the panel that skipped the draft. */}
          <button onClick={() => setDraft({})} disabled={changed === 0}>
            Reset all
          </button>
          <button
            onPointerDown={() => setComparing(true)}
            onPointerUp={() => setComparing(false)}
            onPointerLeave={() => setComparing(false)}
            disabled={changed === 0}
          >
            Hold to compare
          </button>
          <Overflow />
        </div>

        <div class="context-theme">
          {!viewingPreset && <span class="badge">READ ONLY</span>}
          {unsaved && <span class="badge badge-unsaved">UNSAVED</span>}
          {!unsaved && viewingPreset && (
            <span class={changed > 0 ? 'badge badge-edited' : 'badge'}>
              {changed > 0 ? `CHANGED · ${changed}` : 'UNMODIFIED'}
            </span>
          )}
          {previewing && <span class="badge badge-preview">PREVIEW ONLY</span>}
          {previewing && (
            <button
              class="apply"
              onClick={() =>
                post({ type: 'applyTheme', base, preset: viewingPreset ? viewing : null })
              }
              disabled={unsaved}
              title={unsaved ? 'Save first' : undefined}
            >
              Apply theme
            </button>
          )}
          <ThemePicker
            state={state}
            viewing={viewing}
            label={label}
            onPick={(id) => {
              setDraft(null)
              setEditing(id)
            }}
          />
        </div>
      </header>

      <section
        class={collapsed ? 'canvas-region collapsed' : 'canvas-region'}
        style={collapsed ? undefined : { height: `${canvasHeight}px` }}
      >
        <aside class="reveal">
          <h2>Show in canvas</h2>
          <button
            class={showTerminal ? 'reveal-on' : ''}
            onClick={() => setShowTerminal(!showTerminal)}
          >
            Terminal
          </button>
          <p class="muted">
            The rest of the window is always drawn. Only the terminal is worth the room it costs.
          </p>
          <button class="collapse" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? 'Expand' : 'Collapse'}
          </button>
        </aside>

        {/* The one place compare applies: it shows the theme as it ships, dropping the draft
            and anything already saved rather than only the unsaved half. */}
        <Canvas
          palette={{ ...palette, accent, ...(comparing ? {} : edits) }}
          collapsed={collapsed}
          showTerminal={showTerminal}
          selected={selected}
          onPick={setSelected}
        />
      </section>

      {/* Collapsed the canvas is a fixed strip, so there is nothing left to drag. */}
      {!collapsed && <Resizer height={canvasHeight} onResize={setCanvasHeight} onCommit={commit} />}

      <nav class="tabs">
        {TABS.map((name) => (
          <button key={name} class={name === tab ? 'on' : ''} onClick={() => setTab(name)}>
            {name}
          </button>
        ))}
      </nav>

      <main class="lower">
        {tab === 'Colours' ? (
          <>
            <div class="list-pane">
              <input
                type="search"
                placeholder="Search roles, or what they paint"
                value={query}
                onInput={(event) => setQuery((event.target as HTMLInputElement).value)}
              />
              <RoleList
                roles={roles}
                concepts={state.concepts}
                query={query}
                selected={selected}
                onPick={setSelected}
              />
            </div>
            <div class="editor-pane">
              {activeRole ? (
                <RoleDetail
                  role={activeRole}
                  concepts={state.concepts}
                  onClear={() => setSelected(null)}
                  onEdit={(value) => setRole(activeRole.id, value)}
                  onRevert={() => setRole(activeRole.id, null)}
                />
              ) : (
                <div class="empty">
                  <div class="empty-box" />
                  <h3>Nothing selected</h3>
                  <p>
                    Click anything in the canvas above, or pick a role from the list. Syntax is
                    painted by the nine hues, so clicking a keyword and clicking punctuation can
                    land on the same row.
                  </p>
                  {!viewingPreset && (
                    <p class="empty-note">
                      This is a shipped theme, so it cannot be changed. Editing a colour copies it
                      into a preset of your own first.
                    </p>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div class="empty">
            <div class="empty-box" />
            <h3>{tab}</h3>
            <p>Not built yet. The shape is settled, the controls come next.</p>
          </div>
        )}
      </main>

      <footer class="status">
        <span class={failing > 0 ? 'dot warn' : 'dot ok'} />
        <span>
          {failing > 0
            ? `${failing} of ${measured.length} roles below their target`
            : `${measured.length} of ${measured.length} roles meet their target`}
        </span>
        {previewing &&
          (state.active ? (
            <span class="muted status-note">
              Previewing. VS Code is still showing {shortName(state.active)}.
            </span>
          ) : (
            <span class="status-note">
              <span class="muted">No Chromaleon theme is active in VS Code. </span>
              <button class="link" onClick={() => post({ type: 'pickTheme' })}>
                Choose one
              </button>
            </span>
          ))}
      </footer>
    </div>
  )
}

render(<App />, document.body)
