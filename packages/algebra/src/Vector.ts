import type { LerpOptionsInterfaceTypeEntity } from './entities/LerpOptionsInterfaceTypeEntity.ts';
import type { PaletteDistanceMetricInterface } from './interfaces/PaletteDistanceMetricInterface.ts';

import { VECTOR_DEFAULTS } from './constants/VectorDefaults.ts';
import { DefaultPaletteDistance } from './DefaultPaletteDistance.ts';
import { OklchInterfaceTypeEntity } from './entities/OklchInterfaceTypeEntity.ts';
import { PaletteInterfaceTypeEntity } from './entities/PaletteInterfaceTypeEntity.ts';
import { LerpHue } from './LerpHue.ts';
import { WrapHueDelta } from './WrapHueDelta.ts';

/** Pure vector-math operations over palettes treated as points in OKLCH×N space. */
class Vector {
  private static readonly HUE_INTERPOLATORS = new Map([
    ['clockwise', LerpHue.clockwise],
    ['counterClockwise', LerpHue.counterClockwise],
    ['shortestArc', LerpHue.shortestArc]
  ]);

  private static requireRole(palette: PaletteInterfaceTypeEntity.Type, role: string): PaletteInterfaceTypeEntity.Type[string] {
    const record = palette[role];
    if (record === undefined) {throw new Error(`Palette is missing role "${role}"`);}
    return record;
  }

  /** Per-role OKLCH lerp between two palettes; hue wraps around the 0/360 circle. */
  static lerp(
    a: PaletteInterfaceTypeEntity.Type,
    b: PaletteInterfaceTypeEntity.Type,
    t: number,
    options?: LerpOptionsInterfaceTypeEntity.Type
  ): PaletteInterfaceTypeEntity.Type {
    const hueDirection = options?.hueDirection ?? 'shortestArc';
    const interpolateHue = Vector.HUE_INTERPOLATORS.get(hueDirection);
    if (interpolateHue === undefined) {throw new Error(`Unsupported hue direction: ${hueDirection}`);}

    const result = new Map<string, PaletteInterfaceTypeEntity.Type[string]>();
    const roles = Object.keys(a);
    for (let index = 0; index < roles.length; index += 1) {
      const role = roles[index]!;
      const roleA = Vector.requireRole(a, role);
      const roleB = Vector.requireRole(b, role);
      const interpolatedRole = OklchInterfaceTypeEntity.create({
        'c': roleA.c + t * (roleB.c - roleA.c),
        'h': interpolateHue(roleA.h, roleB.h, t),
        'l': roleA.l + t * (roleB.l - roleA.l)
      });
      result.set(role, interpolatedRole);
    }
    const palette: PaletteInterfaceTypeEntity.Type = {};
    for (const [role, interpolatedRole] of result) {
      Object.defineProperty(palette, role, { 'configurable': true, 'enumerable': true, 'value': interpolatedRole, 'writable': true });
    }
    const validatedPalette = PaletteInterfaceTypeEntity.create(palette);
    return validatedPalette;
  }

  /** Per-role OKLCH delta (a - b); hue delta is wrapped to [-180, 180]. */
  static subtract(a: PaletteInterfaceTypeEntity.Type, b: PaletteInterfaceTypeEntity.Type): PaletteInterfaceTypeEntity.Type {
    const result = new Map<string, PaletteInterfaceTypeEntity.Type[string]>();
    const roles = Object.keys(a);
    for (let index = 0; index < roles.length; index += 1) {
      const role = roles[index]!;
      const roleA = Vector.requireRole(a, role);
      const roleB = Vector.requireRole(b, role);
      const deltaRole = OklchInterfaceTypeEntity.create({
        'c': roleA.c - roleB.c,
        'h': WrapHueDelta.of(roleA.h - roleB.h),
        'l': roleA.l - roleB.l
      });
      result.set(role, deltaRole);
    }
    const palette: PaletteInterfaceTypeEntity.Type = {};
    for (const [role, deltaRole] of result) {
      Object.defineProperty(palette, role, { 'configurable': true, 'enumerable': true, 'value': deltaRole, 'writable': true });
    }
    const validatedPalette = PaletteInterfaceTypeEntity.create(palette);
    return validatedPalette;
  }

  /** Returns whichever palette in `corpus` is closest to `target` under `metric`. */
  static nearest(
    target: PaletteInterfaceTypeEntity.Type,
    corpus: PaletteInterfaceTypeEntity.Type[],
    metric: PaletteDistanceMetricInterface = DefaultPaletteDistance
  ): PaletteInterfaceTypeEntity.Type {
    const corpusLength = corpus.length;
    if (corpusLength === 0) {throw new Error('nearest() requires a non-empty corpus');}

    let closest = corpus[0]!;
    let closestDistance = metric.measure(target, closest);
    for (let i = 1; i < corpusLength; i += 1) {
      const candidate = corpus[i]!;
      const distance = metric.measure(target, candidate);
      if (distance < closestDistance) {
        closest = candidate;
        closestDistance = distance;
      }
    }
    return closest;
  }

  /** True when the perceptual distance between `current` and `derived` exceeds `threshold` — signals a re-derivation is due. */
  static drift(current: PaletteInterfaceTypeEntity.Type, derived: PaletteInterfaceTypeEntity.Type, threshold: number): boolean {
    const hasDrifted = DefaultPaletteDistance.measure(current, derived) > threshold;
    return hasDrifted;
  }

  /**
   * Moves orthogonally on the chroma plane for `roleAxis`: l and h for that
   * role are held fixed while c is adjusted by `delta` (clamped to [0, 0.5]).
   * All other roles pass through unchanged.
   */
  static perpendicular(
    a: PaletteInterfaceTypeEntity.Type,
    roleAxis: string,
    delta: number = VECTOR_DEFAULTS.DEFAULT_PERPENDICULAR_DELTA
  ): PaletteInterfaceTypeEntity.Type {
    const target = Vector.requireRole(a, roleAxis);
    const result: PaletteInterfaceTypeEntity.Type = {};
    Object.defineProperties(result, Object.getOwnPropertyDescriptors(a));
    const perpendicularRole = OklchInterfaceTypeEntity.create({
      'c': Math.min(VECTOR_DEFAULTS.MAXIMUM_CHROMA, Math.max(0, target.c + delta)),
      'h': target.h,
      'l': target.l
    });
    Object.defineProperty(result, roleAxis, { 'configurable': true, 'enumerable': true, 'value': perpendicularRole, 'writable': true });
    const validatedPalette = PaletteInterfaceTypeEntity.create(result);
    return validatedPalette;
  }
}

export { Vector };
