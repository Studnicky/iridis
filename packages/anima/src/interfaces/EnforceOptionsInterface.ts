import type { ContrastPairInterfaceTypeEntity, TaskInterface } from '@studnicky/iridis';

import type { CurveOptionsInterface } from './CurveOptionsInterface.ts';

/** Curve controls plus canonical contrast requirements and an injected enforcement task. */
export interface EnforceOptionsInterface extends CurveOptionsInterface {
  readonly 'contrastPairs': readonly ContrastPairInterfaceTypeEntity.Type[];
  readonly 'enforcer'?: TaskInterface;
}
