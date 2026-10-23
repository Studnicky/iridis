import { coreTasks } from '@studnicky/iridis';
import { contrastPlugin } from '@studnicky/iridis-contrast';

import { COLOR_PIPELINE } from '~/composables/colorPipeline.ts';
import { deriveRoleRelations } from '~/theme/DeriveRoleRelations.ts';
import { deriveSemanticHues } from '~/theme/DeriveSemanticHues.ts';
import { intakeHexHint } from '~/theme/IntakeHexHint.ts';
import { pinDerivedRoles } from '~/theme/PinDerivedRoles.ts';

class PipelineStage {
  public readonly description: string;
  public readonly label: string;
  public readonly reads: string[];
  public readonly value: string;
  public readonly writes: string[];

  public constructor(
    description: string,
    label: string,
    reads: string[],
    value: string,
    writes: string[]
  ) {
    this.description = description;
    this.label = label;
    this.reads = reads;
    this.value = value;
    this.writes = writes;
  }
}

class PipelinePhaseGroup {
  public readonly label: string;
  public readonly stages: PipelineStage[];

  public constructor(label: string, stages: PipelineStage[]) {
    this.label = label;
    this.stages = stages;
  }
}

class PipelinePhaseDefinition {
  public readonly label: string;
  public readonly prefixes: readonly string[];

  public constructor(label: string, prefixes: readonly string[]) {
    this.label = label;
    this.prefixes = prefixes;
  }
}

export const buildPipelinePhaseGroups = class PipelinePhaseGroupsBuilder {
  private static readonly phaseDefinitions: readonly PipelinePhaseDefinition[] = [
    new PipelinePhaseDefinition('Intake', ['intake']),
    new PipelinePhaseDefinition('Resolve', ['derive', 'resolve', 'pin', 'expand']),
    new PipelinePhaseDefinition('Enforce', ['enforce', 'report', 'withhold']),
    new PipelinePhaseDefinition('Emit', ['emit'])
  ];

  private static readonly tasksByName = new Map(
    [...coreTasks, intakeHexHint, deriveSemanticHues, pinDerivedRoles, deriveRoleRelations, ...contrastPlugin.tasks()].map((task) => {
      return [task.name, task];
    })
  );

  public static build(): readonly PipelinePhaseGroup[] {
    const stages = COLOR_PIPELINE.map((name, index) => {
      const result = this.buildStage(name, index);
      return result;
    });
    const stagesByValue = new Map(stages.map((stage) => {
      return [stage.value, stage];
    }));
    const namesByPrefix = this.buildStageNamesByPrefix(stages);
    const groups: PipelinePhaseGroup[] = [];
    for (let definitionIndex = 0; definitionIndex < this.phaseDefinitions.length; definitionIndex += 1) {
      const definition = this.phaseDefinitions[definitionIndex];
      if (definition === undefined) {
        continue;
      }
      const phaseStages: PipelineStage[] = [];
      const stageNames = this.resolveStageNames(namesByPrefix, definition.prefixes);
      for (let stageIndex = 0; stageIndex < stageNames.length; stageIndex += 1) {
        const name = stageNames[stageIndex];
        if (name === undefined) {
          continue;
        }
        const stage = stagesByValue.get(name);
        if (stage !== undefined) {
          phaseStages.push(stage);
        }
      }
      if (phaseStages.length > 0) {
        groups.push(new PipelinePhaseGroup(definition.label, phaseStages));
      }
    }
    return groups;
  }

  private static buildStage(name: string, index: number): PipelineStage {
    const task = this.tasksByName.get(name);
    return new PipelineStage(
      task?.manifest?.description ?? '(task not registered)',
      `${index + 1}. ${name}`,
      task?.manifest?.reads ?? [],
      name,
      task?.manifest?.writes ?? []
    );
  }

  private static buildStageNamesByPrefix(stages: readonly PipelineStage[]): Map<string, string[]> {
    const byPrefix = new Map<string, string[]>();
    for (let stageIndex = 0; stageIndex < stages.length; stageIndex += 1) {
      const stage = stages[stageIndex];
      if (stage === undefined) {
        continue;
      }
      const prefix = stage.value.split(':')[0] ?? stage.value;
      const names = byPrefix.get(prefix) ?? [];
      names.push(stage.value);
      byPrefix.set(prefix, names);
    }
    return byPrefix;
  }

  private static resolveStageNames(
    namesByPrefix: ReadonlyMap<string, string[]>,
    prefixes: readonly string[]
  ): string[] {
    const names: string[] = [];
    for (let prefixIndex = 0; prefixIndex < prefixes.length; prefixIndex += 1) {
      const prefix = prefixes[prefixIndex];
      if (prefix !== undefined) {
        names.push(...(namesByPrefix.get(prefix) ?? []));
      }
    }
    return names;
  }
};
