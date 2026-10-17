import type { ScenarioAssertionOptionsInterface } from './ScenarioAssertionOptionsInterface.ts';
import type { ScenarioClassificationEntity } from './ScenarioClassificationEntity.ts';

/** One row of a scenario matrix driven by ScenarioRunner. */
export interface ScenarioInterface<TInput, TOutput> {
  assert(options: ScenarioAssertionOptionsInterface<TOutput>): void | Promise<void>;
  readonly 'classification': ScenarioClassificationEntity.Type;
  readonly 'input':          TInput;
  readonly 'name':           string;
}
