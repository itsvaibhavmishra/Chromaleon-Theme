import type { ComponentChildren } from 'preact'

import { ACTIVE_FILE, SAMPLE, TREE } from '@/webview/sample'

// A miniature of the parts of a VS Code window an extension can actually paint. Anything
// belonging to another extension is deliberately absent: showing it would promise a mapping
// the customizer can never deliver.
//
// Every region carries the role that really paints it, checked against the workbench map
// rather than eyeballed. The canvas is a map as much as a preview, so a region painted with
// one role and labelled another would hand back the wrong answer when clicked.

interface Props {
  palette: Record<string, string>
  collapsed: boolean
  showTerminal: boolean
  selected: string | null
  onPick: (role: string) => void
}

// Drawn rather than pulled from the codicon font: the canvas needs a handful of glyphs at one
// size, and a font file would be a dependency, a CSP allowance and a network-shaped failure
// mode for something a few paths cover.
const ICONS = [
  <path d="M5.5 2.5h4L12 5v8.5H5.5zM9.5 2.5V5H12" />,
  <>
    <circle cx="7" cy="7" r="4" />
    <path d="M10 10l3.5 3.5" />
  </>,
  <>
    <circle cx="5" cy="4" r="1.6" />
    <circle cx="5" cy="12" r="1.6" />
    <circle cx="11" cy="7" r="1.6" />
    <path d="M5 5.6v4.8M9.4 7H8a3 3 0 00-3 3" />
  </>,
  <>
    <rect x="5" y="5.5" width="6" height="7" rx="3" />
    <path d="M5 8H3M11 8h2M5 11.5H3M11 11.5h2M6.2 5.2L5.2 3.6M9.8 5.2l1-1.6" />
  </>,
  <>
    <rect x="2.5" y="2.5" width="4.5" height="4.5" />
    <rect x="9" y="2.5" width="4.5" height="4.5" />
    <rect x="2.5" y="9" width="4.5" height="4.5" />
    <rect x="9.4" y="9.4" width="4.2" height="4.2" />
  </>,
]

// Collapsed, the canvas is the theme's own surfaces at their real proportions. Enough to see
// a change land, cheap enough to leave on.
function Strip({ palette }: { palette: Record<string, string> }) {
  const bands: [string, string][] = [
    ['chrome', '9%'],
    ['bg', 'auto'],
    ['purple', '5%'],
    ['green', '4%'],
    ['orange', '3%'],
    ['accent', '7%'],
  ]
  return (
    <div class="strip" aria-label="Theme surfaces">
      {bands.map(([role, width]) => (
        <span
          key={role}
          style={{
            background: palette[role],
            flex: width === 'auto' ? '1 1 auto' : `0 0 ${width}`,
          }}
        />
      ))}
    </div>
  )
}

function Glyph({ children, on }: { children: ComponentChildren; on?: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      class={on ? 'cv-g cv-g-on' : 'cv-g'}
      fill="none"
      stroke="currentColor"
      stroke-width="1.4"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      {children}
    </svg>
  )
}

