// Drawn rather than pulled from the shipped icon set: those are hundreds of Material SVGs
// keyed by filename, and the canvas needs five shapes at eleven pixels.

// Material's own hues for the file types in the sample tree, so the miniature agrees with
// what the explorer actually shows next to these names.
const TYPES: { match: RegExp; fill: string }[] = [
  { match: /\.tsx?$/, fill: '#519aba' },
  { match: /\.json$/, fill: '#cbcb41' },
  { match: /\.md$/, fill: '#519aba' },
  { match: /\.css$/, fill: '#563d7c' },
]

const fileFill = (name: string) => TYPES.find((type) => type.match.test(name))?.fill ?? '#6d8086'

export function TreeIcon({
  name,
  folder,
  open,
  accent,
}: {
  name: string
  folder: boolean
  open: boolean
  /** Set when accentFolders is on, which tints folders instead of using Material's colours. */
  accent?: string
}) {
  const fill = folder ? (accent ?? '#7bb0d9') : fileFill(name)

  return (
    <svg viewBox="0 0 16 16" class="cv-fi" aria-hidden="true">
      {folder ? (
        open ? (
          <path d="M1.5 4h4l1.2 1.6H14v7.4H1.5z" fill={fill} opacity="0.92" />
        ) : (
          <path d="M1.5 3.5h4.4l1.2 1.6H14v7.4H1.5z" fill={fill} opacity="0.7" />
        )
      ) : (
        <>
          <path d="M4 2.2h5L12 5v8.8H4z" fill={fill} opacity="0.9" />
          <path d="M9 2.2V5h3" fill={fill} opacity="0.55" />
        </>
      )}
    </svg>
  )
}
