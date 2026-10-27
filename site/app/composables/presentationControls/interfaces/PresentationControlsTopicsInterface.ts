import type { PresentationControlsReadModelEntity } from '../entities/PresentationControlsReadModelEntity.ts';

/** Event-bus topics the store publishes. */
export interface PresentationControlsTopicsInterface {
  readonly 'presentation.controls.read-model': PresentationControlsReadModelEntity.Type;
}
