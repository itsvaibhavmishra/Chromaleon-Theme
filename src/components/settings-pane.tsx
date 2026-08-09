import { AccentField } from '@/components/accent-field'
import { SECTIONS } from '@/constants/settings'
import { humanise, inlineSegments } from '@/utils/inline-markdown'
import { HEX } from '@/webview/model'
import type { SettingMeta } from '@/webview/protocol'

type Value = string | boolean

// Beyond this a row of buttons stops fitting and stops being scannable, so it becomes a list.
const SEGMENTED_MAX = 4

// The manifest writes for VS Code's settings editor, which renders a little markdown.
function Description({ text }: { text: string }) {
  return (
    <p class="setting-help">
      {inlineSegments(text).map((segment, index) => {
        // A link for VS Code's settings editor; in here it points back at this very page.
        if (segment.kind === 'link') {
          return segment.href?.startsWith('command:') ? null : (
            <span key={index}>{segment.text}</span>
          )
        }
        if (segment.kind === 'code' || segment.kind === 'setting') {
          return <code key={index}>{segment.text}</code>
        }
        if (segment.kind === 'strong') return <strong key={index}>{segment.text}</strong>
        if (segment.kind === 'em') return <em key={index}>{segment.text}</em>
        return <span key={index}>{segment.text}</span>
      })}
    </p>
  )
}

// Every option visible at once, so the choice is the control rather than hidden behind it.
function Segmented({
  setting,
  value,
  onChange,
}: {
  setting: SettingMeta
  value: string
  onChange: (next: string) => void
}) {
  return (
    <div class="segmented" role="group" aria-label={humanise(setting.key)}>
      {setting.options?.map((option) => (
        <button
          key={option.value}
          class={option.value === value ? 'on' : undefined}
          aria-pressed={option.value === value}
          title={option.detail}
          onClick={() => onChange(option.value)}
        >
          {humanise(option.value)}
        </button>
      ))}
    </div>
  )
}

function Switch({
  setting,
  value,
  onChange,
}: {
  setting: SettingMeta
  value: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <button
      class={value ? 'switch on' : 'switch'}
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
    >
      <span class="switch-track">
        <span class="switch-thumb" />
      </span>
      <span class="switch-label">{humanise(setting.key)}</span>
    </button>
  )
}

function Field({
  setting,
  value,
  onChange,
}: {
  setting: SettingMeta
  value: Value
  onChange: (next: Value) => void
}) {
  if (setting.kind === 'boolean') {
    return <Switch setting={setting} value={value === true} onChange={onChange} />
  }

  if (setting.kind === 'enum') {
    const options = setting.options ?? []
    const chosen = options.find((option) => option.value === String(value))
    return (
      <>
        <div class="setting-label">{humanise(setting.key)}</div>
        {options.length <= SEGMENTED_MAX ? (
          <Segmented setting={setting} value={String(value)} onChange={onChange} />
        ) : (
          <select
            value={String(value)}
            onChange={(event) => onChange((event.target as HTMLSelectElement).value)}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {humanise(option.value)}
              </option>
            ))}
          </select>
        )}
        {chosen?.detail && <p class="setting-help">{chosen.detail}</p>}
      </>
    )
  }

  const text = String(value)
  const valid = text === '' || HEX.test(text)
  return (
    <>
      <div class="setting-label">{humanise(setting.key)}</div>
      <input
        class={valid ? 'setting-text' : 'setting-text invalid'}
        value={text}
        spellcheck={false}
        placeholder="#rrggbb"
        onChange={(event) => {
          const next = (event.target as HTMLInputElement).value.trim()
          if (next === '' || HEX.test(next)) onChange(next)
        }}
      />
    </>
  )
}

export function SettingsPane({
  settings,
  values,
  themeAccent,
  onChange,
}: {
  settings: SettingMeta[]
  values: Record<string, Value>
  themeAccent: string
  onChange: (key: string, value: Value) => void
}) {
  const byKey = new Map(settings.map((setting) => [setting.key, setting]))
  // An unplaced setting still has to appear, or contributing one would silently hide it.
  const placed = new Set(SECTIONS.flatMap((section) => section.keys))
  const unplaced = settings.filter((setting) => !placed.has(setting.key))
  const sections = [
    ...SECTIONS,
    ...(unplaced.length > 0
      ? [{ title: 'Other', blurb: '', keys: unplaced.map((setting) => setting.key) }]
      : []),
  ]

  return (
    <div class="settings-pane">
      <p class="settings-note">
        These are your VS Code settings. Every change here is written straight away, so there is
        nothing to save. Colours are the ones that wait behind Save, over on the Colours tab.
      </p>
      <div class="settings-grid">
        {sections.map((section) => {
          const inSection = section.keys
            .map((key) => byKey.get(key))
            .filter((setting): setting is SettingMeta => setting !== undefined)
          if (inSection.length === 0) return null

          // The swatch row reads as a palette across a full line and as a wrapped mess in a
          // column, so this one card takes the width and the rest pack underneath it.
          const wide = inSection.some((setting) => setting.key === 'accent')

          return (
            <section key={section.title} class={wide ? 'setting-card wide' : 'setting-card'}>
              <h2>{section.title}</h2>
              {section.blurb && <p class="muted setting-blurb">{section.blurb}</p>}

              {inSection.map((setting) => {
                // Drawn by the accent control already, which owns both halves of the choice.
                if (setting.key === 'customAccent') return null

                if (setting.key === 'accent') {
                  return (
                    <div key={setting.key} class="setting">
                      <div class="setting-label">Accent</div>
                      <AccentField
                        named={String(values.accent ?? '')}
                        custom={String(values.customAccent ?? '')}
                        themeAccent={themeAccent}
                        onChange={(accent, customAccent) => {
                          if (accent !== values.accent) onChange('accent', accent)
                          if (customAccent !== values.customAccent) {
                            onChange('customAccent', customAccent)
                          }
                        }}
                      />
                      <Description text={setting.description} />
                    </div>
                  )
                }

                return (
                  <div key={setting.key} class="setting">
                    <Field
                      setting={setting}
                      value={values[setting.key] ?? ''}
                      onChange={(next) => onChange(setting.key, next)}
                    />
                    <Description text={setting.description} />
                  </div>
                )
              })}
            </section>
          )
        })}
      </div>
    </div>
  )
}