export function Canvas({ palette, collapsed, showTerminal, selected, onPick }: Props) {
  if (collapsed) return <Strip palette={palette} />

  // Every role as a custom property, so the markup below names roles rather than colours.
  const vars: Record<string, string> = {}
  for (const [id, value] of Object.entries(palette)) vars[`--r-${id}`] = value

  // Tags a region with the role that paints it, and lights it when that role is selected.
  const paint = (role: string, base?: string) => ({
    'data-role': role,
    class: [base, role === selected ? 'lit' : ''].filter(Boolean).join(' ') || undefined,
  })

  // Delegated, so a click anywhere resolves to the nearest tagged ancestor. Tagging every
  // leaf and letting the bubble find the region beats wiring a handler onto each one.
  const pick = (event: MouseEvent) => {
    const hit = (event.target as HTMLElement).closest<HTMLElement>('[data-role]')
    if (hit?.dataset.role) onPick(hit.dataset.role)
  }

  return (
    <div class="canvas" style={vars} onClick={pick}>
      <div {...paint('chrome', 'cv-activity')}>
        {ICONS.map((glyph, i) => (
          <svg
            key={i}
            viewBox="0 0 16 16"
            {...(i === 0 ? paint('fg', 'cv-icon cv-icon-on') : paint('fgMuted', 'cv-icon'))}
            fill="none"
            stroke="currentColor"
            stroke-width="1.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            {glyph}
          </svg>
        ))}
      </div>

      <div {...paint('chrome', 'cv-side')}>
        <div {...paint('fg', 'cv-side-title')}>EXPLORER</div>
        {TREE.map((entry) => {
          // Each branch tags itself, rather than picking the role and the class separately.
          // The pairing is what the canvas-mapping test reads, and what keeps a region from
          // quietly ending up labelled with a role that does not paint it.
          const tag =
            entry.name === ACTIVE_FILE
              ? paint('accent', 'cv-tree cv-tree-on')
              : paint('fgMuted', 'cv-tree')
          return (
            <div key={entry.name} {...tag} style={{ paddingLeft: `${8 + entry.depth * 10}px` }}>
              {entry.kind === 'folder' ? (entry.open ? '▾ ' : '▸ ') : ''}
              {entry.name}
            </div>
          )
        })}
      </div>

      <div {...paint('bg', 'cv-main')}>
        <div class="cv-tabs">
          <div {...paint('fg', 'cv-tab cv-tab-on')}>roles.ts</div>
          <div {...paint('fgMuted', 'cv-tab')}>color.ts</div>
          <div {...paint('fgMuted', 'cv-tab')}>obsidian.json</div>
        </div>
        <div {...paint('fgMuted', 'cv-crumbs')}>src &rsaquo; roles.ts &rsaquo; ROLES</div>

        <div class="cv-editor">
          {SAMPLE.map((line, i) => (
            <div
              key={i}
              {...(line.current
                ? paint('surfaceAlt', 'cv-line cv-line-on')
                : paint('bg', 'cv-line'))}
            >
              <span {...paint('lineNumber', 'cv-num')}>{i + 1}</span>
              <span class="cv-code">
                {Array.from({ length: line.indent }, (_, level) => (
                  <span key={level} {...paint('guide', 'cv-guide')} />
                ))}
                {line.spans.map((span, j) => (
                  <span key={j} {...paint(span.role)} style={{ color: `var(--r-${span.role})` }}>
                    {span.text}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>

        {showTerminal && (
          <div {...paint('chrome', 'cv-terminal')}>
            <div class="cv-term-tabs">
              <span {...paint('fgUi', 'on')}>TERMINAL</span>
              <span {...paint('fgMuted')}>PROBLEMS</span>
              <span {...paint('fgMuted')}>OUTPUT</span>
            </div>
            <div class="cv-term-body">
              <div>
                <span {...paint('green')} style={{ color: 'var(--r-green)' }}>
                  &#10230;
                </span>{' '}
                <span {...paint('cyan')} style={{ color: 'var(--r-cyan)' }}>
                  chromaleon
                </span>{' '}
                <span {...paint('fg')}>npm run check</span>
              </div>
              <div>
                <span {...paint('green')} style={{ color: 'var(--r-green)' }}>
                  ok
                </span>{' '}
                <span {...paint('fgSubtle')} style={{ color: 'var(--r-fgSubtle)' }}>
                  theme fingerprint 235d322894d20d5f
                </span>
              </div>
              <div>
                <span {...paint('yellow')} style={{ color: 'var(--r-yellow)' }}>
                  22/22
                </span>{' '}
                <span {...paint('fg')}>themes pass</span>
              </div>
              <div>
                <span {...paint('green')} style={{ color: 'var(--r-green)' }}>
                  &#10230;
                </span>{' '}
                <span {...paint('cyan')} style={{ color: 'var(--r-cyan)' }}>
                  chromaleon
                </span>{' '}
                <span {...paint('cursor', 'cv-caret')} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* The secondary side bar. Core workbench, not another extension's surface, so the
          theme really does paint it. It is also the only region exercising hairline,
          surface and accentDim together. */}
      <div {...paint('chrome', 'cv-chat')}>
        <div class="cv-chat-head">
          <span {...paint('fg', 'cv-chat-tab')}>CHAT</span>
          <span {...paint('fg', 'cv-chat-tools')}>
            <Glyph>
              <path d="M8 3.5v9M3.5 8h9" />
            </Glyph>
            <Glyph>
              <path d="M5.5 7l2.5 2.5L10.5 7" />
            </Glyph>
            <Glyph>
              <circle cx="8" cy="8" r="2.2" />
              <path d="M8 2.5v1.6M8 11.9v1.6M2.5 8h1.6M11.9 8h1.6" />
            </Glyph>
            <Glyph>
              <path d="M3.6 8h.01M8 8h.01M12.4 8h.01" />
            </Glyph>
            <Glyph>
              <path d="M3 6V3h3M13 6V3h-3M3 10v3h3M13 10v3h-3" />
            </Glyph>
            <Glyph>
              <path d="M4 4l8 8M12 4l-8 8" />
            </Glyph>
          </span>
        </div>

        <div {...paint('fgMuted', 'cv-chat-head cv-chat-sub')}>
          <span>SESSIONS</span>
          <span class="cv-chat-tools">
            <Glyph>
              <path d="M13 8a5 5 0 11-1.6-3.7M13 3v2.5h-2.5" />
            </Glyph>
            <Glyph>
              <circle cx="7.2" cy="7.2" r="3.4" />
              <path d="M9.8 9.8l3 3" />
            </Glyph>
            <Glyph on>
              <path d="M3 4h10l-3.8 4.3V13l-2.4-1.4V8.3z" />
            </Glyph>
            <Glyph>
              <rect x="3" y="3.5" width="10" height="9" rx="1" />
              <path d="M9.5 3.5v9" />
            </Glyph>
          </span>
        </div>

        <div class="cv-chat-body" />

        <div {...paint('surface', 'cv-tip')}>
          <b>Tip:</b> Try the{' '}
          <span {...paint('accent')} style={{ color: 'var(--r-accent)' }}>
            Plan agent
          </span>{' '}
          to research before making changes.
        </div>

        <div {...paint('surface', 'cv-compose')}>
          <div {...paint('hairline', 'cv-attach')}>
            <Glyph>
              <path d="M8 4v8M4 8h8" />
            </Glyph>
            <span class="cv-file">roles.ts</span>
          </div>
          <div class="cv-prompt">Describe what to build</div>
          <div class="cv-compose-foot">
            <Glyph>
              <path d="M8 4v8M4 8h8" />
            </Glyph>
            <Glyph>
              <path d="M6 5.5L3.5 8 6 10.5M10 5.5L12.5 8 10 10.5" />
            </Glyph>
            <span>Agent</span>
            <span class="cv-auto">Auto</span>
            <Glyph>
              <path d="M12.5 8h-9M12.5 4.5h-9M12.5 11.5h-9" />
              <circle cx="6" cy="4.5" r="1.2" />
              <circle cx="10" cy="11.5" r="1.2" />
            </Glyph>
            <span class="cv-enter">
              <Glyph>
                <path d="M12.5 4v4.5H4M6.5 6L4 8.5 6.5 11" />
              </Glyph>
            </span>
          </div>
        </div>
      </div>

      <div {...paint('chrome', 'cv-status')}>
        <span {...paint('fgUi')}>&#9095; main</span>
        <span {...paint('fgUi', 'cv-status-right')}>Obsidian</span>
      </div>
    </div>
  )
}
