import type { PaletteStateInterface } from '@studnicky/iridis';

import type { CvdEvalEntity } from './entities/CvdEvalEntity.ts';

/** Maps configured CVD handling to evidence, correction, and terminal admission decisions. */
export abstract class CvdFailurePolicy {
  static resolve(
    contrast: PaletteStateInterface['input']['contrast'] | undefined
  ): CvdFailurePolicy {
    const policies = {
      'enforce': new EnforceCvdFailurePolicy(),
      'nudge': new NudgeCvdFailurePolicy(),
      'warn': new WarnCvdFailurePolicy()
    } as const;
    const result = policies[contrast?.cvdMode ?? 'warn'];
    return result;
  }

  observes(evaluation: CvdEvalEntity.Type): boolean {
    const result = evaluation.belowFloor || evaluation.exceedsDrop;
    return result;
  }

  abstract blocks(evaluation: CvdEvalEntity.Type): boolean;

  abstract corrects(evaluation: CvdEvalEntity.Type): boolean;

  abstract emitsBlockers(): boolean;

  abstract mutatesRoles(): boolean;
}

class EnforceCvdFailurePolicy extends CvdFailurePolicy {
  blocks(evaluation: CvdEvalEntity.Type): boolean {
    const result = this.observes(evaluation);
    return result;
  }

  corrects(evaluation: CvdEvalEntity.Type): boolean {
    const result = this.observes(evaluation);
    return result;
  }

  emitsBlockers(): boolean {
    return true;
  }

  mutatesRoles(): boolean {
    return true;
  }
}

class NudgeCvdFailurePolicy extends CvdFailurePolicy {
  blocks(_evaluation: CvdEvalEntity.Type): boolean {
    return false;
  }

  corrects(evaluation: CvdEvalEntity.Type): boolean {
    const result = this.observes(evaluation);
    return result;
  }

  emitsBlockers(): boolean {
    return false;
  }

  mutatesRoles(): boolean {
    return true;
  }
}

class WarnCvdFailurePolicy extends CvdFailurePolicy {
  blocks(_evaluation: CvdEvalEntity.Type): boolean {
    return false;
  }

  corrects(_evaluation: CvdEvalEntity.Type): boolean {
    return false;
  }

  emitsBlockers(): boolean {
    return false;
  }

  mutatesRoles(): boolean {
    return false;
  }
}
