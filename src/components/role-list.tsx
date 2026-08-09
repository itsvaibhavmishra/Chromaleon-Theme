import { useEffect, useRef } from 'preact/hooks'

import { GROUPS } from '@/constants/panel'
import { Swatch } from '@/components/swatch'
import { conceptFor, isFailing, matches, type RoleView } from '@/webview/model'
import type { Concept } from '@/webview/protocol'

export function RoleRow({ role, on, onPick }: { role: RoleView; on: boolean; onPick: () => void }) {
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

export function RoleChip({
  role,
  on,
  onPick,
}: {
  role: RoleView
  on: boolean
  onPick: () => void
}) {
  return (
    <button class={on ? 'chip on' : 'chip'} onClick={onPick} aria-pressed={on}>
      <Swatch value={role.value} />
      {role.label}
      <span class="chip-count">{role.count}</span>
    </button>
  )
}

export function RoleList({
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
