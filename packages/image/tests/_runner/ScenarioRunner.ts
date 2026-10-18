/**
 * Scenario-matrix test runner.
 *
 * Drives a single subject-under-test through a table of scenarios and
 * emits one `node:test` test per row. Each scenario carries its own
 * input and expected-outcome `assert` callback, so a single suite holds the
 * coverage matrix for one subject.
 *
 * Boilerplate fixtures sit above the scenario table; the table itself is the
 * coverage map. Scenario names make failures self-locating.
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

  private async execute(scenario: ScenarioInterface<TInput, TOutput>): Promise<void> {
    let output: TOutput | undefined;
    let error: Error | undefined;
    try {
      output = await this.subject(scenario.input);
    } catch (thrown) {
      error = thrown instanceof Error ? thrown : new Error(String(thrown));
    }
    await scenario.assert(output, error);
  }

  async run(scenarios: readonly ScenarioInterface<TInput, TOutput>[]): Promise<void> {
    for (let index = 0; index < scenarios.length; index += 1) {
      const scenario = scenarios[index];
      if (scenario === undefined) {
        continue;
      }
      const testName = `${this.suite} :: ${scenario.name}`;
      await test(testName, async () => {
        await this.execute(scenario);
      });
    }
  }
}
