import { render } from 'preact'

import '@/webview/style.css'
import { useEffect, useState } from 'preact/hooks'

import { Confirm } from '@/components/confirm'
import { ContextBar } from '@/components/context-bar'
import { ImportReview } from '@/components/import-review'
import { Resizer } from '@/components/resizer'
import { RoleDetail } from '@/components/role-detail'
import { RoleList } from '@/components/role-list'
import { PresetsPane } from '@/components/presets-pane'
import { SettingsPane } from '@/components/settings-pane'
import { CANVAS_DEFAULT, KEEPS_SELECTION, type Tab, TABS } from '@/constants/panel'
import { Canvas, type CanvasSettings } from '@/webview/canvas'
import { clampCanvas, persist, post, restored } from '@/webview/host'
import { record, redo, started, undo } from '@/utils/history'
import {
  type PortablePreset,
  presetSignature,
  readPresetFile,
  type ReadResult,
} from '@/utils/preset-file'
import { type Compare, derive, shortName } from '@/webview/model'
import type { Layout, PanelState, ToWebview } from '@/webview/protocol'

// Reading happens here rather than in the pane so the pane stays a view of a decided result.
async function readDropped(files: File[], bases: string[]): Promise<ReadResult[]> {
  return Promise.all(files.map(async (file) => readPresetFile(file.name, await file.text(), bases)))
}

const portable = (state: PanelState, id: string): PortablePreset => ({
  name: state.presets[id].name,
  base: state.presets[id].base,
  overrides: state.presets[id].overrides,
  created: state.presets[id].created,
  updated: state.presets[id].updated,
})

