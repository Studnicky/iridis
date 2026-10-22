import { ContrastOptionsInterfaceTypeEntity } from '@studnicky/iridis';

abstract class ContrastStandardBehavior {
  public abstract serialize(): ContrastOptionsInterfaceTypeEntity.Type;
}

class ApcaContrastStandardBehavior extends ContrastStandardBehavior {
  public serialize(): ContrastOptionsInterfaceTypeEntity.Type {
    const result = ContrastOptionsInterfaceTypeEntity.create({
      'algorithm': 'apca',
      'cvdMode': 'nudge',
      'level': 'Lc'
    });

    return result;
  }
}

class WcagAaaContrastStandardBehavior extends ContrastStandardBehavior {
  public serialize(): ContrastOptionsInterfaceTypeEntity.Type {
    const result = ContrastOptionsInterfaceTypeEntity.create({
      'algorithm': 'wcag21',
      'cvdMode': 'nudge',
      'level': 'AAA'
    });

    return result;
  }
}

class WcagAaContrastStandardBehavior extends ContrastStandardBehavior {
  public serialize(): ContrastOptionsInterfaceTypeEntity.Type {
    const result = ContrastOptionsInterfaceTypeEntity.create({
      'algorithm': 'wcag21',
      'cvdMode': 'nudge',
      'level': 'AA'
    });

    return result;
  }
}

/** Resolves UI controls into executable contrast behavior at the engine-input boundary. CVD correction is always on. */
export class ContrastConfigFor {
  private static readonly wcagAa = new WcagAaContrastStandardBehavior();

  private static readonly wcagAaa = new WcagAaaContrastStandardBehavior();

  private static readonly apca = new ApcaContrastStandardBehavior();

  public static forStrictness(strictness: number): ContrastOptionsInterfaceTypeEntity.Type {
    if (strictness === 0) {
      const result = ContrastConfigFor.wcagAa.serialize();

      return result;
    }
    if (strictness === 1) {
      const result = ContrastConfigFor.wcagAaa.serialize();

      return result;
    }
    const result = ContrastConfigFor.apca.serialize();

    return result;
  }
}
