import { useState } from 'preact/hooks'

import { Chevron } from '@/components/chevron'
import { Row, RowActions } from '@/components/picker-row'
import { Swatch } from '@/components/swatch'
import { useDismiss } from '@/hooks/use-dismiss'
import { post } from '@/webview/host'
import { HIGH_CONTRAST, paletteFor, shortName } from '@/webview/model'
import type { PanelState } from '@/webview/protocol'

export function ThemePicker({
  state,
  viewing,
  label,
  onPick,
  onCompare,
  onRename,
  onDelete,
}: {
  state: PanelState
  viewing: string
  label: string
  onPick: (id: string) => void
  onCompare: (id: string, held: boolean) => void
  onRename: (id: string) => void
  onDelete: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  // Measured off the dots and held here rather than rendered inside the row: the columns scroll,
  // and anything positioned inside that overflow is clipped instead of floating over the list.
  const [actions, setActions] = useState<{ id: string; top: number; right: number } | null>(null)
  const close = () => {
    setOpen(false)
    setActions(null)
  }
  const ref = useDismiss(open, close)
  const mine = Object.entries(state.presets)
  // The background, for the button and every row alike: it is what tells two themes apart at
  // a glance. Read from saved presets, so it moves on save rather than mid-edit.
  const swatch = (id: string) => paletteFor(state, id).bg ?? '#000000'

  const choose = (id: string) => {
    onPick(id)
    close()
  }

  // A shipped theme is not ours to rename or delete, so it simply gets no such item.
  const ours = (id: string, act: () => void) =>
    state.presets[id]
      ? () => {
          act()
          close()
        }
      : undefined

  const toggle = (id: string, anchor: HTMLElement) => {
    if (actions?.id === id || !ref.current) return setActions(null)
    const dots = anchor.getBoundingClientRect()
    const frame = ref.current.getBoundingClientRect()
    setActions({ id, top: dots.bottom - frame.top + 2, right: frame.right - dots.right })
  }

  return (
    <div class="picker" ref={ref}>
      <button
        class="picker-button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
      >
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
              {/* Scrolling would leave a menu measured against the old position behind. */}
              <div class="menu-scroll" onScroll={() => setActions(null)}>
                {mine.map(([id, preset]) => (
                  <Row
                    key={id}
                    selected={id === viewing}
                    expanded={actions?.id === id}
                    onPick={() => choose(id)}
                    onToggle={(anchor) => toggle(id, anchor)}
                  >
                    <Swatch value={swatch(id)} />
                    <span class="menu-name">
                      {preset.name}
                      <i class="hc">from {shortName(preset.base).replace(HIGH_CONTRAST, '')}</i>
                    </span>
                    {state.activePresets[preset.base] === id && preset.base === state.active && (
                      <span class="tag">In VS Code</span>
                    )}
                  </Row>
                ))}
              </div>
            </div>
          )}

          <div class="menu-col">
            <h3>Shipped</h3>
            <div class="menu-scroll" onScroll={() => setActions(null)}>
              {state.themes.map((theme) => (
                <Row
                  key={theme.label}
                  selected={theme.label === viewing}
                  expanded={actions?.id === theme.label}
                  onPick={() => choose(theme.label)}
                  onToggle={(anchor) => toggle(theme.label, anchor)}
                >
                  <Swatch value={swatch(theme.label)} />
                  <span class="menu-name">
                    {shortName(theme.label).replace(HIGH_CONTRAST, '')}
                    {theme.highContrast && <i class="hc">High Contrast</i>}
                  </span>
                  {theme.label === state.active && !state.activePresets[theme.label] && (
                    <span class="tag">In VS Code</span>
                  )}
                </Row>
              ))}
            </div>
          </div>
        </div>
      )}

      {open && actions && (
        <RowActions
          top={actions.top}
          right={actions.right}
          onCompare={(held) => onCompare(actions.id, held)}
          onRename={ours(actions.id, () => onRename(actions.id))}
          onDelete={ours(actions.id, () => onDelete(actions.id))}
        />
      )}
    </div>
  )
}

export function Overflow() {
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
