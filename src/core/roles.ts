import type { Palette } from './palette'

export type RoleGroup = 'Surfaces' | 'Foregrounds' | 'Accent' | 'Hue ramp' | 'Fixed'

// What a role has to clear to stay legible, and what it is measured against. Backgrounds
// carry no floor of their own: they are the thing everything else is measured on.
export type Floor = { on: 'none' } | { on: 'bg'; min: number } | { on: 'accent'; min: number }

// The one place the contrast floors are written down. check.ts imports these to audit the
// shipped themes and the customizer imports them to judge an edited one, so a theme someone
// builds in the panel is held to exactly the bar we hold ourselves to. Duplicating them
// would let the two drift silently, which is the whole failure this prevents.
export const FLOORS = {
  body: 7,
  /** Active UI text, and normal text on the accent. WCAG 1.4.3 AA. */
  ui: 4.5,
  syntax: 3.5,
  /** Non-text UI, WCAG 1.4.11. */
  nonText: 3,
  /** Guides and glyphs still have to be findable, but they are meant to stay quiet. */
  recede: 1.9,
} as const

const { body: BODY, ui: UI, syntax: SYNTAX, nonText: NON_TEXT, recede: RECEDE } = FLOORS

export interface Role {
  id: keyof Palette
  label: string
  group: RoleGroup
  floor: Floor
}

const none: Floor = { on: 'none' }
const onBg = (min: number): Floor => ({ on: 'bg', min })

// Order is the order the list renders in. It follows Palette so the two cannot drift apart
// in meaning, and it groups by what a person is looking for rather than by key count.
export const ROLES: Role[] = [
  { id: 'bg', label: 'Editor background', group: 'Surfaces', floor: none },
  { id: 'chrome', label: 'Chrome, panels and title bar', group: 'Surfaces', floor: none },
  { id: 'border', label: 'Separators', group: 'Surfaces', floor: none },
  { id: 'bgAlt', label: 'Lifted background', group: 'Surfaces', floor: none },
  { id: 'surface', label: 'Inputs and peek', group: 'Surfaces', floor: none },
  { id: 'surfaceAlt', label: 'Badges and active line', group: 'Surfaces', floor: none },
  { id: 'guide', label: 'Indent guides', group: 'Surfaces', floor: onBg(RECEDE) },
  { id: 'lineNumber', label: 'Inactive line numbers', group: 'Surfaces', floor: onBg(RECEDE) },
  { id: 'whitespace', label: 'Whitespace glyphs', group: 'Surfaces', floor: onBg(RECEDE) },
  // No floor: every key using it supplies its own alpha, so the raw value is never what
  // renders. What matters is that it points away from the background, which check.ts asserts.
  { id: 'hairline', label: 'Hairlines and washes', group: 'Surfaces', floor: none },

  { id: 'fgSubtle', label: 'Dimmest readable text', group: 'Foregrounds', floor: onBg(SYNTAX) },
  { id: 'fgMuted', label: 'Muted text', group: 'Foregrounds', floor: onBg(UI) },
  { id: 'fgUi', label: 'Active UI text', group: 'Foregrounds', floor: onBg(UI) },
  { id: 'fgAlt', label: 'Secondary text', group: 'Foregrounds', floor: onBg(UI) },
  { id: 'fg', label: 'Primary text', group: 'Foregrounds', floor: onBg(BODY) },
  { id: 'fgBright', label: 'Brightest text', group: 'Foregrounds', floor: onBg(BODY) },
  { id: 'fgSlider', label: 'Scrollbar', group: 'Foregrounds', floor: onBg(RECEDE) },

  { id: 'accent', label: 'Accent', group: 'Accent', floor: onBg(NON_TEXT) },
  {
    id: 'accentDim',
    label: 'Accent, dimmed into the background',
    group: 'Accent',
    floor: none,
  },
  {
    id: 'onAccent',
    label: 'Text on the accent',
    group: 'Accent',
    floor: { on: 'accent', min: UI },
  },
  { id: 'cursor', label: 'Cursor', group: 'Accent', floor: onBg(NON_TEXT) },

  { id: 'red', label: 'Red', group: 'Hue ramp', floor: onBg(SYNTAX) },
  { id: 'orange', label: 'Orange', group: 'Hue ramp', floor: onBg(SYNTAX) },
  { id: 'yellow', label: 'Yellow', group: 'Hue ramp', floor: onBg(SYNTAX) },
  { id: 'green', label: 'Green', group: 'Hue ramp', floor: onBg(SYNTAX) },
  { id: 'cyan', label: 'Cyan', group: 'Hue ramp', floor: onBg(SYNTAX) },
  { id: 'blue', label: 'Blue', group: 'Hue ramp', floor: onBg(SYNTAX) },
  { id: 'purple', label: 'Purple', group: 'Hue ramp', floor: onBg(SYNTAX) },
  { id: 'pink', label: 'Pink', group: 'Hue ramp', floor: onBg(SYNTAX) },
  { id: 'brown', label: 'Brown', group: 'Hue ramp', floor: onBg(SYNTAX) },

  // Absolutes. They anchor the ends of the range, so letting them move would put every
  // contrast figure in the panel on a shifting base.
  { id: 'white', label: 'White', group: 'Fixed', floor: none },
  { id: 'black', label: 'Black', group: 'Fixed', floor: none },
]

// Concepts people search for that are not roles. Typing "comment" has to find the role that
// paints comments, or the honest naming costs them the thing they came in for.
export const CONCEPTS: { term: string; role: keyof Palette; reads: string }[] = [
  { term: 'comment', role: 'fgSubtle', reads: 'Comments are painted by Dimmest text' },
  { term: 'string', role: 'green', reads: 'Strings are painted by Green' },
  { term: 'keyword', role: 'cyan', reads: 'Keywords are painted by Cyan' },
  { term: 'function', role: 'blue', reads: 'Function names are painted by Blue' },
  { term: 'type', role: 'yellow', reads: 'Types are painted by Yellow' },
  { term: 'number', role: 'orange', reads: 'Numbers are painted by Orange' },
  { term: 'boolean', role: 'pink', reads: 'Booleans are painted by Pink' },
  { term: 'punctuation', role: 'cyan', reads: 'Punctuation is painted by Cyan' },
  { term: 'declaration', role: 'purple', reads: 'const and function are painted by Purple' },
  { term: 'selection', role: 'accentDim', reads: 'Selection is painted by Accent, dimmed' },
  { term: 'find', role: 'hairline', reads: 'Find match highlights are painted by Hairlines' },
  { term: 'sidebar', role: 'chrome', reads: 'The sidebar is painted by Chrome' },
  { term: 'tab', role: 'chrome', reads: 'The tab bar is painted by Chrome' },
  { term: 'status bar', role: 'chrome', reads: 'The status bar is painted by Chrome' },
]
