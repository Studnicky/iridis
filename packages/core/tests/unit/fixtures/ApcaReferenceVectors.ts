/** Expected Lc values: Myndex apca-w3 0.1.9 APCAcontrast(txtY, bgY) evaluated literally. */
export const APCA_REFERENCE_VECTORS = Object.freeze({
  'tolerance': 1e-9,
  'vectors': [
    { 'background': 1,      'expected': 106.04066682868873,  'label': 'normal black on white',            'text': 0 },
    { 'background': 0.8,    'expected': 52.35825787418739,   'label': 'normal mid pair',                  'text': 0.2 },
    { 'background': 0.9,    'expected': 84.0994501522889,    'label': 'normal dark text on light',        'text': 0.05 },
    { 'background': 0,      'expected': -107.8847261150986,  'label': 'reverse white on black',           'text': 1 },
    { 'background': 0.05,   'expected': -87.8268370316205,   'label': 'reverse near-black background',    'text': 0.9 },
    { 'background': 0.2,    'expected': -56.523197080580445, 'label': 'reverse light text on dark',       'text': 0.8 },
    { 'background': 0.1,    'expected': -45.95506478051114,  'label': 'reverse mid text on dark',         'text': 0.5 },
    { 'background': 0.1,    'expected': -54.83221051081794,  'label': 'reverse brighter mid text',        'text': 0.6 },
    { 'background': 0.01,   'expected': -104.89449060523965, 'label': 'reverse with clamped background',  'text': 1 },
    { 'background': 0.2,    'expected': 31.276123172811708,  'label': 'normal with clamped text',         'text': 0.02 },
    { 'background': 0.02,   'expected': -30.31854507932788,  'label': 'reverse with clamped background 2', 'text': 0.2 },
    { 'background': 0.35,   'expected': 0,                    'label': 'normal below low clip',            'text': 0.3 },
    { 'background': 0.33,   'expected': 0,                    'label': 'normal below low clip near',       'text': 0.3 },
    { 'background': 0.3,    'expected': 0,                    'label': 'reverse below low clip',           'text': 0.33 },
    { 'background': 0.45,   'expected': 0,                    'label': 'reverse below low clip far',       'text': 0.5 },
    { 'background': 0.3004, 'expected': 0,                    'label': 'normal delta below minimum',       'text': 0.3 },
    { 'background': 0.3,    'expected': 0,                    'label': 'reverse delta below minimum',      'text': 0.3004 },
    { 'background': 0.5,    'expected': 0,                    'label': 'equal luminance',                  'text': 0.5 },
    { 'background': 0.02,   'expected': 0,                    'label': 'both clamped, close',              'text': 0.01 },
    { 'background': 0.01,   'expected': 0,                    'label': 'clamped black pair',               'text': 0.005 }
  ]
});
