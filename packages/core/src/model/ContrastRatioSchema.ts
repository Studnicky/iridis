/** Canonical ratio domains for the supported contrast algorithms. */
export namespace ContrastRatioSchema {
  export const wcag21 = {
    'maximum': 21,
    'minimum': 1,
    'type': 'number'
  } as const;

  export const apca = {
    'maximum': 108,
    'minimum': 0,
    'type': 'number'
  } as const;

  export const permissive = {
    'maximum': apca.maximum,
    'minimum': apca.minimum,
    'type': 'number'
  } as const;
}
