// Lifted from vscode-arcade-blaster/dev/themes/tools/tokenDerivation.ts:35-124

/** Derivation parameters for each VS Code token type relative to its family root.
 *
 * Family assignments:
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
import type { DerivationParamsInterfaceType } from '../types/index.ts';

const DERIVATION_PARAMS: Readonly<Record<string, DerivationParamsInterfaceType>> = {
  // From palette.constant: pass-through (true/false/null read as language constants)
  'boolean': {
    'hue': undefined,
    'light': undefined,
    'sat': undefined
  },
  // Slightly brighter, concrete
  'class': {
    'hue': undefined,
    'light': 5,
    'sat': 5
  },
  // From palette.comment: pass-through
  'comment': {
    'hue': undefined,
    'light': undefined,
    'sat': undefined
  },
  // From palette.constant: pass-through
  'constant': {
    'hue': undefined,
    'light': undefined,
    'sat': undefined
  },
  // Meta, annotation feel
  'decorator': {
    'hue': -35,
    'light': undefined,
    'sat': 10
  },
  // Distinct from class
  'enum': {
    'hue': -25,
    'light': undefined,
    'sat': 5
  },
  // From palette.constant: pass-through
  'enumMember': {
    'hue': undefined,
    'light': undefined,
    'sat': undefined
  },
  // Reactive, callback feel
  'event': {
    'hue': 25,
    'light': undefined,
    'sat': 8
  },
  // Base color: pass-through
  'function': {
    'hue': undefined,
    'light': undefined,
    'sat': undefined
  },
  // Shifted, abstract feel
  'interface': {
    'hue': 20,
    'light': undefined,
    'sat': -8
  },
  // From palette.property derivation: JSON object keys read like property names
  'jsonKey': {
    'hue': undefined,
    'light': -5,
    'sat': -5
  },
  // Base color: pass-through
  'keyword': {
    'hue': undefined,
    'light': undefined,
    'sat': undefined
  },
  // Warmer, stands out in goto/break
  'label': {
    'hue': 15,
    'light': 5,
    'sat': undefined
  },
  // Slightly cooler, preprocessor feel
  'macro': {
    'hue': -20,
    'light': undefined,
    'sat': 5
  },
  // Slightly brighter, OOP context
  'method': {
    'hue': undefined,
    'light': 8,
    'sat': 5
  },
  // Muted, organizational
  'namespace': {
    'hue': undefined,
    'light': -5,
    'sat': -20
  },
  // From palette.number: pass-through
  'number': {
    'hue': undefined,
    'light': undefined,
    'sat': undefined
  },
  // Derived from muted/foreground mix; handled in task
  'operator': {
    'hue': undefined,
    'light': undefined,
    'sat': undefined
  },
  // Input, argument feel
  'parameter': {
    'hue': 12,
    'light': 3,
    'sat': undefined
  },
  // Member access, slightly muted
  'property': {
    'hue': undefined,
    'light': -5,
    'sat': -5
  },
  // From palette.muted: pass-through (braces, colons, commas read as chrome, not content)
  'punctuation': {
    'hue': undefined,
    'light': undefined,
    'sat': undefined
  },
  // Distinct pattern feel
  'regexp': {
    'hue': -45,
    'light': undefined,
    'sat': 15
  },
  // Base color: pass-through
  'string': {
    'hue': undefined,
    'light': undefined,
    'sat': undefined
  },
  // Cooler, low-level feel
  'struct': {
    'hue': -10,
    'light': -3,
    'sat': undefined
  },
  // Base color: pass-through
  'type': {
    'hue': undefined,
    'light': undefined,
    'sat': undefined
  },
  // Generic, abstract
  'typeParameter': {
    'hue': 35,
    'light': undefined,
    'sat': -5
  },
  // Base color: pass-through
  'variable': {
    'hue': undefined,
    'light': undefined,
    'sat': undefined
  }
} as const;

/**
 * Family root mapping: which role supplies the base hue for each token type.
 * Keys match the entries in TOKEN_TYPES: the 23 standard VS Code semantic
 * token type names, plus a few TextMate-only categories ('boolean',
 * 'jsonKey', 'punctuation') that have no LSP semantic-token equivalent but
 * still need a derived baseToken so EmitVscodeThemeJson emits a tokenColors
 * rule for their SCOPE_MAPPINGS entry instead of silently skipping it.
 */
const TOKEN_FAMILY: Readonly<Record<string, string>> = {
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
} as const;

/**
 * The 23 standard VS Code semantic token type names plus 'boolean',
 * 'jsonKey', and 'punctuation' (TextMate-only, see TOKEN_FAMILY doc above).
 * Insertion order = VS Code rendering order for the standard 23.
 */
const TOKEN_TYPES = [
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
] as const;

/** The 10 VS Code semantic token modifier names. */
const TOKEN_MODIFIERS = [
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
] as const;

/** Namespaced data bag for VS Code token derivation constants. */
export const VscodeTokenData = {
  'DERIVATION_PARAMS': DERIVATION_PARAMS,
  'TOKEN_FAMILY':      TOKEN_FAMILY,
  'TOKEN_MODIFIERS':   TOKEN_MODIFIERS,
  'TOKEN_TYPES':       TOKEN_TYPES
} as const;
