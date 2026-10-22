import { ContrastOptionsEntity } from '@studnicky/iridis';

import type { ContrastConfigOptionsEntity } from './entities/ContrastConfigOptionsEntity.ts';

abstract class ContrastStandardBehavior {
  public abstract serialize(options: ContrastConfigOptionsEntity.Type): ContrastOptionsEntity.Type;
}

class ApcaContrastStandardBehavior extends ContrastStandardBehavior {
  public serialize(options: ContrastConfigOptionsEntity.Type): ContrastOptionsEntity.Type {
    const result = ContrastOptionsEntity.create({
      'algorithm': 'apca',
      'cvdMode': options.cvdMode,
      'level': 'Lc',
      'nonMandatoryLevel': options.nonMandatoryLevel
    });

    return result;
  }
}

class WcagAaaContrastStandardBehavior extends ContrastStandardBehavior {
  public serialize(options: ContrastConfigOptionsEntity.Type): ContrastOptionsEntity.Type {
    const result = ContrastOptionsEntity.create({
      'algorithm': 'wcag21',
      'cvdMode': options.cvdMode,
      'level': 'AAA',
      'nonMandatoryLevel': options.nonMandatoryLevel
    });

    return result;
  }
}

class WcagAaContrastStandardBehavior extends ContrastStandardBehavior {
  public serialize(options: ContrastConfigOptionsEntity.Type): ContrastOptionsEntity.Type {
    const result = ContrastOptionsEntity.create({
      'algorithm': 'wcag21',
      'cvdMode': options.cvdMode,
      'level': 'AA',
      'nonMandatoryLevel': options.nonMandatoryLevel
    });

    return result;
  }
}

/** Resolves UI controls into executable contrast behavior at the engine-input boundary. */
export class ContrastConfigFor {
  private static readonly wcagAa = new WcagAaContrastStandardBehavior();

  private static readonly wcagAaa = new WcagAaaContrastStandardBehavior();

  private static readonly apca = new ApcaContrastStandardBehavior();

  public static forOptions(options: ContrastConfigOptionsEntity.Type): ContrastOptionsEntity.Type {
    if (options.strictness === 0) {
      const result = ContrastConfigFor.wcagAa.serialize(options);

      return result;
    }
    if (options.strictness === 1) {
      const result = ContrastConfigFor.wcagAaa.serialize(options);

      return result;
    }
    const result = ContrastConfigFor.apca.serialize(options);

    return result;
  }
}
