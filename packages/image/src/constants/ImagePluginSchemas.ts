const GALLERY_HISTOGRAM = {
  'additionalProperties': false,
  'properties': {
    'binCount':    { 'minimum': 0, 'type': 'number' },
    'bins':        { 'type': 'array' },
    'totalPixels': { 'minimum': 0, 'type': 'number' }
  },
  'type': 'object'
} as const;

const GALLERY_DOMINANT_COLORS = {
  'type': 'array'
} as const;

const GALLERY_HARMONIZED = {
  'type': 'boolean'
} as const;

const GALLERY_CANDIDATES = {
  'items': {
    'additionalProperties': false,
    'properties': {
      'algorithm': { 'type': 'string' },
      'colors':    { 'type': 'array' },
      'k':         { 'minimum': 0, 'type': 'number' },
      'label':     { 'type': 'string' }
    },
    'required': ['algorithm', 'k', 'label', 'colors'],
    'type': 'object'
  },
  'type': 'array'
} as const;

export const IMAGE_PLUGIN_SCHEMAS = {
  'GALLERY_CANDIDATES':      GALLERY_CANDIDATES,
  'GALLERY_DOMINANT_COLORS': GALLERY_DOMINANT_COLORS,
  'GALLERY_HARMONIZED':      GALLERY_HARMONIZED,
  'GALLERY_HISTOGRAM':       GALLERY_HISTOGRAM
} as const;
