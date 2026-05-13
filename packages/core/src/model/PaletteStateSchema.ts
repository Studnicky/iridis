export const PaletteStateSchema = {
  '$id':       'https://studnicky.dev/iridis/PaletteState',
  'type':      'object',
  'required':  ['input', 'runtime', 'colors', 'roles', 'variants', 'outputs', 'metadata'],
  'additionalProperties': false,
  'properties': {
    'input': {
      'type':     'object',
      'description': 'Verbatim caller input, frozen at run start.',
    },
    'runtime': {
      'type':        'object',
      'description': 'Cross-output runtime toggles (framing, colorSpace, plugin extras). Read by emit:* tasks across plugins.',
      'additionalProperties': false,
      'properties': {
        'framing':    { 'type': 'string', 'enum': ['dark', 'light'] },
        'colorSpace': { 'type': 'string', 'enum': ['srgb', 'displayP3'] },
        'extra':      { 'type': 'object', 'additionalProperties': true },
      },
    },
    'colors': {
      'type':  'array',
      'items': { '$ref': 'https://studnicky.dev/iridis/ColorRecord' },
      'description': 'Canonical intake colors after intake:* tasks normalize into ColorRecord.',
    },
    'roles': {
      'type': 'object',
      'description': 'Role name → ColorRecord. Populated by resolve:roles, mutated by enforce:* tasks.',
      'additionalProperties': { '$ref': 'https://studnicky.dev/iridis/ColorRecord' },
    },
    'variants': {
      'type': 'object',
      'description': 'Variant name (light/dark/dim/debug/...) → role-shaped record.',
      'additionalProperties': {
        'type': 'object',
        'additionalProperties': { '$ref': 'https://studnicky.dev/iridis/ColorRecord' },
      },
    },
    'outputs': {
      'type': 'object',
      'description': 'Output namespace owned by emit:* tasks. Each emitter writes its slot.',
      'additionalProperties': true,
    },
    'metadata': {
      'type': 'object',
      'description': 'Run-scoped metadata (timings, contrast reports, role schema in use, etc.).',
      'additionalProperties': true,
    },
  },
} as const;
