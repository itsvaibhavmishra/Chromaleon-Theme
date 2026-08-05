import { render } from 'preact'

import './style.css'
import { useEffect, useRef, useState } from 'preact/hooks'

import { contrast } from '../core/color'
import { Canvas } from './canvas'
import type {
  Concept,
  PanelState,
  RoleGroup,
  RoleMeta,
  ThemeOption,
  ToHost,
  ToWebview,
} from './protocol'

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

const GROUPS: RoleGroup[] = ['Surfaces', 'Foregrounds', 'Accent', 'Hue ramp', 'Fixed']
const TABS = ['Colours', 'Settings', 'Presets'] as const
type Tab = (typeof TABS)[number]

interface RoleView extends RoleMeta {
  value: string
  ratio?: number
}

// Resolved in the panel rather than the host, so switching which theme is being edited costs
// nothing: every palette is already here.
function resolve(roles: RoleMeta[], palette: Record<string, string>, accent: string): RoleView[] {
  return roles.map((role) => {
    const value = role.id === 'accent' ? accent : palette[role.id]
    if (role.floor.on === 'none') return { ...role, value }
    const against = role.floor.on === 'accent' ? accent : palette.bg
    return { ...role, value, ratio: contrast(value, against) }
  })
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
  editing,
  onPick,
}: {
  state: PanelState
  editing: string
  onPick: (label: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useDismiss(open, () => setOpen(false))
  const palette = state.palettes[editing]
  const presets: ThemeOption[] = []

  return (
    <div class="picker" ref={ref}>
      <button class="picker-button" onClick={() => setOpen(!open)} aria-expanded={open}>
        <Swatch value={state.accentOverride ?? palette.accent} />
        <span>{shortName(editing)}</span>
        <Chevron />
      </button>

      {open && (
        <div class={presets.length > 0 ? 'menu menu-wide' : 'menu'}>
          <div class="menu-col">
            <h3>Shipped</h3>
            <div class="menu-scroll">
              {state.themes.map((theme) => (
                <button
                  key={theme.label}
                  class={theme.label === editing ? 'menu-item on' : 'menu-item'}
                  onClick={() => {
                    onPick(theme.label)
                    setOpen(false)
                  }}
                >
                  <Swatch value={state.palettes[theme.label].bg} />
                  <span class="menu-name">
                    {shortName(theme.label).replace(HIGH_CONTRAST, '')}
                    {theme.highContrast && <i class="hc">High Contrast</i>}
                  </span>
                  {theme.label === state.active && <span class="tag">In VS Code</span>}
                </button>
              ))}
            </div>
          </div>

          {presets.length > 0 && (
            <div class="menu-col">
              <h3>Yours</h3>
              <div class="menu-scroll" />
            </div>
          )}
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

function RoleRow({ role }: { role: RoleView }) {
  const failing =
    role.ratio !== undefined && role.floor.min !== undefined && role.ratio < role.floor.min
  return (
    <div class="role">
      <Swatch value={role.value} />
      <span class="role-label">{role.label}</span>
      <code class="role-id">{role.id}</code>
      {failing && <span class="role-ratio">{role.ratio!.toFixed(1)}</span>}
      <span class="role-count">{role.count}</span>
    </div>
  )
}

function RoleChip({ role }: { role: RoleView }) {
  return (
    <span class="chip">
      <Swatch value={role.value} />
      {role.label}
      <span class="chip-count">{role.count}</span>
    </span>
  )
}

function RoleList({
  roles,
  concepts,
  query,
}: {
  roles: RoleView[]
  concepts: Concept[]
  query: string
}) {
  const concept = conceptFor(concepts, query)
  // The concept's role is included by id, not by name. Searching "comment" otherwise names
  // Dimmest readable text in the match line and then filters it out of the list underneath,
  // because no role has "comment" anywhere in it. That is the one search people will try.
  const visible = query
    ? roles.filter((role) => matches(role, query) || role.id === concept?.role)
    : roles

  return (
    <div class="list">
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
                  <RoleChip key={role.id} role={role} />
                ))}
              </div>
            ) : (
              inGroup.map((role) => <RoleRow key={role.id} role={role} />)
            )}
          </section>
        )
      })}

      {visible.length === 0 && !concept && <p class="muted">No role matches that.</p>}
    </div>
  )
}

// Splits the canvas from everything below it. Pointer capture keeps the drag on the handle
// even when the pointer outruns it, which is what stops a fast drag from selecting text or
// dropping the gesture over the canvas.
// onResize repaints, onCommit writes it down. Splitting them keeps a drag from persisting
// state on every pointermove, which is sixty writes a second to store one number.
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

function App() {
  // Seeded from the webview's own persisted state so a reload paints immediately rather
  // than flashing empty while the host replies.
  const [state, setState] = useState<PanelState | null>(vscode.getState()?.state ?? null)
  const [editing, setEditing] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('Colours')
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState(false)
  const [showTerminal, setShowTerminal] = useState(false)
  const [canvasHeight, setCanvasHeight] = useState(
    vscode.getState()?.canvasHeight ?? CANVAS_DEFAULT,
  )

  useEffect(() => {
    const onMessage = (event: MessageEvent<ToWebview>) => {
      if (event.data.type !== 'state') return
      setState(event.data.state)
      persist({ state: event.data.state })
    }
    window.addEventListener('message', onMessage)
    post({ type: 'ready' })
    return () => window.removeEventListener('message', onMessage)
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

  // Follows VS Code until the user picks something else here, and never the other way round:
  // switching inside the customizer must not restyle the editor they are working in.
  const current =
    editing && state.palettes[editing] ? editing : (state.active ?? state.themes[0].label)
  const palette = state.palettes[current]
  const accent = state.accentOverride ?? palette.accent
  const roles = resolve(state.roles, palette, accent)

  const measured = roles.filter((role) => role.floor.min !== undefined)
  const failing = measured.filter((role) => role.ratio! < role.floor.min!).length
  const previewing = current !== state.active

  return (
    <div class="app">
      <header class="context">
        <div class="context-actions">
          <button disabled>Save as preset</button>
          <button disabled>Reset all</button>
          <button disabled>Hold to compare</button>
          <Overflow />
        </div>

        <div class="context-theme">
          <span class={previewing ? 'badge badge-preview' : 'badge'}>
            {previewing ? 'PREVIEW ONLY' : 'UNMODIFIED'}
          </span>
          <ThemePicker state={state} editing={current} onPick={setEditing} />
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

        <Canvas palette={palette} collapsed={collapsed} showTerminal={showTerminal} />
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
              <RoleList roles={roles} concepts={state.concepts} query={query} />
            </div>
            <div class="editor-pane">
              <div class="empty">
                <div class="empty-box" />
                <h3>Nothing selected</h3>
                <p>
                  Click anything in the canvas above, or pick a role from the list. Syntax is
                  painted by the nine hues, so clicking a keyword and clicking punctuation can land
                  on the same row.
                </p>
              </div>
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
