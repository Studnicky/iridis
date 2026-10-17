import { ContrastOptionsInterfaceTypeEntity } from '@studnicky/iridis';

abstract class CvdCorrectionBehavior {
  public abstract serialize(): boolean;
}

class AdvisoryCvdCorrectionBehavior extends CvdCorrectionBehavior {
  public serialize(): boolean {
    return false;
  }
}

class CorrectingCvdCorrectionBehavior extends CvdCorrectionBehavior {
  public serialize(): boolean {
    return true;
  }
}

abstract class ContrastStandardBehavior {
  public abstract serialize(correction: CvdCorrectionBehavior): ContrastOptionsInterfaceTypeEntity.Type;
}

class WcagAaContrastStandardBehavior extends ContrastStandardBehavior {
  public serialize(correction: CvdCorrectionBehavior): ContrastOptionsInterfaceTypeEntity.Type {
    const result = ContrastOptionsInterfaceTypeEntity.create({ 'algorithm': 'wcag21', 'cvdCorrect': correction.serialize(), 'level': 'AA' });
    return result;
  }
}

class WcagAaaContrastStandardBehavior extends ContrastStandardBehavior {
  public serialize(correction: CvdCorrectionBehavior): ContrastOptionsInterfaceTypeEntity.Type {
    const result = ContrastOptionsInterfaceTypeEntity.create({ 'algorithm': 'wcag21', 'cvdCorrect': correction.serialize(), 'level': 'AAA' });
    return result;
  }
}

class ApcaContrastStandardBehavior extends ContrastStandardBehavior {
  public serialize(correction: CvdCorrectionBehavior): ContrastOptionsInterfaceTypeEntity.Type {
    const result = ContrastOptionsInterfaceTypeEntity.create({ 'algorithm': 'apca', 'cvdCorrect': correction.serialize(), 'level': 'Lc' });
    return result;
  }
}

/** Resolves UI controls into executable contrast behavior at the engine-input boundary. */
export class ContrastConfigFor {
  public static readonly advisoryCvd = new AdvisoryCvdCorrectionBehavior();
  public static readonly correctingCvd = new CorrectingCvdCorrectionBehavior();
  private static readonly wcagAa = new WcagAaContrastStandardBehavior();
  private static readonly wcagAaa = new WcagAaaContrastStandardBehavior();
  private static readonly apca = new ApcaContrastStandardBehavior();

  public static forStrictness(strictness: number, correction: CvdCorrectionBehavior): ContrastOptionsInterfaceTypeEntity.Type {
    if (strictness === 0) {
      const result = ContrastConfigFor.wcagAa.serialize(correction);
      return result;
    }
    if (strictness === 1) {
      const result = ContrastConfigFor.wcagAaa.serialize(correction);
      return result;
    }
    const result = ContrastConfigFor.apca.serialize(correction);
    return result;
  }
}
