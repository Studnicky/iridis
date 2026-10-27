// Lifted from vscode-arcade-blaster/dev/themes/tools/tokenDerivation.ts:35-124

/**
 * Namespaced data bag for VS Code token derivation constants.
 *
 * Family assignments (`TOKEN_FAMILY`):
 *   keyword  → keyword, macro, label
 *   type     → class, enum, interface, struct, typeParameter, type, namespace
 *   function → function, method, decorator, event
 *   variable → variable, parameter, property
 *   string   → string, regexp
 *   number   → number   (pass-through)
 *   constant → enumMember (pass-through)
 *   comment  → comment  (pass-through)
 *   muted    → operator (mix with foreground)
 */
export const VscodeTokenData: {
  readonly 'TOKEN_FAMILY': Readonly<Record<string, string>>;
  readonly 'TOKEN_MODIFIERS': readonly string[];
  readonly 'TOKEN_TYPES': readonly string[];
} = {
  /**
   * Family root mapping: which role supplies the base hue for each token type.
   * Keys match the entries in TOKEN_TYPES: the 23 standard VS Code semantic
   * token type names, plus a few TextMate-only categories ('boolean',
   * 'jsonKey', 'punctuation') that have no LSP semantic-token equivalent but
   * still need a derived baseToken so EmitVscodeThemeJson emits a tokenColors
   * rule for their SCOPE_MAPPINGS entry instead of silently skipping it.
   */
  'TOKEN_FAMILY': {
    'boolean':       'constant',
    'class':         'type',
    'comment':       'comment',
    'constant':      'constant',
    'decorator':     'function',
    'enum':          'type',
    'enumMember':    'constant',
    'event':         'function',
    'function':      'function',
    'interface':     'type',
    'jsonKey':       'variable',
    'keyword':       'keyword',
    'label':         'keyword',
    'macro':         'keyword',
    'method':        'function',
    'namespace':     'type',
    'number':        'number',
    'operator':      'muted',
    'parameter':     'variable',
    'property':      'variable',
    'punctuation':   'muted',
    'regexp':        'string',
    'string':        'string',
    'struct':        'type',
    'type':          'type',
    'typeParameter': 'type',
    'variable':      'variable'
  },

  /**
   * The 10 VS Code semantic token modifier names.
   */
  'TOKEN_MODIFIERS': [
    'declaration',
    'definition',
    'readonly',
    'static',
    'deprecated',
    'abstract',
    'async',
    'modification',
    'documentation',
    'defaultLibrary'
  ],

  /**
   * The 23 standard VS Code semantic token type names plus 'boolean',
   * 'jsonKey', and 'punctuation' (TextMate-only, see TOKEN_FAMILY doc above).
   * Insertion order = VS Code rendering order for the standard 23.
   */
  'TOKEN_TYPES': [
    'namespace',
    'class',
    'enum',
    'interface',
    'struct',
    'typeParameter',
    'type',
    'parameter',
    'variable',
    'property',
    'enumMember',
    'decorator',
    'event',
    'function',
    'method',
    'macro',
    'label',
    'comment',
    'string',
    'keyword',
    'number',
    'regexp',
    'operator',
    'boolean',
    'constant',
    'jsonKey',
    'punctuation'
  ]
};
