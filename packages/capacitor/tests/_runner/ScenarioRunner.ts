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
import type { TestContext } from 'node:test';

import { test } from 'node:test';

import type { ScenarioInterface } from './ScenarioInterface.ts';

abstract class ScenarioExecution {
  abstract run(): Promise<void>;
}

class ScenarioExecutionTask<TInput, TOutput> extends ScenarioExecution {
  private readonly scenario: ScenarioInterface<TInput, TOutput>;
  private readonly subject: (input: TInput) => Promise<TOutput> | TOutput;

  constructor(
    subject: (input: TInput) => Promise<TOutput> | TOutput,
    scenario: ScenarioInterface<TInput, TOutput>
  ) {
    super();
    this.scenario = scenario;
    this.subject = subject;
  }

  async run(): Promise<void> {
    let output: TOutput | undefined;
    let error: Error | undefined;
    try {
      output = await this.subject(this.scenario.input);
    } catch (thrown) {
      error = thrown instanceof Error ? thrown : new Error(String(thrown));
    }
    await this.scenario.assert(output, error);
  }
}

export class ScenarioRunner<TInput, TOutput> {
  private readonly suite:   string;
  private readonly subject: (input: TInput) => Promise<TOutput> | TOutput;

  constructor(suite: string, subject: (input: TInput) => Promise<TOutput> | TOutput) {
    this.suite   = suite;
    this.subject = subject;
  }

  private static readonly executions = new Map<string, ScenarioExecution>();

  private static async execute(context: TestContext): Promise<void> {
    const execution = ScenarioRunner.executions.get(context.name);
    if (execution === undefined) {
      throw new Error(`No scenario execution is registered for ${context.name}.`);
    }
    ScenarioRunner.executions.delete(context.name);
    await execution.run();
  }

  async run(scenarios: readonly ScenarioInterface<TInput, TOutput>[]): Promise<void> {
    for (let scenarioIndex = 0; scenarioIndex < scenarios.length; scenarioIndex += 1) {
      const scenario = scenarios[scenarioIndex];
      if (scenario === undefined) {
        continue;
      }
      const testName = `${this.suite} :: ${scenario.kind} :: ${scenario.name}`;
      ScenarioRunner.executions.set(testName, new ScenarioExecutionTask(this.subject, scenario));
      await test(testName, ScenarioRunner.execute);
    }
  }
}
