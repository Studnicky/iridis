/**
 * shikiTheme.ts
 *
 * Shiki theme JSON that uses CSS var() references for every color, so
 * syntax highlighting tracks the iridis-driven --iridis-syntax-* tokens
 * just like the rest of the docs chrome. The engine writes those tokens
 * via stores/applyConfigToDocument.ts at runtime.
 *
 * Both light and dark variants exist because vitepress's dual-theme
 * support attaches both --shiki-light and --shiki-dark to every token;
 * we set both to the same var() so the active iridis-framing wins via
 * the variable's value (set by data-iridis-framing on the html element
 * if we want per-framing branching later).
 */

export const iridisShikiTheme = {
  'name':           'iridis',
  'displayName':    'Iridis',
  'type':           'dark',
  'colors': {
    'editor.background': 'var(--iridis-bg-soft)',
    'editor.foreground': 'var(--iridis-syntax-text)',
  },
  'tokenColors': [
    { 'scope': ['comment', 'punctuation.definition.comment', 'string.comment'],
      'settings': { 'foreground': 'var(--iridis-syntax-comment)' } },
    { 'scope': ['constant', 'entity.name.constant', 'variable.other.constant', 'variable.language', 'meta.definition.variable'],
      'settings': { 'foreground': 'var(--iridis-syntax-constant)' } },
    { 'scope': ['constant.numeric', 'entity.name.numeric'],
      'settings': { 'foreground': 'var(--iridis-syntax-number)' } },
    { 'scope': ['constant.character.escape', 'constant.other.placeholder'],
      'settings': { 'foreground': 'var(--iridis-syntax-escape)' } },
    { 'scope': ['entity', 'entity.name'],
      'settings': { 'foreground': 'var(--iridis-syntax-function)' } },
    { 'scope': ['variable.parameter.function'],
      'settings': { 'foreground': 'var(--iridis-syntax-text)' } },
    { 'scope': ['entity.name.tag', 'tag.name'],
      'settings': { 'foreground': 'var(--iridis-syntax-tag)' } },
    { 'scope': ['keyword', 'storage', 'storage.type'],
      'settings': { 'foreground': 'var(--iridis-syntax-keyword)' } },
    { 'scope': ['storage.modifier.package', 'storage.modifier.import', 'storage.type.java'],
      'settings': { 'foreground': 'var(--iridis-syntax-text)' } },
    { 'scope': ['string', 'punctuation.definition.string', 'string punctuation.section.embedded source'],
      'settings': { 'foreground': 'var(--iridis-syntax-string)' } },
    { 'scope': ['support', 'support.type', 'support.class', 'support.function', 'support.variable'],
      'settings': { 'foreground': 'var(--iridis-syntax-type)' } },
    { 'scope': ['meta.property-name'],
      'settings': { 'foreground': 'var(--iridis-syntax-property)' } },
    { 'scope': ['variable'],
      'settings': { 'foreground': 'var(--iridis-syntax-variable)' } },
    { 'scope': ['variable.other'],
      'settings': { 'foreground': 'var(--iridis-syntax-text)' } },
    { 'scope': ['punctuation', 'meta.brace', 'meta.delimiter'],
      'settings': { 'foreground': 'var(--iridis-syntax-punctuation)' } },
    { 'scope': ['invalid.broken'],
      'settings': { 'foreground': 'var(--iridis-syntax-error)' } },
    { 'scope': ['invalid.deprecated'],
      'settings': { 'foreground': 'var(--iridis-syntax-error)' } },
    { 'scope': ['invalid.illegal'],
      'settings': { 'foreground': 'var(--iridis-syntax-error)' } },
    { 'scope': ['carriage-return'],
      'settings': { 'foreground': 'var(--iridis-syntax-comment)' } },
    { 'scope': ['markup.bold', 'punctuation.definition.bold'],
      'settings': { 'foreground': 'var(--iridis-syntax-keyword)' } },
    { 'scope': ['markup.heading', 'markup.heading entity.name'],
      'settings': { 'foreground': 'var(--iridis-syntax-keyword)' } },
    { 'scope': ['markup.italic'],
      'settings': { 'foreground': 'var(--iridis-syntax-keyword)' } },
    { 'scope': ['markup.inline.raw'],
      'settings': { 'foreground': 'var(--iridis-syntax-string)' } },
    { 'scope': ['markup.list.numbered.bullet', 'markup.list.unnumbered.bullet'],
      'settings': { 'foreground': 'var(--iridis-syntax-comment)' } },
    { 'scope': ['markup.deleted'],
      'settings': { 'foreground': 'var(--iridis-syntax-error)' } },
    { 'scope': ['markup.inserted'],
      'settings': { 'foreground': 'var(--iridis-syntax-string)' } },
    { 'scope': ['markup.changed'],
      'settings': { 'foreground': 'var(--iridis-syntax-keyword)' } },
    { 'scope': ['punctuation.definition.heading'],
      'settings': { 'foreground': 'var(--iridis-syntax-keyword)' } },
  ],
} as const;
