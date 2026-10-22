import type {
  ColorRecordInterfaceTypeEntity,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface
} from '@studnicky/iridis';

import {
  ContrastPolicy,
  enforceContrast,
  Metadata,
  PaletteRoleState,
  TaskManifestInterfaceTypeEntity
} from '@studnicky/iridis';

import { CvdFailurePolicy } from '../CvdFailurePolicy.ts';
import { enforceCvdSimulate } from './EnforceCvdSimulate.ts';

class ComplianceRoles {
  static capture(state: PaletteStateInterface): ReadonlyMap<string, ColorRecordInterfaceTypeEntity.Type> {
    const result = new Map<string, ColorRecordInterfaceTypeEntity.Type>();
    const entries = Object.entries(state.roles);
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (entry !== undefined) {
        result.set(entry[0], entry[1]);
      }
    }
    return result;
  }

  static restore(
    state: PaletteStateInterface,
    snapshot: ReadonlyMap<string, ColorRecordInterfaceTypeEntity.Type>
  ): void {
    for (const [roleName, role] of snapshot) {
      Object.defineProperty(state.roles, roleName, {
        'configurable': true,
        'enumerable': true,
        'value': role,
        'writable': true
      });
    }
  }
}

/** Resolves selected-standard contrast, refines CVD stability, then restores terminal standard compliance. */
class EnforceCompliance implements TaskInterface {
  readonly 'name' = 'enforce:compliance';

  readonly 'manifest' = TaskManifestInterfaceTypeEntity.create({
    'description': 'Applies the selected contrast standard, CVD refinement, and terminal standard remeasurement without mutating stated roles.',
    'name': 'enforce:compliance',
    'reads': [
      'roles',
      'input.roles',
      'input.contrast',
      "metadata['core:roleProvenance']"
    ],
    'writes': [
      'roles',
      "metadata['contrast:cvd']",
      "metadata['core:contrastReport']",
      "metadata['core:roleProvenance']"
    ]
  });

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    enforceContrast.run(state, context);
    const requirements = ContrastPolicy.normalize(
      state.input,
      PaletteRoleState.admit(state.roles)
    );
    const standardRoles = ComplianceRoles.capture(state);
    if (Metadata.contrastReport(state.metadata)?.compliant !== true) {
      enforceCvdSimulate.observe(state, context, requirements, standardRoles);
      return;
    }
    const failurePolicy = CvdFailurePolicy.resolve(state.input.contrast);
    if (!failurePolicy.mutatesRoles()) {
      enforceCvdSimulate.observe(state, context, requirements, standardRoles);
      return;
    }
    enforceCvdSimulate.refine(state, context, requirements);
    enforceContrast.run(state, context);
    if (Metadata.contrastReport(state.metadata)?.compliant !== true) {
      ComplianceRoles.restore(state, standardRoles);
      enforceContrast.run(state, context);
    }
    enforceCvdSimulate.reconcile(state, context, requirements, standardRoles);
  }
}

export const enforceCompliance = new EnforceCompliance();
