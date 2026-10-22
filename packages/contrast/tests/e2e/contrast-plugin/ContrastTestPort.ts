import type { ColorRecordInterfaceTypeEntity, PaletteStateInterface } from '@studnicky/iridis';
import type { LoggerInterface } from '@studnicky/logger/interfaces';
import type { JSONSchema7Type } from 'json-schema';

import { ContrastPolicy, InputInterfaceTypeEntity, Metadata, PaletteRoleState, RoleProvenanceInterfaceTypeEntity, RuntimeOptionsInterfaceTypeEntity } from '@studnicky/iridis';
import { contrastPlugin } from '@studnicky/iridis-contrast';
import { Engine } from '@studnicky/iridis/engine';
import { coreTasks } from '@studnicky/iridis/tasks';

import { enforceCompliance } from '../../../src/tasks/EnforceCompliance.ts';
import { enforceCvdSimulate } from '../../../src/tasks/EnforceCvdSimulate.ts';
import { reportCompliance } from '../../../src/tasks/ReportCompliance.ts';

/** Typed test boundary for complete contrast-plugin engine runs and direct CVD probes. */
export class ContrastTestPort {
  static createEngine(): Engine {
    const engine = new Engine();
    for (let index = 0; index < coreTasks.length; index += 1) {
      const task = coreTasks[index];
      if (task !== undefined) {
        engine.tasks.register(task);
      }
    }
    engine.adopt(contrastPlugin);
    return engine;
  }

  static runCorrectedCvd(roles: Readonly<Record<string, ColorRecordInterfaceTypeEntity.Type>>, contrastPairs: readonly JSONSchema7Type[], logger: LoggerInterface, statedRoleNames: readonly string[] = []): PaletteStateInterface {
    const state = ContrastTestPort.directState(roles, contrastPairs, statedRoleNames);
    enforceCvdSimulate.run(state, { 'logger': logger, 'startedAt': Date.now() });
    return state;
  }

  static runCompliance(roles: Readonly<Record<string, ColorRecordInterfaceTypeEntity.Type>>, contrastPairs: readonly JSONSchema7Type[], logger: LoggerInterface, statedRoleNames: readonly string[] = []): PaletteStateInterface {
    const state = ContrastTestPort.directState(roles, contrastPairs, statedRoleNames);
    const context = { 'logger': logger, 'startedAt': Date.now() };
    enforceCompliance.run(state, context);
    reportCompliance.run(state, context);
    return state;
  }

  static runObservedCvd(roles: Readonly<Record<string, ColorRecordInterfaceTypeEntity.Type>>, contrastPairs: readonly JSONSchema7Type[], logger: LoggerInterface): PaletteStateInterface {
    const state = ContrastTestPort.directState(roles, contrastPairs, []);
    const requirements = ContrastPolicy.normalize(state.input, PaletteRoleState.admit(state.roles));
    enforceCvdSimulate.observe(state, { 'logger': logger, 'startedAt': Date.now() }, requirements);
    return state;
  }

  private static directState(
    roles: Readonly<Record<string, ColorRecordInterfaceTypeEntity.Type>>,
    contrastPairs: readonly JSONSchema7Type[],
    statedRoleNames: readonly string[]
  ): PaletteStateInterface {
    const input = InputInterfaceTypeEntity.intake({
      'colors': [],
      'contrast': { 'cvdCorrect': true },
      'roles': { 'contrastPairs': contrastPairs, 'name': 'cvd-direct-probe', 'roles': [] }
    });
    const state: PaletteStateInterface = {
      'colors': [], 'input': input, 'metadata': {}, 'outputs': {}, 'roles': { ...roles },
      'runtime': RuntimeOptionsInterfaceTypeEntity.intake({ 'colorSpace': 'srgb', 'extra': {}, 'framing': 'dark' }), 'variants': {}
    };
    const provenance = new Map();
    for (let index = 0; index < statedRoleNames.length; index += 1) {
      const name = statedRoleNames[index];
      if (name !== undefined) {
        provenance.set(name, RoleProvenanceInterfaceTypeEntity.create({ 'adjustments': [], 'origin': 'stated' }));
      }
    }
    Metadata.writeRoleProvenance(state.metadata, provenance);
    return state;
  }
}
