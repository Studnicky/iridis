/** Scenario-matrix test runner. */
import { test } from 'node:test';

import type { ScenarioAssertionOptionsInterface } from './ScenarioAssertionOptionsInterface.ts';
import type { ScenarioInterface } from './ScenarioInterface.ts';

export class ScenarioRunner<TInput, TOutput> {
  private readonly suite:   string;
  private readonly subject: (input: TInput) => Promise<TOutput> | TOutput;

  constructor(suite: string, subject: (input: TInput) => Promise<TOutput> | TOutput) {
    this.suite   = suite;
    this.subject = subject;
  }

  private static async execute<TInput, TOutput>(
    subject: (input: TInput) => Promise<TOutput> | TOutput,
    scenario: ScenarioInterface<TInput, TOutput>
  ): Promise<void> {
    let output: TOutput | undefined;
    let error: Error | undefined;
    try {
      output = await subject(scenario.input);
    } catch (thrown) {
      error = thrown instanceof Error ? thrown : new Error(String(thrown));
    }
    const options: ScenarioAssertionOptionsInterface<TOutput> = { 'error': error, 'output': output };
    await scenario.assert(options);
  }

  async run(scenarios: readonly ScenarioInterface<TInput, TOutput>[]): Promise<void> {
    const subject = this.subject;
    for (let index = 0; index < scenarios.length; index += 1) {
      const scenario = scenarios.at(index);
      if (scenario === undefined) {
        continue;
      }
      const selectedScenario = scenario;
      async function registerScenario(): Promise<void> {
        await ScenarioRunner.execute(subject, selectedScenario);
      }
      await test(`${this.suite} :: ${selectedScenario.classification} :: ${selectedScenario.name}`, registerScenario);
    }
  }
}
