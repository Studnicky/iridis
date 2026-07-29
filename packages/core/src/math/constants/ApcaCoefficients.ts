/** APCA-W3 0.0.98G-4g luminance/Lc coefficients, shared by `ApcaLc.apply()`.
 *  Source: https://github.com/Myndex/SAPC-APCA */
export const APCA_COEFFICIENTS = {
  'SA98G_CLAMP':    0.022,
  'SA98G_CLAMP_P':  1.414,
  'SA98G_LOW_CLIP': 0.001,
  'SA98G_NORM_BG':  0.56,
  'SA98G_NORM_TXT': 0.57,
  'SA98G_OFFSET':   0.027,
  'SA98G_SCALE':    1.14
} as const;
