import { Arrow } from '@/components/arrow'
import { Overflow, ThemePicker } from '@/components/menus'
import type { History } from '@/utils/history'
import { canRedo, canUndo, redo, undo } from '@/utils/history'
import type { Compare, View } from '@/webview/model'
import { post } from '@/webview/host'
import type { PanelState } from '@/webview/protocol'

type Draft = Record<string, string> | null

// Everything above the miniature: what Save would do, what state the preset is in, and which
// theme is being looked at. It takes the derived view whole rather than fourteen props, since
// every control here is about the same one thing.
export function ContextBar({
  state,
  view,
  drafts,
  renaming,
  onSave,
  onDraft,
  onDrafts,
  onCompare,
  onPick,
  onRenaming,
  onDelete,
}: {
  state: PanelState
  view: View
  drafts: History<Draft>
  renaming: { preset: string; name: string } | null
  onSave: () => void
  onDraft: (next: Draft) => void
  onDrafts: (next: History<Draft>) => void
  onCompare: (next: Compare | null) => void
  onPick: (id: string) => void
  onRenaming: (next: { preset: string; name: string } | null) => void
  onDelete: (id: string) => void
}) {
  const { viewing, base, label, changed, unsaved, previewing } = view
  const viewingPreset = view.preset

  return (
    <header class="context">
      <div class="context-actions">
        <button onClick={onSave} disabled={!unsaved}>
          {viewingPreset ? 'Save' : 'Save as preset'}
        </button>

        {/* Staged like any other edit, so it needs saving. Writing straight through would
            be the one destructive action in the panel that skipped the draft. */}
        <button onClick={() => onDraft({})} disabled={changed === 0}>
          Reset all
        </button>
        <button
          onPointerDown={() => onCompare({ base: true })}
          onPointerUp={() => onCompare(null)}
          onPointerLeave={() => onCompare(null)}
          disabled={changed === 0}
        >
          Hold to compare
        </button>

        <span class="context-history">
          <button
            class="icon-button"
            title="Undo"
            aria-label="Undo"
            disabled={!canUndo(drafts)}
            onClick={() => onDrafts(undo(drafts))}
          >
            <Arrow />
          </button>
          <button
            class="icon-button"
            title="Redo"
            aria-label="Redo"
            disabled={!canRedo(drafts)}
            onClick={() => onDrafts(redo(drafts))}
          >
            <Arrow forward />
          </button>
        </span>
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
            onPick={onPick}
            onCompare={(id, held) => onCompare(held ? { id } : null)}
            onRename={(id) => onRenaming({ preset: id, name: state.presets[id]?.name ?? '' })}
            onDelete={onDelete}
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
              onRenaming({ ...renaming, name: (event.target as HTMLInputElement).value })
            }
            onBlur={() => {
              const name = renaming.name.trim()
              if (name) post({ type: 'renamePreset', preset: renaming.preset, name })
              onRenaming(null)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') (event.target as HTMLInputElement).blur()
              else if (event.key === 'Escape') {
                onRenaming(null)
                ;(event.target as HTMLInputElement).blur()
              }
            }}
          />
        )}
      </div>
    </header>
  )
}