function App() {
  // Seeded from the webview's own persisted state so a reload paints immediately rather
  // than flashing empty while the host replies.
  const [state, setState] = useState<PanelState | null>(restored().state ?? null)
  const [editing, setEditing] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('Colours')
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState(false)
  const [showTerminal, setShowTerminal] = useState(false)
  // Null follows the running workbench; set, it holds the other one for a look ahead.
  const [previewLayout, setPreviewLayout] = useState<Layout | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  // Edits live here until saved, and nothing the panel does reaches the editor on its own.
  // Null means untouched; once set it is the complete override set, not a layer over the
  // saved one, so a draft can remove a saved colour as well as add one.
  const [drafts, setDrafts] = useState(started<Record<string, string> | null>(null))
  const draft = drafts.present
  const setDraft = (next: Record<string, string> | null) => setDrafts(record(drafts, next))
  const [compare, setCompare] = useState<Compare | null>(null)
  // A name is a label rather than appearance, so it lands on commit instead of waiting behind
  // Save. The id travels with it: posting against whatever the panel happened to be viewing
  // renamed the wrong preset whenever the row menu was opened on another one.
  const [renaming, setRenaming] = useState<{ preset: string; name: string } | null>(null)
  // The preset the confirmation dialog is asking about. Held here rather than in the picker,
  // which closes the moment the dialog opens.
  const [deleting, setDeleting] = useState<string | null>(null)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [dropped, setDropped] = useState<ReadResult[] | null>(null)
  const [purging, setPurging] = useState<string[] | null>(null)
  const [canvasHeight, setCanvasHeight] = useState(restored().canvasHeight ?? CANVAS_DEFAULT)

  useEffect(() => {
    const onMessage = (event: MessageEvent<ToWebview>) => {
      // Saving a shipped theme forks it, so follow the panel onto the preset that now holds
      // the edits. The draft is left alone: it matches what was just saved, and clearing it
      // before the new state arrives would flash the canvas back to the base.
      if (event.data.type === 'saved') return setEditing(event.data.preset)
      if (event.data.type !== 'state') return
      // A fresh panel has no store of its own, so the host's copy is the only one there is.
      if (restored().canvasHeight === undefined) {
        setCanvasHeight(clampCanvas(event.data.state.canvasHeight))
      }
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
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') return
      // Typing a hex has its own undo stack, and stealing it mid-edit would be maddening.
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, [contenteditable]')) return
      event.preventDefault()
      setDrafts((current) => (event.shiftKey ? redo(current) : undo(current)))
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
    post({ type: 'setCanvasHeight', height: next })
  }

  if (!state) return <p class="muted">Loading</p>
  if (state.themes.length === 0) return <p class="muted">No themes available.</p>

  // A preset id or a shipped theme label. Follows VS Code until you pick something here, and
  // never the other way round: switching in the panel must not restyle the editor.
  const view = derive(state, editing, draft, compare)
  const { viewing, base, edits, roles, measured, failing, previewing } = view
  // Follows the running workbench until the toggle is pressed, so a rollout moves it too.
  const layout = previewLayout ?? state.layout
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
  const bases = state.themes.map((theme) => theme.label)

  // The miniature answers "what will this look like", so the settings that change surfaces
  // belong in it as much as the colours do.
  const canvasSettings = (values: Record<string, string | boolean>): CanvasSettings => ({
    italics: values.italics !== false,
    currentLine: String(values.currentLine ?? 'outline'),
    tabIndicator: String(values.tabIndicator ?? 'bottom'),
    tabBar: String(values.tabBar ?? 'flat'),
    borders: String(values.borders ?? 'none'),
    selectionStyle: String(values.selectionStyle ?? 'room'),
    cursorStyle: String(values.cursorStyle ?? 'theme'),
    accentedStatusBar: values.accentedStatusBar === true,
    shadows: values.shadows !== false,
    accentFolders: values.accentFolders === true,
    hideExplorerArrows: values.hideExplorerArrows === true,
  })

  return (
    <div class="app">
      <ContextBar
        state={state}
        view={view}
        drafts={drafts}
        renaming={renaming}
        onSave={save}
        onDraft={setDraft}
        onDrafts={setDrafts}
        onCompare={setCompare}
        onPick={(id) => {
          setDraft(null)
          setEditing(id)
        }}
        onRenaming={setRenaming}
        onDelete={setDeleting}
      />

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
          {/* Names the layout on show, so the button and the miniature never disagree. */}
          <button
            class={layout === state.layout ? 'reveal-on' : ''}
            onClick={() => setPreviewLayout(layout === 'modern' ? 'classic' : 'modern')}
          >
            {layout === 'modern' ? 'Modern Layout' : 'Classic Layout'}
            {layout === state.layout && <span class="reveal-tag">active</span>}
          </button>
          <p class="muted">
            The rest of the window is always drawn. VS Code is rolling the modern workbench out, so
            this starts on whichever one you are running.
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
          layout={layout}
          settings={canvasSettings(state.settingValues)}
          icons={state.treeIcons}
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
                  backdrop={activeRole.floor.on === 'accent' ? view.accent : view.palette.bg}
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
        ) : tab === 'Presets' ? (
          <PresetsPane
            state={state}
            selected={picked}
            onSelect={setPicked}
            onEdit={(id) => {
              setDraft(null)
              setEditing(id)
              setTab('Colours')
            }}
            onApply={(id) => post({ type: 'applyTheme', base: state.presets[id].base, preset: id })}
            onDelete={setPurging}
            onExport={(ids) =>
              post({ type: 'exportPresets', presets: ids.map((id) => portable(state, id)) })
            }
            onCompare={(id, held) => setCompare(held ? { id } : null)}
            onDrop={(files) => {
              void readDropped(files, bases).then(setDropped)
            }}
          />
        ) : (
          <SettingsPane
            settings={state.settings}
            values={state.settingValues}
            themeAccent={view.palette.accent ?? ''}
            // The running workbench, never the previewed one: it decides what is inert.
            layout={state.layout}
            onChange={(key, value) => post({ type: 'setSetting', key, value })}
          />
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

      {dropped && (
        <ImportReview
          read={dropped}
          existing={new Set(Object.values(state.presets).map(presetSignature))}
          onCancel={() => setDropped(null)}
          onConfirm={(chosen) => {
            const presets = chosen.map(
              ({ file, index }) => dropped.find((result) => result.file === file)!.presets[index],
            )
            post({ type: 'importPresets', presets })
            setDropped(null)
          }}
        />
      )}

      {purging && purging.length > 0 && (
        <Confirm
          title={purging.length === 1 ? 'Delete this preset?' : `Delete ${purging.length} presets?`}
          body="Their colours go with them. The themes they were made from are untouched."
          confirm={purging.length === 1 ? 'Delete preset' : `Delete ${purging.length}`}
          onCancel={() => setPurging(null)}
          onConfirm={() => {
            for (const id of purging) post({ type: 'deletePreset', preset: id })
            setPicked(new Set())
            setPurging(null)
          }}
        />
      )}

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
