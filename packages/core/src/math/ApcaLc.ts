// Myndex APCA-W3 0.1.9 Lc: https://github.com/Myndex/apca-w3
import { APCA_COEFFICIENTS } from './constants/ApcaCoefficients.ts';

/** Shared APCA luminance coefficients and Lc formula, used by both
 *  `contrastApca` (signed Lc, polarity preserved) and `ensureContrast`
 *  (absolute Lc, via `Math.abs()` on `apply()`'s result). Internal to
 *  the math module — not registered as a public primitive — so both
 *  callers import it directly rather than through the barrel. */
class ApcaLc {
  readonly 'name' = 'apcaLc';

  /** APCA relative luminance (reference `sRGBtoY`): channels in 0..1 are
   *  raised to the 2.4 main TRC and weighted by the APCA coefficients.
   *  The norm/rev exponents are applied once, in `apply()`. */
  luminance(r: number, g: number, b: number): number {
    const luminance =
      0.2126729 * this.channel(r) +
      0.7151522 * this.channel(g) +
      0.0721750 * this.channel(b);
    return luminance;
  }

  /** Reference main TRC for one encoded channel, clamped to the 0..1 domain. */
  channel(value: number): number {
    const result = Math.pow(Math.max(0, Math.min(1, value)), APCA_COEFFICIENTS.SA98G_MAIN_TRC);
    return result;
  }

  /** Signed APCA Lc*100 between a text luminance `Ytxt` and a
   *  background luminance `Ybg`, both produced by `luminance()`.
   *  Positive when the background is lighter than the text (normal
   *  polarity), negative when the text is lighter than the background
   *  (reverse polarity). Callers that need a magnitude take
   *  `Math.abs()` of the result. */
  apply(Ytxt: number, Ybg: number): number {
    const inRange = Ytxt >= 0 && Ytxt <= APCA_COEFFICIENTS.SA98G_Y_MAX && Ybg >= 0 && Ybg <= APCA_COEFFICIENTS.SA98G_Y_MAX;
    const result = inRange ? this.contrast(Ytxt, Ybg) : 0;
    return result;
  }

  /** Lc*100 for luminances already inside the reference domain. */
  private contrast(Ytxt: number, Ybg: number): number {
    const txtClamp = Ytxt < APCA_COEFFICIENTS.SA98G_CLAMP
      ? Ytxt + Math.pow(APCA_COEFFICIENTS.SA98G_CLAMP - Ytxt, APCA_COEFFICIENTS.SA98G_CLAMP_P)
      : Ytxt;
    const bgClamp  = Ybg  < APCA_COEFFICIENTS.SA98G_CLAMP
      ? Ybg  + Math.pow(APCA_COEFFICIENTS.SA98G_CLAMP - Ybg,  APCA_COEFFICIENTS.SA98G_CLAMP_P)
      : Ybg;

    if (Math.abs(bgClamp - txtClamp) < APCA_COEFFICIENTS.SA98G_DELTA_Y_MIN) {return 0;}

    let Lc = 0;
    if (bgClamp > txtClamp) {
      Lc = (Math.pow(bgClamp, APCA_COEFFICIENTS.SA98G_NORM_BG) - Math.pow(txtClamp, APCA_COEFFICIENTS.SA98G_NORM_TXT)) * APCA_COEFFICIENTS.SA98G_SCALE;
      if (Lc < APCA_COEFFICIENTS.SA98G_LOW_CLIP) {return 0;}
      Lc = Lc - APCA_COEFFICIENTS.SA98G_OFFSET;
    } else {
      Lc = (Math.pow(bgClamp, APCA_COEFFICIENTS.SA98G_REV_BG) - Math.pow(txtClamp, APCA_COEFFICIENTS.SA98G_REV_TXT)) * APCA_COEFFICIENTS.SA98G_SCALE;
      if (Lc > -APCA_COEFFICIENTS.SA98G_LOW_CLIP) {return 0;}
      Lc = Lc + APCA_COEFFICIENTS.SA98G_OFFSET;
    }

    const result = Lc * 100;
    return result;
  }
}

/** Singleton instance holding the shared APCA luminance/Lc source. */
export const apcaLc = new ApcaLc();
