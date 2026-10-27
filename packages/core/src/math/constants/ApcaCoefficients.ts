/** Myndex APCA-W3 0.1.9 (SA98G) Lc coefficients, consumed by `ApcaLc.apply()`.
 *  Source: https://github.com/Myndex/apca-w3 */
export const APCA_COEFFICIENTS = {
  'SA98G_CLAMP':       0.022,
  'SA98G_CLAMP_P':     1.414,
  'SA98G_DELTA_Y_MIN': 0.0005,
  'SA98G_LOW_CLIP':    0.1,
  'SA98G_MAIN_TRC':    2.4,
  'SA98G_NORM_BG':     0.56,
  'SA98G_NORM_TXT':    0.57,
  'SA98G_OFFSET':      0.027,
  'SA98G_REV_BG':      0.65,
  'SA98G_REV_TXT':     0.62,
  'SA98G_SCALE':       1.14,
  'SA98G_Y_MAX':       1.1
} as const;
