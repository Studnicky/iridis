// APCA-W3 0.0.98G-4g formula: https://github.com/Myndex/SAPC-APCA
import { srgbToLinear } from './SrgbToLinear.ts';

const SA98G_NORM_BG  = 0.56;
const SA98G_NORM_TXT = 0.57;
const SA98G_CLAMP    = 0.022;
const SA98G_CLAMP_P  = 1.414;
const SA98G_SCALE    = 1.14;
const SA98G_LOW_CLIP = 0.001;
const SA98G_OFFSET   = 0.027;

/** Shared APCA luminance coefficients and Lc formula, used by both
 *  `contrastApca` (signed Lc, polarity preserved) and `ensureContrast`
 *  (absolute Lc, via `Math.abs()` on `apply()`'s result). Internal to
 *  the math module — not registered as a public primitive — so both
 *  callers import it directly rather than through the barrel. */
class ApcaLc {
  readonly 'name' = 'apcaLc';

  /** APCA relative luminance: linear-light sRGB weighted by the APCA
   *  luminance coefficients, no per-channel exponent. The norm/rev
   *  perceptual exponents are applied once, in `apply()`, to the
   *  clamped Y values — not per-channel here. Shared by both text and
   *  background; APCA polarity is decided by which clamped Y is
   *  larger, not by which coefficient set produced it. */
  luminance(r: number, g: number, b: number): number {
    const lin = srgbToLinear.apply(r, g, b);
    return 0.2126729 * lin.r + 0.7151522 * lin.g + 0.0721750 * lin.b;
  }

  /** Signed APCA Lc*100 between a text luminance `Ytxt` and a
   *  background luminance `Ybg`, both produced by `luminance()`.
   *  Positive when the background is lighter than the text (normal
   *  polarity), negative when the text is lighter than the background
   *  (reverse polarity). Callers that need a magnitude take
   *  `Math.abs()` of the result. */
  apply(Ytxt: number, Ybg: number): number {
    const txtClamp = Ytxt < SA98G_CLAMP
      ? Ytxt + Math.pow(SA98G_CLAMP - Ytxt, SA98G_CLAMP_P)
      : Ytxt;
    const bgClamp  = Ybg  < SA98G_CLAMP
      ? Ybg  + Math.pow(SA98G_CLAMP - Ybg,  SA98G_CLAMP_P)
      : Ybg;

    let Lc = 0;
    if (bgClamp > txtClamp) {
      Lc = (Math.pow(bgClamp, SA98G_NORM_BG) - Math.pow(txtClamp, SA98G_NORM_TXT)) * SA98G_SCALE;
      if (Lc < SA98G_LOW_CLIP) {return 0;}
      Lc = Lc - SA98G_OFFSET;
    } else {
      Lc = (Math.pow(bgClamp, 0.62) - Math.pow(txtClamp, 0.65)) * SA98G_SCALE;
      if (Lc > -SA98G_LOW_CLIP) {return 0;}
      Lc = Lc + SA98G_OFFSET;
    }

    return Lc * 100;
  }
}

/** Singleton instance holding the shared APCA luminance/Lc source. */
export const apcaLc = new ApcaLc();
