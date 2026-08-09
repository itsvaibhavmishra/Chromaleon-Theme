// Undo and redo over whole snapshots rather than diffs. The draft is already the complete
// override set, so a snapshot is the cheapest correct thing to keep and cannot drift.

export interface History<Snapshot> {
  past: Snapshot[]
  present: Snapshot
  future: Snapshot[]
}

/** How many steps back the panel keeps. Beyond this the oldest is dropped. */
export const HISTORY_LIMIT = 50

export function started<Snapshot>(present: Snapshot): History<Snapshot> {
  return { past: [], present, future: [] }
}

// Recording throws the redo stack away, which is what every editor does: once you branch off
// an undone state, the future you undid is no longer reachable.
export function record<Snapshot>(history: History<Snapshot>, next: Snapshot): History<Snapshot> {
  const past = [...history.past, history.present].slice(-HISTORY_LIMIT)
  return { past, present: next, future: [] }
}

export function undo<Snapshot>(history: History<Snapshot>): History<Snapshot> {
  if (history.past.length === 0) return history
  const previous = history.past[history.past.length - 1]
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  }
}

export function redo<Snapshot>(history: History<Snapshot>): History<Snapshot> {
  if (history.future.length === 0) return history
  const [next, ...rest] = history.future
  return { past: [...history.past, history.present], present: next, future: rest }
}

export const canUndo = (history: History<unknown>) => history.past.length > 0
export const canRedo = (history: History<unknown>) => history.future.length > 0
