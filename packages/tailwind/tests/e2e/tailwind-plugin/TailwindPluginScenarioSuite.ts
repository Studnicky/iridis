import { TailwindCssVariableScenarioSuite } from './TailwindCssVariableScenarioSuite.ts';
import { TailwindGoldenScenarioSuite } from './TailwindGoldenScenarioSuite.ts';
import { TailwindPaletteBoundaryScenarioSuite } from './TailwindPaletteBoundaryScenarioSuite.ts';
import { TailwindPluginShapeScenarioSuite } from './TailwindPluginShapeScenarioSuite.ts';
import { TailwindSupportsGatingScenarioSuite } from './TailwindSupportsGatingScenarioSuite.ts';
import { TailwindThemeConfigScenarioSuite } from './TailwindThemeConfigScenarioSuite.ts';
import { TailwindTokenNamingScenarioSuite } from './TailwindTokenNamingScenarioSuite.ts';

/** Registers Tailwind's independently focused E2E scenario cells. */
export class TailwindPluginScenarioSuite {
  static run(): void {
    TailwindCssVariableScenarioSuite.run();
    TailwindGoldenScenarioSuite.run();
    TailwindPaletteBoundaryScenarioSuite.run();
    TailwindPluginShapeScenarioSuite.run();
    TailwindSupportsGatingScenarioSuite.run();
    TailwindThemeConfigScenarioSuite.run();
    TailwindTokenNamingScenarioSuite.run();
  }
}
