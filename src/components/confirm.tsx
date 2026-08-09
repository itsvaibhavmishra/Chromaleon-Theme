import { useEffect, useRef } from 'preact/hooks'

export function Confirm({
  title,
  body,
  confirm,
  onConfirm,
  onCancel,
}: {
  title: string
  body: string
  confirm: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const cancel = useRef<HTMLButtonElement>(null)

  // Focus lands on Cancel, so Enter on a dialog nobody read does the harmless thing.
  useEffect(() => {
    cancel.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div class="scrim" onClick={onCancel}>
      <div
        class="dialog"
        role="alertdialog"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <h2>{title}</h2>
        <p class="muted">{body}</p>
        <div class="dialog-actions">
          <button ref={cancel} onClick={onCancel}>
            Cancel
          </button>
          <button class="danger" onClick={onConfirm}>
            {confirm}
          </button>
        </div>
      </div>
    </div>
  )
}
