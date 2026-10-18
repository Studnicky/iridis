import { StylesheetCssVarsBasicScenarioSuite } from './StylesheetCssVarsBasicScenarioSuite.ts';
import { StylesheetCssVarsCascadeScenarioSuite } from './StylesheetCssVarsCascadeScenarioSuite.ts';
import { StylesheetPluginShapeScenarioSuite } from './StylesheetPluginShapeScenarioSuite.ts';

export class StylesheetCellsOneToThreeScenarioSuite {
  static async run(): Promise<void> {
    await StylesheetPluginShapeScenarioSuite.run();
    await StylesheetCssVarsBasicScenarioSuite.run();
    await StylesheetCssVarsCascadeScenarioSuite.run();
  }
}
