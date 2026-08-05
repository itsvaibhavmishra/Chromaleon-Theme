// The complete input to one theme: 29 roles that expand into 279 workbench keys,
// 81 TextMate rules and 18 semantic tokens.
export interface Palette {
  /** Editor background. The variant's identity lives here. */
  bg: string
  /** Panel, widget and title-bar background. Equals `bg` except in high contrast. */
  chrome: string
  /** Separator lines. Background-coloured until high contrast lifts them into view. */
  border: string
  /** Slightly lifted background, for command centre and menu borders. */
  bgAlt: string
  /** Raised surface: inputs, peek view, chat bubbles. */
  surface: string
  /** Selected surface: badges, active line, suggest selection. */
  surfaceAlt: string
  /** Indent guides, rulers, tree guides. */
  guide: string
  /** Inactive line numbers and code block borders. */
  lineNumber: string
  /** Rendered whitespace glyphs. */
  whitespace: string

  /** Dimmest readable text: codelens, ANSI bright black. */
  fgSubtle: string
  /** Muted text: inactive tabs, breadcrumbs, sidebar. */
  fgMuted: string
  /** Active UI text. Dimmest tone still clearing WCAG AA against the background. */
  fgUi: string
  /** Secondary text used by some markup scopes. */
  fgAlt: string
  /** Primary foreground. */
  fg: string
  /** Brightest foreground. */
  fgBright: string
  /** Scrollbar slider: reads as a control without glaring. */
  fgSlider: string

  /** Accent: active borders, buttons, badges. */
  accent: string
  /** Accent mixed into the background, for selection fills. */
  accentDim: string
  /** Text sitting on the accent. Black or white, whichever contrasts more. */
  onAccent: string
  /** Cursor and bracket match. Deliberately separate from the accent. */
  cursor: string

  // Faint lifts: hairline borders and the find-match washes, always used at low alpha.
  // White on a dark variant, black on a light one. `white` cannot do this job: it only
  // separates a surface from its background when the background is dark.
  hairline: string

  white: string
  black: string

  // Syntax and diagnostics ramp.
  red: string
  orange: string
  yellow: string
  green: string
  cyan: string
  blue: string
  purple: string
  pink: string
  brown: string
}
