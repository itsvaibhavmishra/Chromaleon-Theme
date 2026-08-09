import type { ComponentChildren } from 'preact'

export function RowActions({
  top,
  right,
  onCompare,
  onRename,
  onDelete,
}: {
  top: number
  right: number
  onCompare: (held: boolean) => void
  onRename?: () => void
  onDelete?: () => void
}) {
  return (
    <div class="row-menu" style={{ top: `${top}px`, right: `${right}px` }}>
      <button
        onPointerDown={() => onCompare(true)}
        onPointerUp={() => onCompare(false)}
        onPointerLeave={() => onCompare(false)}
      >
        Hold to compare
      </button>
      {onRename && <button onClick={onRename}>Rename</button>}
      {onDelete && (
        <>
          <hr />
          <button class="danger" onClick={onDelete}>
            Delete
          </button>
        </>
      )}
    </div>
  )
}

// One row for both columns. The highlight lives on the line rather than the naming button, so
// the dots sit inside it instead of alongside.
export function Row({
  selected,
  expanded,
  onPick,
  onToggle,
  children,
}: {
  selected: boolean
  expanded: boolean
  onPick: () => void
  onToggle: (anchor: HTMLElement) => void
  children: ComponentChildren
}) {
  return (
    <div class={selected ? 'row-line on' : 'row-line'}>
      <button class="menu-item" onClick={onPick}>
        {children}
      </button>
      <button
        class="row-more"
        title="More actions"
        aria-expanded={expanded}
        onClick={(event) => onToggle(event.currentTarget)}
      >
        &#8943;
      </button>
    </div>
  )
}
