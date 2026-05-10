export { ColorRecordFactory, colorRecordFactory } from './ColorRecordFactory.ts';
export { OklchToRgb,       oklchToRgb       } from './OklchToRgb.ts';
export { RgbToOklch,       rgbToOklch       } from './RgbToOklch.ts';
export { HslToRgb,         hslToRgb         } from './HslToRgb.ts';
export { RgbToHsl,         rgbToHsl         } from './RgbToHsl.ts';
export { HexToRgb,         hexToRgb         } from './HexToRgb.ts';
export { RgbToHex,         rgbToHex         } from './RgbToHex.ts';
export { SrgbToLinear,     srgbToLinear     } from './SrgbToLinear.ts';
export { LinearToSrgb,     linearToSrgb     } from './LinearToSrgb.ts';
export { SrgbToDisplayP3,  srgbToDisplayP3  } from './SrgbToDisplayP3.ts';
export { DisplayP3ToSrgb,  displayP3ToSrgb  } from './DisplayP3ToSrgb.ts';
export { MixOklch,         mixOklch         } from './MixOklch.ts';
export { MixHsl,           mixHsl           } from './MixHsl.ts';
export { MixSrgb,          mixSrgb          } from './MixSrgb.ts';
export { Lighten,          lighten          } from './Lighten.ts';
export { Darken,           darken           } from './Darken.ts';
export { Saturate,         saturate         } from './Saturate.ts';
export { Desaturate,       desaturate       } from './Desaturate.ts';
export { HueShift,         hueShift         } from './HueShift.ts';
export { ContrastWcag21,   contrastWcag21   } from './ContrastWcag21.ts';
export { ContrastApca,     contrastApca     } from './ContrastApca.ts';
export { DeltaE2000,       deltaE2000       } from './DeltaE2000.ts';
export { EnsureContrast,   ensureContrast   } from './EnsureContrast.ts';
export { ClusterMedianCut, clusterMedianCut } from './ClusterMedianCut.ts';
export { Luminance,        luminance        } from './Luminance.ts';
export { ContrastText,     contrastText     } from './ContrastText.ts';

import type { MathPrimitiveInterface } from '../types/index.ts';
import { oklchToRgb       } from './OklchToRgb.ts';
import { rgbToOklch       } from './RgbToOklch.ts';
import { hslToRgb         } from './HslToRgb.ts';
import { rgbToHsl         } from './RgbToHsl.ts';
import { hexToRgb         } from './HexToRgb.ts';
import { rgbToHex         } from './RgbToHex.ts';
import { srgbToLinear     } from './SrgbToLinear.ts';
import { linearToSrgb     } from './LinearToSrgb.ts';
import { srgbToDisplayP3  } from './SrgbToDisplayP3.ts';
import { displayP3ToSrgb  } from './DisplayP3ToSrgb.ts';
import { mixOklch         } from './MixOklch.ts';
import { mixHsl           } from './MixHsl.ts';
import { mixSrgb          } from './MixSrgb.ts';
import { lighten          } from './Lighten.ts';
import { darken           } from './Darken.ts';
import { saturate         } from './Saturate.ts';
import { desaturate       } from './Desaturate.ts';
import { hueShift         } from './HueShift.ts';
import { contrastWcag21   } from './ContrastWcag21.ts';
import { contrastApca     } from './ContrastApca.ts';
import { deltaE2000       } from './DeltaE2000.ts';
import { ensureContrast   } from './EnsureContrast.ts';
import { clusterMedianCut } from './ClusterMedianCut.ts';
import { luminance        } from './Luminance.ts';
import { contrastText     } from './ContrastText.ts';

/**
 * Every math primitive shipped with `@studnicky/iridis`. Pass to
 * `engine.math.register` in a loop to wire the full math surface in
 * one shot, or pick out individuals when bundle size matters.
 */
export const mathBuiltins: readonly MathPrimitiveInterface[] = [
  oklchToRgb,
  rgbToOklch,
  hslToRgb,
  rgbToHsl,
  hexToRgb,
  rgbToHex,
  srgbToLinear,
  linearToSrgb,
  srgbToDisplayP3,
  displayP3ToSrgb,
  mixOklch,
  mixHsl,
  mixSrgb,
  lighten,
  darken,
  saturate,
  desaturate,
  hueShift,
  contrastWcag21,
  contrastApca,
  deltaE2000,
  ensureContrast,
  clusterMedianCut,
  luminance,
  contrastText,
];
