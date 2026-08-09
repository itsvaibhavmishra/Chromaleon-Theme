import type { Palette } from '@/core/palette'

export function semantic(palette: Palette, _italics: boolean): Record<string, unknown> {
  return {
    variable: palette.fg,
    'variable.constant': palette.fg,
    'variable.readonly': palette.fg,
    'parameter.declaration': palette.fg,
    'variable.defaultLibrary': palette.fg,
    type: palette.yellow,
    typeParameter: palette.orange,
    function: palette.blue,
    comment: palette.fgSubtle,
    enumMember: palette.fg,
    class: palette.blue,
    'class.declaration': palette.blue,
    'class.typeHint.builtin': palette.yellow,
    number: palette.orange,
    string: palette.green,
    module: palette.yellow,
    selfParameter: palette.fgAlt,
    'selfParameter.declaration': palette.fgAlt,
  }
}
