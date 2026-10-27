/** Expected Lc values: Myndex apca-w3 0.1.9 APCAcontrast(txtY, bgY) evaluated literally. */
export const APCA_REFERENCE_VECTORS = Object.freeze({
  // Dark-framing Lc from 8-bit colours through reference sRGBtoY and APCAcontrast.
  'darkFraming': [
    { 'background': [4, 4, 4],    'expected': -94.38914569613311,  'text': [235, 232, 254] },
    { 'background': [8, 8, 8],    'expected': -94.32024680704866,  'text': [235, 232, 254] },
    { 'background': [12, 12, 12], 'expected': -94.18218772225195,  'text': [235, 232, 254] },
    { 'background': [6, 8, 11],   'expected': -94.32221268614526,  'text': [235, 232, 254] },
    { 'background': [0, 0, 0],    'expected': -94.40534291791717,  'text': [235, 232, 254] },
    { 'background': [4, 4, 4],    'expected': -107.86853596131441, 'text': [255, 255, 255] },
    { 'background': [10, 10, 10], 'expected': -107.73992841074143, 'text': [255, 255, 255] },
    { 'background': [4, 4, 4],    'expected': -35.07845467800761,  'text': [143, 99, 247] },
    { 'background': [12, 12, 12], 'expected': -34.87149670412644,  'text': [143, 99, 247] },
    { 'background': [8, 8, 8],    'expected': -27.3685465592242,   'text': [114, 108, 141] },
    { 'background': [10, 10, 10], 'expected': -27.30883789773567,  'text': [114, 108, 141] },
    { 'background': [8, 8, 8],    'expected': 0,                   'text': [20, 20, 20] }
  ],
  // Channels are 8-bit values; expected Y = reference sRGBtoY.
  'luminances': [
    { 'channels': [0, 0, 0],     'expected': 0 },
    { 'channels': [4, 4, 4],     'expected': 0.00004669254968393557 },
    { 'channels': [8, 8, 8],     'expected': 0.0002464447547284376 },
    { 'channels': [10, 10, 10],  'expected': 0.00042102085647238583 },
    { 'channels': [12, 12, 12],  'expected': 0.000652136639056546 },
    { 'channels': [20, 20, 20],  'expected': 0.00222216140286277 },
    { 'channels': [30, 30, 30],  'expected': 0.005880234173784533 },
    { 'channels': [10, 20, 30],  'expected': 0.0021031290336988575 },
    { 'channels': [4, 12, 8],    'expected': 0.0004940942928346671 },
    { 'channels': [255, 128, 0], 'expected': 0.34944766368731417 },
    { 'channels': [12, 0, 30],   'expected': 0.000563097635407544 }
  ],
  'rejected': [
    { 'background': 0.5, 'text': Number.NaN },
    { 'background': Number.NaN, 'text': 0.5 },
    { 'background': 0.5, 'text': -0.1 },
    { 'background': 1.2, 'text': 0.5 }
  ],
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
