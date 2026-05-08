// APCA-W3 0.0.98G-4g formula — https://github.com/Myndex/SAPC-APCA
import type { ColorRecordInterface, MathPrimitiveInterface } from '../model/types.ts';

function isColorRecord(v: unknown): v is ColorRecordInterface {
  if (typeof v !== 'object' || v === null) return false;
  const c = v as Record<string, unknown>;
  return typeof c['rgb'] === 'object' && c['rgb'] !== null;
}

function toLinear(v: number): number {
  if (v <= 0.04045) return v / 12.92;
  return Math.pow((v + 0.055) / 1.055, 2.4);
}

function fgLuminance(r: number, g: number, b: number): number {
  return 0.2126729 * Math.pow(toLinear(r), 0.56)
       + 0.7151522 * Math.pow(toLinear(g), 0.56)
       + 0.0721750 * Math.pow(toLinear(b), 0.56);
}

function bgLuminance(r: number, g: number, b: number): number {
  return 0.2126729 * Math.pow(toLinear(r), 0.65)
       + 0.7151522 * Math.pow(toLinear(g), 0.65)
       + 0.0721750 * Math.pow(toLinear(b), 0.65);
}

const SA98G_NORM_BG  = 0.56;
const SA98G_NORM_TXT = 0.57;
const SA98G_CLAMP    = 0.022;
const SA98G_CLAMP_P  = 1.414;
const SA98G_SCALE    = 1.14;
const SA98G_LOW_CLIP = 0.001;
const SA98G_OFFSET   = 0.027;

export class ContrastApca implements MathPrimitiveInterface {
  readonly 'name' = 'contrastApca';

  apply(...args: readonly unknown[]): number {
    const [text, background] = args;
    if (!isColorRecord(text) || !isColorRecord(background)) {
      throw new Error('ContrastApca.apply: expected (text: ColorRecord, background: ColorRecord)');
    }

    const Ytxt = fgLuminance(text.rgb.r,       text.rgb.g,       text.rgb.b);
    const Ybg  = bgLuminance(background.rgb.r,  background.rgb.g, background.rgb.b);

    const txtClamp = Ytxt < SA98G_CLAMP
      ? Ytxt + Math.pow(SA98G_CLAMP - Ytxt, SA98G_CLAMP_P)
      : Ytxt;
    const bgClamp  = Ybg  < SA98G_CLAMP
      ? Ybg  + Math.pow(SA98G_CLAMP - Ybg,  SA98G_CLAMP_P)
      : Ybg;

    let Lc = 0;
    if (bgClamp > txtClamp) {
      Lc = (Math.pow(bgClamp, SA98G_NORM_BG) - Math.pow(txtClamp, SA98G_NORM_TXT)) * SA98G_SCALE;
      if (Lc < SA98G_LOW_CLIP) return 0;
      Lc = Lc - SA98G_OFFSET;
    } else {
      Lc = (Math.pow(bgClamp, 0.62) - Math.pow(txtClamp, 0.65)) * SA98G_SCALE;
      if (Lc > -SA98G_LOW_CLIP) return 0;
      Lc = Lc + SA98G_OFFSET;
    }

    return Lc * 100;
  }
}

export const contrastApca = new ContrastApca();
