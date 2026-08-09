import { useEffect } from 'preact/hooks'

// Takes selectors rather than a ref: the row menu floats elsewhere and its trigger must toggle.
export function useCloseOnOutside(open: boolean, close: () => void, keep: string) {
  useEffect(() => {
    if (!open) return
    const onDown = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest(keep)) close()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open, close, keep])
}
