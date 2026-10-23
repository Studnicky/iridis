import type { PaletteStateInterface, RoleSchemaEntity } from '@studnicky/iridis';

import { Engine, InputEntity } from '@studnicky/iridis';
import { rdfPlugin } from '@studnicky/iridis-rdf';
import { coreTasks } from '@studnicky/iridis/tasks';

/** Canonical construction boundary for RDF plugin E2E scenarios. */
export class RdfPluginScenarioFixture {
  static createEngine(): Engine {
    const engine = new Engine();
    const taskCount = coreTasks.length;
    for (let taskIndex = 0; taskIndex < taskCount; taskIndex += 1) {
      const task = coreTasks[taskIndex];
      if (task !== undefined) {
        engine.tasks.register(task);
      }
    }
    engine.adopt(rdfPlugin);
    return engine;
  }

  static createInput(
    colors: InputEntity.Type['colors'],
    roles: RoleSchemaEntity.Type,
    metadata?: InputEntity.Type['metadata']
  ): InputEntity.Type {
    const result = InputEntity.create({
      'colors': [...colors],
      ...(metadata === undefined ? {} : { 'metadata': metadata }),
      'roles': roles
    });
    return result;
  }

  static graphFrom(state: PaletteStateInterface): string | undefined {
    const graph = state.outputs['rdf:reasoningGraph'];
    const result = typeof graph === 'string' ? graph : undefined;
    return result;
  }

  static serializedFrom(state: PaletteStateInterface): string | undefined {
    const serialized = state.outputs['rdf:serialized'];
    const result = typeof serialized === 'string' ? serialized : undefined;
    return result;
  }
}
