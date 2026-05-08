// Lifted from vscode-arcade-blaster/dev/themes/tools/semanticTokens.ts:14-64

/**
 * FONT_STYLES maps SemanticPaletteInterface keys to their default TextMate font-style string.
 *
 * Supported values: 'italic' | 'bold' | 'underline' | 'strikethrough'
 * May be combined with spaces: 'bold italic', 'bold underline', etc.
 *
 * Keys that do not appear here render with no special style.
 */
export const FONT_STYLES: Readonly<Partial<Record<string, string>>> = {
  'attribute':       'italic',
  'builtin':         'bold',

  // Comments & Documentation
  'comment':         'italic',
  // Immutable values — bold for emphasis
  'constant':        'bold',

  // CSS
  'cssPseudo':       'italic',
  // Metaprogramming
  'decorator':       'italic',

  // Invalid/Deprecated — visual warnings
  'deprecated':      'strikethrough',
  'docComment':      'italic',

  'enumMember':      'bold',
  // Special syntax
  'escape':          'bold',
  // Types & Interfaces — distinguish from classes
  'interface':       'italic',
  'invalid':         'strikethrough',

  'macro':           'bold',
  // Markdown
  'markdownBold':    'bold',
  'markdownHeading': 'bold',

  'markdownItalic':  'italic',
  'markdownLink':    'underline',

  'markdownQuote':   'italic',

  'parameter':        'italic',
  'propertyReadonly': 'bold',
  // HTML/XML
  'tagAttribute':    'italic',
  // Special variables
  'this':            'italic',
  'typeParameter':   'italic',

  'variableReadonly': 'bold',
} as const;
