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
export interface DerivationParamsInterface {
  readonly 'hue'?: number;
  readonly 'sat'?: number;
  readonly 'light'?: number;
}

export const DERIVATION_PARAMS: Readonly<Record<string, DerivationParamsInterface>> = {
  // Slightly brighter, concrete
  'class': {
    'light': 5,
    'sat': 5,
  },
  // From palette.comment — pass-through
  'comment': {},
  // Meta, annotation feel
  'decorator': {
    'hue': -35,
    'sat': 10,
  },
  // Distinct from class
  'enum': {
    'hue': -25,
    'sat': 5,
  },
  // From palette.constant — pass-through
  'enumMember': {},
  // Reactive, callback feel
  'event': {
    'hue': 25,
    'sat': 8,
  },
  // Base color — pass-through
  'function': {},
  // Shifted, abstract feel
  'interface': {
    'hue': 20,
    'sat': -8,
  },
  // Base color — pass-through
  'keyword': {},
  // Warmer, stands out in goto/break
  'label': {
    'hue': 15,
    'light': 5,
  },
  // Slightly cooler, preprocessor feel
  'macro': {
    'hue': -20,
    'sat': 5,
  },
  // Slightly brighter, OOP context
  'method': {
    'light': 8,
    'sat': 5,
  },
  // Muted, organizational
  'namespace': {
    'light': -5,
    'sat': -20,
  },
  // From palette.number — pass-through
  'number': {},
  // Derived from muted/foreground mix — handled in task
  'operator': {},
  // Input, argument feel
  'parameter': {
    'hue': 12,
    'light': 3,
  },
  // Member access, slightly muted
  'property': {
    'light': -5,
    'sat': -5,
  },
  // Distinct pattern feel
  'regexp': {
    'hue': -45,
    'sat': 15,
  },
  // Base color — pass-through
  'string': {},
  // Cooler, low-level feel
  'struct': {
    'hue': -10,
    'light': -3,
  },
  // Base color — pass-through
  'type': {},
  // Generic, abstract
  'typeParameter': {
    'hue': 35,
    'sat': -5,
  },
  // Base color — pass-through
  'variable': {},
} as const;

/**
 * Family root mapping: which role supplies the base hue for each token type.
 * Keys match the 23 VS Code token type names in TOKEN_TYPES.
 */
export const TOKEN_FAMILY: Readonly<Record<string, string>> = {
  'class':         'type',
  'comment':       'comment',
  'decorator':     'function',
  'enum':          'type',
  'enumMember':    'constant',
  'event':         'function',
  'function':      'function',
  'interface':     'type',
  'keyword':       'keyword',
  'label':         'keyword',
  'macro':         'keyword',
  'method':        'function',
  'namespace':     'type',
  'number':        'number',
  'operator':      'muted',
  'parameter':     'variable',
  'property':      'variable',
  'regexp':        'string',
  'string':        'string',
  'struct':        'type',
  'type':          'type',
  'typeParameter': 'type',
  'variable':      'variable',
} as const;

/** The 23 VS Code semantic token type names (insertion order = VS Code rendering order). */
export const TOKEN_TYPES = [
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
] as const;

/** The 10 VS Code semantic token modifier names. */
export const TOKEN_MODIFIERS = [
  'declaration',
  'definition',
  'readonly',
  'static',
  'deprecated',
  'abstract',
  'async',
  'modification',
  'documentation',
  'defaultLibrary',
] as const;
