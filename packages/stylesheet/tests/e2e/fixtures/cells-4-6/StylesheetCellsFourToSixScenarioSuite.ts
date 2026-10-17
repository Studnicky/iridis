import { StylesheetCellFiveScenarioSuite } from './StylesheetCellFiveScenarioSuite.ts';
import { StylesheetCellFourScenarioSuite } from './StylesheetCellFourScenarioSuite.ts';
import { StylesheetCellSixScenarioSuite } from './StylesheetCellSixScenarioSuite.ts';

interface ScenarioSuiteInterface {
  run(): Promise<void>;
}

/** Frozen aggregate for the cells 4–6 stylesheet behavioral suites. */
export class StylesheetCellsFourToSixScenarioSuite {
  private static readonly suites = Object.freeze([
    StylesheetCellFourScenarioSuite,
    StylesheetCellFiveScenarioSuite,
    StylesheetCellSixScenarioSuite
  ] satisfies readonly ScenarioSuiteInterface[]);

  static async run(): Promise<void> {
    const suiteCount = StylesheetCellsFourToSixScenarioSuite.suites.length;
    for (let index = 0; index < suiteCount; index += 1) {
      const suite = StylesheetCellsFourToSixScenarioSuite.suites.at(index);
      if (suite !== undefined) {
        await suite.run();
      }
    }
  }
}
