export const PaletteStateSchema = {
  '$id':       'https://studnicky.dev/iridis/PaletteState',
  'additionalProperties': false,
  'properties': {
    'colors': {
      'description': 'Canonical intake colors after intake:* tasks normalize into ColorRecord.',
      'items': { '$ref': 'https://studnicky.dev/iridis/ColorRecord' },
      'type':  'array'
    },
    'input': {
      'description': 'Verbatim caller input, frozen at run start.',
      'type':     'object'
    },
    'metadata': {
      'additionalProperties': true,
      'description': 'Run-scoped metadata (timings, contrast reports, role schema in use, etc.).',
      'type': 'object'
    },
    'outputs': {
      'additionalProperties': true,
      'description': 'Output namespace owned by emit:* tasks. Each emitter writes its slot.',
      'type': 'object'
    },
    'roles': {
      'additionalProperties': { '$ref': 'https://studnicky.dev/iridis/ColorRecord' },
      'description': 'Role name → ColorRecord. Populated by resolve:roles, mutated by enforce:* tasks.',
      'type': 'object'
    },
    'runtime': {
      'additionalProperties': false,
      'description': 'Cross-output runtime toggles (framing, colorSpace, plugin extras). Read by emit:* tasks across plugins.',
      'properties': {
        'colorSpace': { 'enum': ['srgb', 'displayP3'], 'type': 'string' },
        'extra':      { 'additionalProperties': true, 'type': 'object' },
        'framing':    { 'enum': ['dark', 'light'], 'type': 'string' }
      },
      'type':        'object'
    },
    'variants': {
      'additionalProperties': {
        'additionalProperties': { '$ref': 'https://studnicky.dev/iridis/ColorRecord' },
        'type': 'object'
      },
      'description': 'Variant name (light/dark/dim/debug/...) → role-shaped record.',
      'type': 'object'
    }
  },
  'required':  ['input', 'runtime', 'colors', 'roles', 'variants', 'outputs', 'metadata'],
  'type':      'object'
} as const;
