// The code the canvas renders. Every span carries the role that paints it, so the canvas is
// both the preview and the map: clicking a token can name its role without a parser.
//
// The sample is chosen to exercise the ramp rather than to be realistic. A settings file
// would show three hues and leave most of the syntax roles with nothing to point at.

export interface Span {
  text: string
  role: string
}

export interface Line {
  /** Leading indent levels, drawn as guides so that role is visible too. */
  indent: number
  /** The line the caret sits on, so the active-line role has somewhere to show. */
  current?: boolean
  spans: Span[]
}

const s = (text: string, role: string): Span => ({ text, role })

const kw = (text: string) => s(text, 'cyan')
const punct = (text: string) => s(text, 'cyan')
const fn = (text: string) => s(text, 'blue')
const num = (text: string) => s(text, 'orange')
const type = (text: string) => s(text, 'yellow')
const prop = (text: string) => s(text, 'red')
const plain = (text: string) => s(text, 'fg')

export const SAMPLE: Line[] = [
  { indent: 0, spans: [s('// 29 roles. 376 keys. Nothing else to edit.', 'fgSubtle')] },
  {
    indent: 0,
    spans: [
      kw('import'),
      plain(' '),
      punct('{'),
      fn(' hsl'),
      punct(','),
      fn(' mix'),
      plain(' '),
      punct('}'),
      plain(' '),
      kw('from'),
      plain(' '),
      s('"./color"', 'green'),
    ],
  },
  { indent: 0, spans: [] },
  {
    indent: 0,
    spans: [
      kw('export'),
      plain(' '),
      s('const', 'purple'),
      plain(' '),
      plain('ROLES'),
      plain(' '),
      punct('='),
      plain(' '),
      punct('{'),
    ],
  },
  {
    indent: 1,
    current: true,
    spans: [
      prop('bg'),
      punct(':'),
      plain('     '),
      fn('hsl'),
      punct('('),
      num('218'),
      punct(','),
      num(' 12'),
      punct(','),
      num(' 7'),
      punct('),'),
    ],
  },
  {
    indent: 1,
    spans: [
      prop('fg'),
      punct(':'),
      plain('     '),
      fn('hsl'),
      punct('('),
      num('216'),
      punct(','),
      num(' 14'),
      punct(','),
      num(' 82'),
      punct('),'),
    ],
  },
  {
    indent: 1,
    spans: [
      prop('accent'),
      punct(':'),
      plain(' '),
      fn('mix'),
      punct('('),
      plain('base'),
      punct(','),
      num(' 0.42'),
      punct('),'),
    ],
  },
  {
    indent: 1,
    spans: [
      prop('light'),
      punct(':'),
      plain('  '),
      s('false', 'pink'),
      punct(','),
      plain(' '),
      s('// never follows accent', 'fgSubtle'),
    ],
  },
  { indent: 0, spans: [punct('};')] },
  { indent: 0, spans: [] },
  {
    indent: 0,
    spans: [
      kw('export'),
      plain(' '),
      s('function', 'purple'),
      plain(' '),
      fn('expand'),
      punct('('),
      plain('base'),
      punct(':'),
      plain(' '),
      type('Hsl'),
      punct('):'),
      plain(' '),
      type('Theme'),
      plain(' '),
      punct('{'),
    ],
  },
  {
    indent: 1,
    spans: [
      kw('if'),
      plain(' '),
      punct('('),
      fn('contrast'),
      punct('('),
      plain('base'),
      punct(')'),
      plain(' '),
      punct('<'),
      plain(' '),
      num('3'),
      punct(')'),
      plain(' '),
      kw('throw'),
      plain(' '),
      kw('new'),
      plain(' '),
      type(' RangeError'),
      punct('();'),
    ],
  },
  {
    indent: 1,
    spans: [
      kw('return'),
      plain(' '),
      fn('emit'),
      punct('('),
      plain('ROLES'),
      punct(','),
      plain(' base'),
      punct(');'),
    ],
  },
  { indent: 0, spans: [punct('}')] },
]

/** Files shown in the canvas sidebar. The active one is the file the editor is showing. */
export const TREE = [
  { name: 'src', kind: 'folder' as const, depth: 0, open: true },
  { name: 'color.ts', kind: 'file' as const, depth: 1, open: false },
  { name: 'roles.ts', kind: 'file' as const, depth: 1, open: false },
  { name: 'tokens.ts', kind: 'file' as const, depth: 1, open: false },
  { name: 'themes', kind: 'folder' as const, depth: 0, open: true },
  { name: 'obsidian.json', kind: 'file' as const, depth: 1, open: false },
  { name: 'chalk.json', kind: 'file' as const, depth: 1, open: false },
  { name: 'test', kind: 'folder' as const, depth: 0, open: false },
  { name: 'package.json', kind: 'file' as const, depth: 0, open: false },
  { name: 'README.md', kind: 'file' as const, depth: 0, open: false },
]

export const ACTIVE_FILE = 'roles.ts'
