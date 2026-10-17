import { test } from 'node:test';

import type { ScenarioInterface } from './ScenarioInterface.ts';

/** Runs a suite of independently asserted test scenarios. */
export class ScenarioRunner<TInput, TOutput> {
  private readonly suite: string;
  private readonly subject: (input: TInput) => Promise<TOutput> | TOutput;

  constructor(suite: string, subject: (input: TInput) => Promise<TOutput> | TOutput) {
    this.suite = suite;
    this.subject = subject;
  }

  async run(scenarios: readonly ScenarioInterface<TInput, TOutput>[]): Promise<void> {
    for (let index = 0; index < scenarios.length; index += 1) {
      const scenario = scenarios[index];
      if (scenario === undefined) {
        throw new Error('Scenario collection contains an undefined entry.');
      }
      await test(`${this.suite} :: ${scenario.name}`, async () => {
        return await this.runScenario(scenario);
      });
    }
  }

  private async runScenario(scenario: ScenarioInterface<TInput, TOutput>): Promise<void> {
    let output: TOutput | undefined;
    let error: Error | undefined;
    try {
      output = await this.subject(scenario.input);
    } catch (caught) {
      error = caught instanceof Error ? caught : new Error(String(caught));
    }
    const options = {
      ...(error === undefined ? {} : { 'error': error }),
      ...(output === undefined ? {} : { 'output': output })
    };
    await scenario.assert(options);
  }
}
