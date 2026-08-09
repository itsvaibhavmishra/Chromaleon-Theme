import { render } from 'preact'

import '@/webview/style.css'
import { useEffect, useState } from 'preact/hooks'

import { Confirm } from '@/components/confirm'
import { Overflow, ThemePicker } from '@/components/menus'
import { Resizer } from '@/components/resizer'
import { RoleDetail } from '@/components/role-detail'
import { RoleList } from '@/components/role-list'
import { CANVAS_DEFAULT, KEEPS_SELECTION, type Tab, TABS } from '@/constants/panel'
import { Canvas } from '@/webview/canvas'
import { clampCanvas, persist, post, restored } from '@/webview/host'
import { type Compare, derive, shortName } from '@/webview/model'
import type { PanelState, ToWebview } from '@/webview/protocol'

function App() {
  // Seeded from the webview's own persisted state so a reload paints immediately rather
  // than flashing empty while the host replies.
  const [state, setState] = useState<PanelState | null>(restored().state ?? null)
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
  const [compare, setCompare] = useState<Compare | null>(null)
  // A name is a label rather than appearance, so it lands on commit instead of waiting behind
  // Save. The id travels with it: posting against whatever the panel happened to be viewing
  // renamed the wrong preset whenever the row menu was opened on another one.
  const [renaming, setRenaming] = useState<{ preset: string; name: string } | null>(null)
  // The preset the confirmation dialog is asking about. Held here rather than in the picker,
  // which closes the moment the dialog opens.
  const [deleting, setDeleting] = useState<string | null>(null)
  const [canvasHeight, setCanvasHeight] = useState(restored().canvasHeight ?? CANVAS_DEFAULT)

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
  const view = derive(state, editing, draft, compare)
  const { viewing, base, label, edits, roles, unsaved, changed, previewing, measured, failing } =
    view
  const viewingPreset = view.preset

  const setRole = (role: string, value: string | null) => {
    const next = { ...edits }
    if (value === null) delete next[role]
    else next[role] = value
    setDraft(next)
  }

  // Saving a draft against a shipped theme forks it: the host decides that, not the panel.
  const save = () =>
    post({ type: 'save', base, preset: viewingPreset ? viewing : null, overrides: edits })

  const activeRole = roles.find((role) => role.id === selected) ?? null

  return (
    <div class="app">
      <header class="context">
        <div class="context-actions">
          <button onClick={save} disabled={!unsaved}>
            {viewingPreset ? 'Save' : 'Save as preset'}
          </button>

          {/* Staged like any other edit, so it needs saving. Writing straight through would
              be the one destructive action in the panel that skipped the draft. */}
          <button onClick={() => setDraft({})} disabled={changed === 0}>
            Reset all
          </button>
          <button
            onPointerDown={() => setCompare({ base: true })}
            onPointerUp={() => setCompare(null)}
            onPointerLeave={() => setCompare(null)}
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
          {renaming === null ? (
            <ThemePicker
              state={state}
              viewing={viewing}
              label={label}
              onPick={(id) => {
                setDraft(null)
                setEditing(id)
              }}
              onCompare={(id, held) => setCompare(held ? { id } : null)}
              onRename={(id) => setRenaming({ preset: id, name: state.presets[id]?.name ?? '' })}
              onDelete={setDeleting}
            />
          ) : (
            <input
              class="rename"
              value={renaming.name}
              ref={(el) => {
                el?.focus()
              }}
              aria-label="Preset name"
              onInput={(event) =>
                setRenaming({ ...renaming, name: (event.target as HTMLInputElement).value })
              }
              onBlur={() => {
                const name = renaming.name.trim()
                if (name) post({ type: 'renamePreset', preset: renaming.preset, name })
                setRenaming(null)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') (event.target as HTMLInputElement).blur()
                else if (event.key === 'Escape') {
                  setRenaming(null)
                  ;(event.target as HTMLInputElement).blur()
                }
              }}
            />
          )}
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
          palette={view.canvas}
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
            ? `${failing} of ${measured} roles below their target`
            : `${measured} of ${measured} roles meet their target`}
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

      {deleting && state.presets[deleting] && (
        <Confirm
          title={`Delete ${state.presets[deleting].name}?`}
          body="Its colours go with it. The theme it was made from is untouched."
          confirm="Delete preset"
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            post({ type: 'deletePreset', preset: deleting })
            // A draft staged against it would otherwise land on whatever the panel falls back to.
            if (viewing === deleting) {
              setEditing(null)
              setDraft(null)
            }
            setDeleting(null)
          }}
        />
      )}
    </div>
  )
}

render(<App />, document.body)
