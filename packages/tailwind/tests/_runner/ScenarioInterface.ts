import type { ScenarioAssertionOptionsInterface } from './ScenarioAssertionOptionsInterface.ts';

/** One input and behavioral assertion in a Tailwind scenario matrix. */
export interface ScenarioInterface<TInput, TOutput> {
  assert(options: ScenarioAssertionOptionsInterface<TOutput>): void | Promise<void>;
  readonly 'input': TInput;
  readonly 'name': string;
}
