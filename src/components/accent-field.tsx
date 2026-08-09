import { useState } from 'preact/hooks'

import { Picker } from '@/components/role-detail'
import { ACCENTS, DEFAULT_ACCENT, HEX6, THEME_DEFAULT } from '@/core/accents'

// One decision wearing two settings, and a dropdown of colour names cannot show a colour.
export function AccentField({
  named,
  custom,
  themeAccent,
  onChange,
}: {
  named: string
  custom: string
  /** What the variant ships with, so Theme Default shows the colour it actually means. */
  themeAccent: string
  onChange: (accent: string, customAccent: string) => void
}) {
  const isCustom = HEX6.test(custom.trim())
  const [picking, setPicking] = useState(isCustom)

  // Clearing the custom one too, or it keeps winning and the swatch looks broken.
  const chooseNamed = (name: string) => {
    setPicking(false)
    onChange(name, '')
  }

  return (
    <div class="accent-field">
      <div class="accent-swatches">
        <button
          class={!isCustom && named === THEME_DEFAULT ? 'accent-chip on' : 'accent-chip'}
          title="Keep whichever accent the variant ships with"
          aria-pressed={!isCustom && named === THEME_DEFAULT}
          onClick={() => chooseNamed(THEME_DEFAULT)}
        >
          <span class="accent-dot" style={{ background: themeAccent || DEFAULT_ACCENT }} />
          Theme default
        </button>

        {Object.entries(ACCENTS).map(([name, value]) => (
          <button
            key={name}
            class={!isCustom && named === name ? 'accent-swatch on' : 'accent-swatch'}
            style={{ background: value }}
            title={name}
            aria-label={name}
            aria-pressed={!isCustom && named === name}
            onClick={() => chooseNamed(name)}
          />
        ))}

        <button
          class={isCustom ? 'accent-chip on' : 'accent-chip'}
          aria-pressed={isCustom}
          aria-expanded={picking}
          onClick={() => setPicking(!picking)}
        >
          <span
            class="accent-dot"
            style={{ background: isCustom ? custom : 'var(--vscode-input-background)' }}
          />
          Custom
        </button>
      </div>

      {picking && (
        <div class="accent-picker">
          <Picker
            value={isCustom ? custom.trim().toLowerCase() : themeAccent || DEFAULT_ACCENT}
            onChange={(next) => onChange(named, next)}
          />
          <div class="accent-hex">
            <code>{isCustom ? custom.trim().toLowerCase() : 'not set'}</code>
            <button onClick={() => onChange(named, '')} disabled={!isCustom}>
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
