import { SettingsPane } from '@/components/settings-pane'
import { SECTIONS } from '@/constants/settings'
import { humanise, inlineSegments } from '@/utils/inline-markdown'
import { check, checkThat } from '#test/panel/harness'

console.log('\nsetting descriptions')
{
  const plain = inlineSegments('Paint the status bar in the accent colour.')
  check('plain text is one segment', plain.length, 1)
  check('and stays plain', plain[0].kind, 'plain')

  // Straight from the manifest, so the shapes tested are the shapes that actually ship.
  const mixed = inlineSegments('Any `#rrggbb`, which **overrides** `#chromaleon.accent#`.')
  // Backticked in the manifest too, and VS Code still resolves it, so code must not win.
  check(
    'a backticked setting reference still reads as one',
    mixed.filter((segment) => segment.kind !== 'plain').map((segment) => segment.kind),
    ['code', 'strong', 'setting'],
  )
  check('the backticks are gone', mixed[1].text, '#rrggbb')
  check('and so are the hashes', mixed.at(-2)?.text, 'accent')

  // Two asterisks have to be tried before one, or **bold** reads as an empty emphasis.
  const bold = inlineSegments('**overrides**')
  check('bold is not read as two emphases', bold.length, 1)
  check('and keeps its text', bold[0].text, 'overrides')

  const setting = inlineSegments('#chromaleon.accent#')
  check('a setting reference is its own kind', setting[0].kind, 'setting')
  check('and loses the namespace', setting[0].text, 'accent')

  // Descriptions carry command links for VS Code's settings editor, which our pane drops.
  const linked = inlineSegments('Where it opens. [Open it](command:chromaleon.openCustomizer)')
  check('a link is its own kind', linked[1].kind, 'link')
  check('carrying its target', linked[1].href, 'command:chromaleon.openCustomizer')
  check('and its label', linked[1].text, 'Open it')
  check('the text before it survives', linked[0].text, 'Where it opens. ')

  const italic = inlineSegments('Run *Chromaleon: Clear Custom Accent* or empty this field.')
  check('emphasis is picked out', italic[1].kind, 'em')
  check('and the text around it survives', italic[0].text, 'Run ')
}

console.log('\nnaming a setting from its key')
{
  check('camelCase becomes a sentence', humanise('accentedStatusBar'), 'Accented status bar')
  check('a single word is just capitalised', humanise('italics'), 'Italics')
  check('and so is an enum value', humanise('newWindow'), 'New window')
  // Accent names are already written for people, and lowercasing them would say Theme default.
  check('anything with a space is left alone', humanise('Theme Default'), 'Theme Default')
}

console.log('\nevery setting has a home')
{
  const placed = SECTIONS.flatMap((section) => section.keys)
  check('no setting is listed in two sections', placed.length, new Set(placed).size)
  // The manifest is the source; this only checks the hand-kept grouping has not fallen behind.
  // The count itself is asserted against package.json over in the settings harness.
  check('and the sections cover fifteen', placed.length, 15)
}

console.log('\nthe settings pane actually reports a click')
{
  // Preact components are plain functions, so the tree can be walked without a DOM as long as
  // nothing in it uses a hook. Accent is left out because its picker does.
  interface Node {
    type: unknown
    props: Record<string, unknown>
  }

  const flatten = (node: unknown): Node[] => {
    if (Array.isArray(node)) return node.flatMap(flatten)
    if (!node || typeof node !== 'object') return []
    const vnode = node as Node
    if (typeof vnode.type === 'function') {
      const rendered = (vnode.type as (props: unknown) => unknown)(vnode.props)
      return [vnode, ...flatten(rendered)]
    }
    return [vnode, ...flatten(vnode.props?.children)]
  }

  const changes: [string, string | boolean][] = []
  const tree = SettingsPane({
    settings: [
      { key: 'italics', kind: 'boolean', description: 'Italicise comments.' },
      {
        key: 'borders',
        kind: 'enum',
        description: 'Borders drawn between editor areas.',
        options: [{ value: 'none' }, { value: 'subtle' }, { value: 'strong' }],
      },
    ],
    values: { italics: true, borders: 'none' },
    themeAccent: '#2578b3',
    onChange: (key, value) => changes.push([key, value]),
  })

  const nodes = flatten(tree)
  const toggle = nodes.find((node) => node.props?.role === 'switch')
  checkThat('the boolean renders a switch', !!toggle, 'no role=switch found')
  ;(toggle?.props?.onClick as () => void)?.()
  check('clicking it reports the opposite', changes.at(-1), ['italics', false])

  const segments = nodes.filter((node) => node.type === 'button' && node.props?.['aria-pressed'])
  checkThat('the enum renders its options', segments.length > 0, `${segments.length} pressed`)

  const strong = nodes.find((node) => node.type === 'button' && node.props?.children === 'Strong')
  checkThat('including the one not chosen', !!strong, 'no Strong button')
  ;(strong?.props?.onClick as () => void)?.()
  check('and picking it reports that value', changes.at(-1), ['borders', 'strong'])
}
