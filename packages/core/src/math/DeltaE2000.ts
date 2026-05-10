/**
 * Delta E 2000 perceptual color difference computed against an OKLab-derived
 * Lab, scaled to roughly match the CIE Lab numeric range expected by the
 * Sharma et al. 2005 formula. OKLCH is a direct reparametrisation of OKLab,
 * so (L, a*, b*) = (oklch.l, c*cos(h), c*sin(h)) before scaling. The result
 * is a perceptual distance: single-digit values indicate "just noticeable"
 * differences, anything above 10 is clearly distinct.
 */
import type { ColorRecordInterface, MathPrimitiveInterface } from '../types/index.ts';

function isColorRecord(v: unknown): v is ColorRecordInterface {
  if (typeof v !== 'object' || v === null) return false;
  const c = v as Record<string, unknown>;
  return typeof c['oklch'] === 'object' && c['oklch'] !== null;
}

function oklchToOklab(l: number, c: number, h: number): [number, number, number] {
  const hRad = (h * Math.PI) / 180;
  return [l, c * Math.cos(hRad), c * Math.sin(hRad)];
}

function deg(rad: number): number {
  return (rad * 180) / Math.PI;
}

function rad(d: number): number {
  return (d * Math.PI) / 180;
}

/**
 * Math primitive that returns the ΔE 2000 perceptual distance between
 * two colors. Symmetric. Used by tasks that need to test whether two
 * candidate colors are visibly distinct — e.g. ensuring no two assigned
 * roles collapse to indistinguishable values after contrast nudging.
 */
export class DeltaE2000 implements MathPrimitiveInterface {
  readonly 'name' = 'deltaE2000';

  apply(...args: readonly unknown[]): number {
    const [a, b] = args;
    if (!isColorRecord(a) || !isColorRecord(b)) {
      throw new Error('DeltaE2000.apply: expected (a: ColorRecord, b: ColorRecord)');
    }

    const [L1, a1, b1] = oklchToOklab(a.oklch.l, a.oklch.c, a.oklch.h);
    const [L2, a2, b2] = oklchToOklab(b.oklch.l, b.oklch.c, b.oklch.h);

    // OKLab L is 0..1; CIE Lab L is 0..100. Scale so the formula's hard-coded
    // constants (Sharma et al. 2005) operate on the magnitudes they expect.
    const scale = 100;
    const sL1 = L1 * scale, sa1 = a1 * scale, sb1 = b1 * scale;
    const sL2 = L2 * scale, sa2 = a2 * scale, sb2 = b2 * scale;

    const C1 = Math.sqrt(sa1 * sa1 + sb1 * sb1);
    const C2 = Math.sqrt(sa2 * sa2 + sb2 * sb2);
    const Cavg = (C1 + C2) / 2;
    const C7 = Math.pow(Cavg, 7);
    const factor25_7 = Math.pow(25, 7);
    const G = 0.5 * (1 - Math.sqrt(C7 / (C7 + factor25_7)));

    const a1p = sa1 * (1 + G);
    const a2p = sa2 * (1 + G);
    const C1p = Math.sqrt(a1p * a1p + sb1 * sb1);
    const C2p = Math.sqrt(a2p * a2p + sb2 * sb2);

    let h1p = deg(Math.atan2(sb1, a1p));
    if (h1p < 0) h1p += 360;
    let h2p = deg(Math.atan2(sb2, a2p));
    if (h2p < 0) h2p += 360;

    const dLp = sL2 - sL1;
    const dCp = C2p - C1p;

    let dhp = 0;
    if (C1p * C2p === 0) {
      dhp = 0;
    } else if (Math.abs(h2p - h1p) <= 180) {
      dhp = h2p - h1p;
    } else if (h2p - h1p > 180) {
      dhp = h2p - h1p - 360;
    } else {
      dhp = h2p - h1p + 360;
    }

    const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(rad(dhp / 2));

    const Lp = (sL1 + sL2) / 2;
    const Cp = (C1p + C2p) / 2;

    let Hp = 0;
    if (C1p * C2p === 0) {
      Hp = h1p + h2p;
    } else if (Math.abs(h1p - h2p) <= 180) {
      Hp = (h1p + h2p) / 2;
    } else if (h1p + h2p < 360) {
      Hp = (h1p + h2p + 360) / 2;
    } else {
      Hp = (h1p + h2p - 360) / 2;
    }

    const T = 1
      - 0.17 * Math.cos(rad(Hp - 30))
      + 0.24 * Math.cos(rad(2 * Hp))
      + 0.32 * Math.cos(rad(3 * Hp + 6))
      - 0.20 * Math.cos(rad(4 * Hp - 63));

    const SL = 1 + 0.015 * Math.pow(Lp - 50, 2) / Math.sqrt(20 + Math.pow(Lp - 50, 2));
    const SC = 1 + 0.045 * Cp;
    const SH = 1 + 0.015 * Cp * T;

    const Cp7 = Math.pow(Cp, 7);
    const RC = 2 * Math.sqrt(Cp7 / (Cp7 + factor25_7));
    const dTheta = 30 * Math.exp(-Math.pow((Hp - 275) / 25, 2));
    const RT = -Math.sin(rad(2 * dTheta)) * RC;

    const kL = 1, kC = 1, kH = 1;
    return Math.sqrt(
      Math.pow(dLp  / (kL * SL), 2) +
      Math.pow(dCp  / (kC * SC), 2) +
      Math.pow(dHp  / (kH * SH), 2) +
      RT * (dCp / (kC * SC)) * (dHp / (kH * SH)),
    );
  }
}

/** Singleton instance registered as the `deltaE2000` math primitive. */
export const deltaE2000 = new DeltaE2000();
