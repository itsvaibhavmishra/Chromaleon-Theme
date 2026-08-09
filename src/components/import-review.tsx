import { useState } from 'preact/hooks'

import { presetSignature, type ReadResult } from '@/utils/preset-file'

// Dropped files are reviewed before anything is written. A drop is easy to do by accident and
// the panel cannot know which of five presets in a file someone actually wanted.
export function ImportReview({
  read,
  existing,
  onCancel,
  onConfirm,
}: {
  read: ReadResult[]
  /** Signatures of everything already saved, so an identical preset is not offered again. */
  existing: Set<string>
  onCancel: () => void
  onConfirm: (chosen: { file: string; index: number }[]) => void
}) {
  const usable = read.filter((result) => result.presets.length > 0)
  const rejected = read.filter((result) => result.problem)
  const total = usable.reduce((count, result) => count + result.presets.length, 0)

  const key = (file: string, index: number) => `${file}#${index}`
  const duplicate = (preset: { name: string; base: string; overrides: Record<string, string> }) =>
    existing.has(presetSignature(preset))

  // Anything already saved starts unticked. It stays tickable, because the only thing being
  // claimed is that it is the same, not that nobody could want a second copy.
  const [chosen, setChosen] = useState<Set<string>>(
    () =>
      new Set(
        usable.flatMap((result) =>
          result.presets
            .map((preset, index) => (duplicate(preset) ? null : key(result.file, index)))
            .filter((entry): entry is string => entry !== null),
        ),
      ),
  )

  const toggle = (id: string) => {
    const next = new Set(chosen)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setChosen(next)
  }

  const confirm = () =>
    onConfirm(
      usable.flatMap((result) =>
        result.presets
          .map((_, index) => ({ file: result.file, index }))
          .filter((entry) => chosen.has(key(entry.file, entry.index))),
      ),
    )

  return (
    <div class="scrim" onClick={onCancel}>
      <div
        class="dialog dialog-wide"
        role="dialog"
        aria-label="Import presets"
        onClick={(event) => event.stopPropagation()}
      >
        <h2>
          {total > 0
            ? `Import ${total === 1 ? 'a preset' : `${total} presets`}`
            : 'Nothing to import'}
        </h2>

        {usable.length > 0 && (
          <div class="import-list">
            {usable.map((result) => (
              <section key={result.file}>
                <h3>{result.file}</h3>
                {result.presets.map((preset, index) => (
                  <label key={key(result.file, index)} class="import-row">
                    <input
                      type="checkbox"
                      checked={chosen.has(key(result.file, index))}
                      onChange={() => toggle(key(result.file, index))}
                    />
                    <span class="import-name">{preset.name}</span>
                    <span class="muted">
                      {Object.keys(preset.overrides).length} colours, on{' '}
                      {preset.base.replace(/^Chromaleon /, '')}
                    </span>
                    {duplicate(preset) && <span class="import-dupe">already saved</span>}
                  </label>
                ))}
                {result.skipped.map((reason) => (
                  <p key={reason} class="import-skip">
                    Skipped: {reason}
                  </p>
                ))}
              </section>
            ))}
          </div>
        )}

        {rejected.length > 0 && (
          <div class="import-list">
            {rejected.map((result) => (
              <p key={result.file} class="import-skip">
                <strong>{result.file}</strong> is {result.problem}.
              </p>
            ))}
          </div>
        )}

        <div class="dialog-actions">
          <button onClick={onCancel}>Cancel</button>
          <button class="apply" onClick={confirm} disabled={chosen.size === 0}>
            {chosen.size === 1 ? 'Import 1 preset' : `Import ${chosen.size} presets`}
          </button>
        </div>
      </div>
    </div>
  )
}
