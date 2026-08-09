import { CANVAS_DEFAULT } from '@/constants/panel'
import { clampCanvas } from '@/webview/host'

export function Resizer({
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
