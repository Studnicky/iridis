import type { EasingFunctionType, SpringOptionsInterfaceType } from '../types/index.ts';

const DEFAULT_STIFFNESS = 170;
const DEFAULT_DAMPING   = 26;
const DEFAULT_MASS      = 1;

/**
 * A configurable damped-spring easing settling from 0 to 1. Underdamped
 * springs (zeta < 1) oscillate around the target before settling; critically
 * or over-damped springs (zeta >= 1) approach it monotonically. Endpoints
 * are pinned exactly: spring()(0) === 0 and spring()(1) === 1.
 */
export const spring = (opts?: SpringOptionsInterfaceType): EasingFunctionType => {
  const stiffness = opts?.stiffness ?? DEFAULT_STIFFNESS;
  const damping   = opts?.damping   ?? DEFAULT_DAMPING;
  const mass      = opts?.mass      ?? DEFAULT_MASS;

  const omega0 = Math.sqrt(stiffness / mass);
  const zeta   = damping / (2 * Math.sqrt(stiffness * mass));

  return (t: number): number => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;

    if (zeta < 1) {
      const omegaD    = omega0 * Math.sqrt(1 - zeta * zeta);
      const envelope  = Math.exp(-zeta * omega0 * t);
      return 1 - envelope * (Math.cos(omegaD * t) + ((zeta * omega0) / omegaD) * Math.sin(omegaD * t));
    }

    return 1 - (1 + omega0 * t) * Math.exp(-omega0 * t);
  };
};
