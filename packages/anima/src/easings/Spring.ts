import type { EasingFunctionInterface } from '../interfaces/EasingFunctionInterface.ts';
import type { SpringOptionsInterface } from '../interfaces/SpringOptionsInterface.ts';

import { SPRING_DEFAULTS } from './constants/SpringDefaults.ts';

/** A configurable damped-spring easing settling from zero to one. */
class Spring {
  static create(options?: SpringOptionsInterface): EasingFunctionInterface {
    const stiffness = options?.stiffness ?? SPRING_DEFAULTS.stiffness;
    const damping   = options?.damping ?? SPRING_DEFAULTS.damping;
    const mass      = options?.mass ?? SPRING_DEFAULTS.mass;
    const omega0 = Math.sqrt(stiffness / mass);
    const zeta = damping / (2 * Math.sqrt(stiffness * mass));
    const result: EasingFunctionInterface = Object.freeze({
      'apply': function apply(progress: number): number {
        if (progress <= 0) {
          return 0;
        }
        if (progress >= 1) {
          return 1;
        }
        if (zeta < 1) {
          const omegaD = omega0 * Math.sqrt(1 - zeta * zeta);
          const envelope = Math.exp(-zeta * omega0 * progress);
          const value = 1 - envelope * (Math.cos(omegaD * progress) + ((zeta * omega0) / omegaD) * Math.sin(omegaD * progress));
          return value;
        }
        const value = 1 - (1 + omega0 * progress) * Math.exp(-omega0 * progress);
        return value;
      }
    });
    return result;
  }
}

export const spring = Spring.create;
