// The undo and redo glyphs. Entities like U+21BA render at whatever weight the system font
// has and sat far too light beside the text buttons.
export function Arrow({ forward }: { forward?: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      class="arrow"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      style={forward ? { transform: 'scaleX(-1)' } : undefined}
    >
      <path d="M6.5 4.5L3 8l3.5 3.5" />
      <path d="M3 8h6.2a3.8 3.8 0 010 7.6H8" transform="translate(0 -3.6)" />
    </svg>
  )
}
