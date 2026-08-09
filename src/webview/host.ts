import { CANVAS_MIN, LOWER_MIN } from '@/constants/panel'
import type { PanelState, ToHost } from '@/webview/protocol'

// Everything the panel says to the host and everything it keeps for itself. One module owns
// the bridge for a correctness reason: acquireVsCodeApi may be called only once per webview,
// so a second caller anywhere would throw.

/** Survives a reload. Everything here is the panel's own, never the user's settings. */
export interface Persisted {
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

export function post(message: ToHost) {
  vscode.postMessage(message)
}

/** What the panel stored for itself last time, empty on a first open. */
export function restored(): Persisted {
  return vscode.getState() ?? {}
}

// Merges rather than replaces, so persisting the canvas height cannot drop the cached state
// the panel repaints from on reload, or the other way round.
export function persist(patch: Partial<Persisted>) {
  vscode.setState({ ...restored(), ...patch })
}

export const clampCanvas = (height: number) =>
  Math.max(CANVAS_MIN, Math.min(height, window.innerHeight - LOWER_MIN))
