/**
 * Scenario-matrix test runner.
 *
 * Drives a single subject-under-test through a table of scenarios and
 * emits one `node:test` test per row. Each scenario is classified by
 * `kind` (`happy` | `edge` | `unhappy`) and carries its own `assert`
 * callback so a single suite can hold the full coverage matrix for one
 * subject — happy paths, edges, illegal inputs — in one place.
 *
 * Yamete-style cell discipline applies: every test file defines one
 * subject, one runner, and one flat scenario table. Boilerplate (mocks,
 * fixture factories) sits above the table; the table itself is the
 * coverage map. Coordinate-tagged failure messages
 * (`[subject=X, kind=Y, scenario=Z]`) make any failure self-locating.
 */
import { test } from 'node:test';

import type { ScenarioInterface } from './ScenarioInterface.ts';

export class ScenarioRunner<TInput, TOutput> {
  private readonly suite:   string;
  private readonly subject: (input: TInput) => Promise<TOutput> | TOutput;

  constructor(suite: string, subject: (input: TInput) => Promise<TOutput> | TOutput) {
    this.suite   = suite;
    this.subject = subject;
  }

  run(scenarios: readonly ScenarioInterface<TInput, TOutput>[]): void {
    for (const sc of scenarios) {
      void test(`${this.suite} :: ${sc.kind} :: ${sc.name}`, async () => {
        let output: TOutput | undefined;
        let error:  Error | undefined;
        try {
          output = await this.subject(sc.input);
        } catch (thrown) {
          error = thrown instanceof Error ? thrown : new Error(String(thrown));
        }
        await sc.assert(output, error);
      });
    }
  }
}
