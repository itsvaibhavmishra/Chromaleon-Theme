import type { Palette } from '@/core/palette'

export function semantic(p: Palette, _italics: boolean): Record<string, unknown> {
  return {
    variable: p.fg,
    'variable.constant': p.fg,
    'variable.readonly': p.fg,
    'parameter.declaration': p.fg,
    'variable.defaultLibrary': p.fg,
    type: p.yellow,
    typeParameter: p.orange,
    function: p.blue,
    comment: p.fgSubtle,
    enumMember: p.fg,
    class: p.blue,
    'class.declaration': p.blue,
    'class.typeHint.builtin': p.yellow,
    number: p.orange,
    string: p.green,
    module: p.yellow,
    selfParameter: p.fgAlt,
    'selfParameter.declaration': p.fgAlt,
  }
}
