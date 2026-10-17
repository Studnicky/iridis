import { StylesheetScopedPrefixScenarioSuite } from './StylesheetScopedPrefixScenarioSuite.ts';
import { StylesheetScopedVariantsScenarioSuite } from './StylesheetScopedVariantsScenarioSuite.ts';
import { StylesheetScopedWideGamutScenarioSuite } from './StylesheetScopedWideGamutScenarioSuite.ts';

export class StylesheetCellsSevenToNineScenarioSuite {
  private static readonly suites = Object.freeze([
    StylesheetScopedVariantsScenarioSuite,
    StylesheetScopedWideGamutScenarioSuite,
    StylesheetScopedPrefixScenarioSuite
  ]);

  static async run(): Promise<void> {
    for (let index = 0; index < StylesheetCellsSevenToNineScenarioSuite.suites.length; index += 1) {
      const suite = StylesheetCellsSevenToNineScenarioSuite.suites.at(index);
      if (suite !== undefined) {
        await suite.run();
      }
    }
  }
}
