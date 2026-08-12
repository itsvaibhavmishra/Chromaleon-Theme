// Moving the devlog into the changelog, as pure text. The release command does the git and
// the network; everything here can be reasoned about by reading it.

export const HEADINGS = ['New', 'Improvements', 'Fixed', 'Developers', 'Internal'] as const

export interface Section {
  heading: string
  entries: string[]
}

/** Everything written under each heading since the last release, empty ones dropped. */
export function readDevlog(text: string): Section[] {
  const sections: Section[] = HEADINGS.map((heading) => ({ heading, entries: [] }))
  let current: Section | undefined

  for (const line of text.split('\n')) {
    if (line.trimStart().startsWith('#')) continue
    const opening = HEADINGS.find((heading) => line.trim() === `- ${heading}:`)
    if (opening) {
      current = sections.find((section) => section.heading === opening)
      continue
    }
    const entry = line.trim()
    if (current && entry.startsWith('- ')) current.entries.push(entry.slice(2).trim())
  }
  return sections.filter((section) => section.entries.length > 0)
}

export function blankDevlog(text: string): string {
  const header = text.slice(0, text.indexOf('  - New:'))
  return header + HEADINGS.map((heading) => `  - ${heading}:\n`).join('\n')
}

export function buildEntry(version: string, date: string, sections: Section[]): string {
  return [
    `## [${version}] - ${date}`,
    '',
    ...sections.flatMap(({ heading, entries }) => [
      `### ${heading}`,
      '',
      ...entries.map((line) => `- ${line}`),
      '',
    ]),
    // The next heading needs a blank line before it, or the two sections run together.
    '',
  ].join('\n')
}

/** The new section above the previous release, and its reference link at the foot. */
export function withRelease(changelog: string, entry: string, version: string, repo: string) {
  const firstRelease = changelog.indexOf('## [')
  const body = (
    changelog.slice(0, firstRelease) +
    entry +
    changelog.slice(firstRelease).replace(/\n*$/, '\n')
  ).trimEnd()

  // The reference links are one block, so a second one joins it rather than opening a paragraph.
  const separator = /\n\[[^\]]+\]: \S+$/.test(body) ? '\n' : '\n\n'
  return `${body}${separator}[${version}]: ${repo}/releases/tag/v${version}\n`
}

/** The changelog section for one version, used as the body of the release PR. */
export function sectionFor(changelog: string, version: string): string {
  const start = changelog.indexOf(`## [${version}]`)
  if (start === -1) return ''
  const rest = changelog.slice(start)
  const next = rest.indexOf('\n## [', 1)
  const section = next === -1 ? rest : rest.slice(0, next)
  return section.split('\n').slice(1).join('\n').trim()
}

/** Higher, equal or lower, so a release cannot go backwards by typo. */
export function compareVersions(left: string, right: string): number {
  const [leftParts, rightParts] = [left, right].map((value) => value.split('.').map(Number))
  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] !== rightParts[index]) return leftParts[index] - rightParts[index]
  }
  return 0
}
