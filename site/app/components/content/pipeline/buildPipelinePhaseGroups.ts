import { coreTasks } from '@studnicky/iridis';
import { contrastPlugin } from '@studnicky/iridis-contrast';
import { COLOR_PIPELINE } from '~/composables/colorPipeline.ts';
import { OPTIONAL_STAGE_NAMES } from '~/composables/optionalStageNames.ts';
import { intakeHexHint } from '~/theme/IntakeHexHint.ts';
import { pinDerivedRoles } from '~/theme/PinDerivedRoles.ts';

type PipelineTaskType = {
  name: string;
  manifest?: {
    description?: string;
    reads?: string[];
    writes?: string[];
  };
};

export type PipelineStageType = {
  label: string;
  description: string;
  optional: boolean;
  reads: string[];
  value: string;
  writes: string[];
};

const TASKS_BY_NAME = new Map(
  [...coreTasks, intakeHexHint, pinDerivedRoles, ...contrastPlugin.tasks()].map((task) => [task.name, task] as const)
);

function stageFor(name: string, index: number): PipelineStageType {
  const task = TASKS_BY_NAME.get(name) as PipelineTaskType | undefined;
  return {
    'label': `${index + 1}. ${name}`,
    'description': task?.manifest?.description ?? '(task not registered)',
    'optional': OPTIONAL_STAGE_NAMES.includes(name),
    'reads': task?.manifest?.reads ?? [],
    'value': name,
    'writes': task?.manifest?.writes ?? []
  };
}

function stageNamesByPrefix(stages: readonly PipelineStageType[]): Map<string, string[]> {
  const byPrefix = new Map<string, string[]>();
  for (const stage of stages) {
    const prefix = stage.value.split(':')[0] ?? stage.value;
    const list = byPrefix.get(prefix) ?? [];
    list.push(stage.value);
    byPrefix.set(prefix, list);
  }
  return byPrefix;
}

export function buildPipelinePhaseGroups(): {
  readonly label: string;
  readonly stages: PipelineStageType[];
}[] {
  const stages = COLOR_PIPELINE.map(stageFor);
  const stagesByValue = new Map<string, PipelineStageType>(stages.map((stage) => [stage.value, stage]));
  const namesByPrefix = stageNamesByPrefix(stages);
  const namesFor = (...prefixes: string[]) => prefixes.flatMap((prefix) => namesByPrefix.get(prefix) ?? []);
  const enforceStageNames = namesByPrefix.get('enforce') ?? [];

  return [
    { 'label': 'Intake', 'names': namesFor('intake') },
    { 'label': 'Resolve', 'names': namesFor('derive', 'resolve', 'pin', 'expand') },
    { 'label': 'Enforce', 'names': enforceStageNames },
    { 'label': 'Emit', 'names': namesFor('emit') }
  ]
    .map((group) => ({
      'label': group.label,
      'stages': group.names.map((name) => stagesByValue.get(name)).filter((stage): stage is PipelineStageType => stage !== undefined)
    }))
    .filter((group) => group.stages.length > 0);
}
