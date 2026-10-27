import type { PresentationControlsEffectEntity } from '../entities/PresentationControlsEffectEntity.ts';

/** Capability port that executes the machine's effects. */
export interface PresentationControlsEffectHandlersInterface {
  navigateToTarget(target: PresentationControlsEffectEntity.Type['navigationTarget']): void;
}
