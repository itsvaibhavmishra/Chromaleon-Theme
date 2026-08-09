// A U-turn arrow: it reads as "go back a step" rather than "go to the previous thing", which
// is what a plain left arrow says and is not what undo does.
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
      <path d="M5.7 2.5L2.5 5.5l3.2 3" />
      <path d="M2.5 5.5h6.9a3.1 3.1 0 010 6.2H5.4" />
    </svg>
  )
}
