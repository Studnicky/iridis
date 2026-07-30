import type { EasingFunctionType, SpringOptionsInterfaceType } from '../types/index.ts';

import { SPRING_DEFAULTS } from './constants/SpringDefaults.ts';

/**
 * A configurable damped-spring easing settling from 0 to 1. Underdamped
 * springs (zeta < 1) oscillate around the target before settling; critically
 * or over-damped springs (zeta >= 1) approach it monotonically. Endpoints
 * are pinned exactly: spring()(0) === 0 and spring()(1) === 1.
 */
class Spring {
  static create(options?: SpringOptionsInterfaceType): EasingFunctionType {
    const stiffness = options?.stiffness ?? SPRING_DEFAULTS.stiffness;
    const damping   = options?.damping   ?? SPRING_DEFAULTS.damping;
    const mass      = options?.mass      ?? SPRING_DEFAULTS.mass;

    const omega0 = Math.sqrt(stiffness / mass);
    const zeta   = damping / (2 * Math.sqrt(stiffness * mass));

    return (t: number): number => {
      if (t <= 0) {return 0;}
      if (t >= 1) {return 1;}

      if (zeta < 1) {
        const omegaD    = omega0 * Math.sqrt(1 - zeta * zeta);
        const envelope  = Math.exp(-zeta * omega0 * t);
        return 1 - envelope * (Math.cos(omegaD * t) + ((zeta * omega0) / omegaD) * Math.sin(omegaD * t));
      }

      return 1 - (1 + omega0 * t) * Math.exp(-omega0 * t);
    };
  }
}

export const spring = Spring.create;
