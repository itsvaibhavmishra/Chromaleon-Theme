import type { Palette } from '../core/palette'
import { a } from '../core/color'

export interface TokenRule {
  name?: string
  scope: string | string[]
  settings: { foreground?: string; fontStyle?: string }
}

// TextMate scope rules. `italics` is threaded through so the no-italics build is a
// parameter rather than a second file.
export function tokens(p: Palette, italics: boolean): TokenRule[] {
  return [
    {
      name: 'Global settings',
      scope: '',
      settings: { foreground: p.fg },
    },
    {
      name: 'String',
      scope: 'string',
      settings: { foreground: p.green },
    },
    {
      name: 'Punctuation',
      scope: 'punctuation, constant.other.symbol',
      settings: { foreground: p.cyan },
    },
    {
      name: 'String Escape',
      scope: 'constant.character.escape, text.html constant.character.entity.named',
      settings: { foreground: p.fg },
    },
    {
      name: 'Boolean',
      scope: 'constant.language.boolean',
      settings: { foreground: p.pink },
    },
    {
      name: 'Number',
      scope: 'constant.numeric',
      settings: { foreground: p.orange },
    },
    {
      name: 'Variable',
      scope:
        'variable, variable.parameter, support.variable, variable.language, support.constant, meta.definition.variable entity.name.function, meta.function-call.arguments',
      settings: { foreground: p.fg },
    },
    {
      name: 'Other Keyword',
      scope: 'keyword.other',
      settings: { foreground: p.orange },
    },
    {
      name: 'Keyword',
      scope: 'keyword, modifier, variable.language.this, support.type.object, constant.language',
      settings: { foreground: p.cyan },
    },
    {
      name: 'Function call',
      scope: 'entity.name.function, support.function',
      settings: { foreground: p.blue },
    },
    {
      name: 'Storage',
      scope: 'storage.type, storage.modifier, storage.control',
      settings: { foreground: p.purple },
    },
    {
      name: 'Modules',
      scope: 'support.module, support.node',
      settings: { foreground: p.red, fontStyle: italics ? 'italic' : '' },
    },
    {
      name: 'Type',
      scope: 'support.type, constant.other.key',
      settings: { foreground: p.yellow },
    },
    {
      name: 'Type',
      scope: 'entity.name.type, entity.other.inherited-class, entity.other',
      settings: { foreground: p.yellow },
    },
    {
      name: 'Comment',
      scope: 'comment',
      settings: { foreground: p.fgSubtle, fontStyle: italics ? 'italic' : '' },
    },
    {
      name: 'Comment',
      scope: 'comment punctuation.definition.comment',
      settings: { foreground: p.fgSubtle, fontStyle: italics ? 'italic' : '' },
    },
    {
      name: 'Punctuation',
      scope: 'punctuation',
      settings: { foreground: p.cyan },
    },
    {
      name: 'Class',
      scope: 'entity.name, entity.name.type.class, support.type, support.class, meta.use',
      settings: { foreground: p.yellow },
    },
    {
      name: 'Class variable',
      scope: 'variable.object.property, meta.field.declaration entity.name.function',
      settings: { foreground: p.red },
    },
    {
      name: 'Class method',
      scope: 'meta.definition.method entity.name.function',
      settings: { foreground: p.red },
    },
    {
      name: 'Function definition',
      scope: 'meta.function entity.name.function',
      settings: { foreground: p.blue },
    },
    {
      name: 'Template expression',
      scope:
        'template.expression.begin, template.expression.end, punctuation.definition.template-expression.begin, punctuation.definition.template-expression.end',
      settings: { foreground: p.cyan },
    },
    {
      name: 'Reset embedded/template expression colors',
      scope: 'meta.embedded, source.groovy.embedded, meta.template.expression',
      settings: { foreground: p.fg },
    },
    {
      name: 'YAML key',
      scope: 'entity.name.tag.yaml',
      settings: { foreground: p.red },
    },
    {
      name: 'JSON key',
      scope:
        'meta.object-literal.key, meta.object-literal.key string, support.type.property-name.json',
      settings: { foreground: p.red },
    },
    {
      name: 'JSON constant',
      scope: 'constant.language.json',
      settings: { foreground: p.cyan },
    },
    {
      name: 'JSON Key - Level 0',
      scope: 'meta.structure.dictionary.json support.type.property-name.json',
      settings: { foreground: p.purple },
    },
    {
      name: 'JSON Key - Level 1',
      scope:
        'meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json support.type.property-name.json',
      settings: { foreground: p.yellow },
    },
    {
      name: 'JSON Key - Level 2',
      scope:
        'meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json support.type.property-name.json',
      settings: { foreground: p.orange },
    },
    {
      name: 'JSON Key - Level 3',
      scope:
        'meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json support.type.property-name.json',
      settings: { foreground: p.red },
    },
    {
      name: 'JSON Key - Level 4',
      scope:
        'meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json support.type.property-name.json',
      settings: { foreground: p.brown },
    },
    {
      name: 'JSON Key - Level 5',
      scope:
        'meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json support.type.property-name.json',
      settings: { foreground: p.blue },
    },
    {
      name: 'Key - Level 6',
      scope:
        'meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json support.type.property-name.json',
      settings: { foreground: p.pink },
    },
    {
      name: 'JSON Key - Level 7',
      scope:
        'meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json support.type.property-name.json',
      settings: { foreground: p.purple },
    },
    {
      name: 'JSON Key - Level 8',
      scope:
        'meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json meta.structure.dictionary.value.json meta.structure.dictionary.json support.type.property-name.json',
      settings: { foreground: p.green },
    },
    {
      name: 'CSS class',
      scope: 'entity.other.attribute-name.class',
      settings: { foreground: p.yellow },
    },
    {
      name: 'CSS ID',
      scope: 'entity.other.attribute-name.id',
      settings: { foreground: p.orange },
    },
    {
      name: 'CSS tag',
      scope: 'source.css entity.name.tag',
      settings: { foreground: p.yellow },
    },
    {
      name: 'CSS properties',
      scope: 'support.type.property-name.css',
      settings: { foreground: p.fgAlt },
    },
    {
      name: 'HTML tag outer',
      scope: 'meta.tag, punctuation.definition.tag',
      settings: { foreground: p.cyan },
    },
    {
      name: 'HTML tag inner',
      scope: 'entity.name.tag',
      settings: { foreground: p.red },
    },
    {
      name: 'HTML tag attribute',
      scope: 'entity.other.attribute-name',
      settings: { foreground: p.purple },
    },
    {
      name: 'HTML entities',
      scope: 'punctuation.definition.entity.html',
      settings: { foreground: p.fg },
    },
    {
      name: 'Markdown heading',
      scope: 'markup.heading',
      settings: { foreground: p.cyan },
    },
    {
      name: 'Markdown link text',
      scope: 'text.html.markdown meta.link.inline, meta.link.reference',
      settings: { foreground: p.red },
    },
    {
      name: 'Markdown list item',
      scope: 'text.html.markdown beginning.punctuation.definition.list',
      settings: { foreground: p.cyan },
    },
    {
      name: 'Markdown italic',
      scope: 'markup.italic',
      settings: { foreground: p.red, fontStyle: italics ? 'italic' : '' },
    },
    {
      name: 'Markdown bold',
      scope: 'markup.bold',
      settings: { foreground: p.red, fontStyle: 'bold' },
    },
    {
      name: 'Markdown bold italic',
      scope: 'markup.bold markup.italic, markup.italic markup.bold',
      settings: { foreground: p.red, fontStyle: italics ? 'italic bold' : 'bold' },
    },
    {
      name: 'Markdown code block',
      scope: 'markup.fenced_code.block.markdown punctuation.definition.markdown',
      settings: { foreground: p.green },
    },
    {
      name: 'Markdown inline code',
      scope: 'markup.inline.raw.string.markdown',
      settings: { foreground: p.green },
    },
    {
      name: 'Markdown - Blockquote',
      scope: 'markup.quote',
      settings: { foreground: p.cyan, fontStyle: italics ? 'italic' : '' },
    },
    {
      name: 'Markdown - Blockquote Punctuation',
      scope: 'punctuation.definition.quote',
      settings: { foreground: p.pink },
    },
    {
      name: 'INI property name',
      scope: 'keyword.other.definition.ini',
      settings: { foreground: p.red },
    },
    {
      name: 'INI section title',
      scope: 'entity.name.section.group-title.ini',
      settings: { foreground: p.cyan },
    },
    {
      name: 'C# class',
      scope: 'source.cs meta.class.identifier storage.type',
      settings: { foreground: p.yellow },
    },
    {
      name: 'C# class method',
      scope: 'source.cs meta.method.identifier entity.name.function',
      settings: { foreground: p.red },
    },
    {
      name: 'C# function call',
      scope: 'source.cs meta.method-call meta.method, source.cs entity.name.function',
      settings: { foreground: p.blue },
    },
    {
      name: 'C# type',
      scope: 'source.cs storage.type',
      settings: { foreground: p.yellow },
    },
    {
      name: 'C# return type',
      scope: 'source.cs meta.method.return-type',
      settings: { foreground: p.yellow },
    },
    {
      name: 'C# preprocessor',
      scope: 'source.cs meta.preprocessor',
      settings: { foreground: p.fgSubtle },
    },
    {
      name: 'C# namespace',
      scope: 'source.cs entity.name.type.namespace',
      settings: { foreground: p.fg },
    },
    {
      name: 'JSX Text',
      scope: 'meta.jsx.children, SXNested',
      settings: { foreground: p.fg },
    },
    {
      name: 'JSX Components name',
      scope: 'support.class.component',
      settings: { foreground: p.yellow },
    },
    {
      name: 'C-related Block Level Variables',
      scope: 'source.cpp meta.block variable.other',
      settings: { foreground: p.fg },
    },
    {
      name: 'Member Access Meta',
      scope: 'source.python meta.member.access.python',
      settings: { foreground: p.red },
    },
    {
      name: 'Function Call',
      scope: 'source.python meta.function-call.python, meta.function-call.arguments',
      settings: { foreground: p.blue },
    },
    {
      name: 'Blocks',
      scope: 'meta.block',
      settings: { foreground: p.red },
    },
    {
      name: 'Function Call',
      scope: 'entity.name.function.call, support.function.builtin',
      settings: { foreground: p.blue },
    },
    {
      name: 'Namespaces',
      scope: 'source.php support.other.namespace, source.php meta.use support.class',
      settings: { foreground: p.fg },
    },
    {
      name: 'Constant keywords',
      scope: 'constant.keyword',
      settings: { foreground: p.cyan, fontStyle: italics ? 'italic' : '' },
    },
    {
      name: 'Entity name',
      scope: 'entity.name.function',
      settings: { foreground: p.blue },
    },
    {
      name: 'Constant Placeholder',
      scope: ['constant.other.placeholder'],
      settings: { foreground: p.red },
    },
    {
      name: 'Markup Deleted',
      scope: ['markup.deleted'],
      settings: { foreground: p.red },
    },
    {
      name: 'Markup Inserted',
      scope: ['markup.inserted'],
      settings: { foreground: p.green },
    },
    {
      name: 'Markup Underline',
      scope: ['markup.underline'],
      settings: { fontStyle: 'underline' },
    },
    {
      name: 'Keyword Control',
      scope: ['keyword.control'],
      settings: { foreground: p.cyan, fontStyle: italics ? 'italic' : '' },
    },
    {
      name: 'Parameter',
      scope: ['variable.parameter'],
      settings: { fontStyle: italics ? 'italic' : '' },
    },
    {
      name: 'Python - Self Parameter',
      scope: ['variable.parameter.function.language.special.self.python'],
      settings: { foreground: p.fg, fontStyle: italics ? 'italic' : '' },
    },
    {
      name: 'Python - Format Placeholder',
      scope: ['constant.character.format.placeholder.other.python'],
      settings: { foreground: p.orange },
    },
    {
      name: 'Markdown - Fenced Language',
      scope: ['markup.fenced_code.block'],
      settings: { foreground: a(p.fg, 'e6') },
    },
  ]
}
