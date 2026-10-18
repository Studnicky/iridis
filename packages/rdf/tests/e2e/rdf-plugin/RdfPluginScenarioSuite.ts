import { RdfPluginAnnotateScenarioSuite } from './RdfPluginAnnotateScenarioSuite.ts';
import { RdfPluginContentScenarioSuite } from './RdfPluginContentScenarioSuite.ts';
import { RdfPluginMissingGraphScenarioSuite } from './RdfPluginMissingGraphScenarioSuite.ts';
import { RdfPluginPluginShapeScenarioSuite } from './RdfPluginPluginShapeScenarioSuite.ts';
import { RdfPluginSerializeScenarioSuite } from './RdfPluginSerializeScenarioSuite.ts';
import { RdfPluginVocabScenarioSuite } from './RdfPluginVocabScenarioSuite.ts';

/** Registers the RDF plugin's independently focused E2E scenario cells. */
export class RdfPluginScenarioSuite {
  static async run(): Promise<void> {
    await RdfPluginPluginShapeScenarioSuite.run();
    await RdfPluginVocabScenarioSuite.run();
    await RdfPluginAnnotateScenarioSuite.run();
    await RdfPluginSerializeScenarioSuite.run();
    await RdfPluginContentScenarioSuite.run();
    await RdfPluginMissingGraphScenarioSuite.run();
  }
}
