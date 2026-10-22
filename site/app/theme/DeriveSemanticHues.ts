import type {
  PaletteStateInterface, PipelineContextInterface, TaskInterface
} from '@studnicky/iridis';

import { TaskManifestEntity } from '@studnicky/iridis';

import { DerivationConfigEntity } from '../composables/entities/DerivationConfigEntity.ts';
import { SEMANTIC_HUE } from './semanticHue.ts';
import { SEMANTIC_HUE_CLAMP } from './semanticHueClamp.ts';

/**
 * Writes hue targets for semantic status roles to
 * `metadata['core:hueTargetOverrides']`. Explicit admitted derivation
 * relations take precedence, while the immutable input role schema remains
 * unchanged.
 */
class DeriveSemanticHues implements TaskInterface {
  readonly 'name' = 'derive:semanticHues';

  readonly 'manifest' = TaskManifestEntity.create({
    'description': 'Writes absolute hue/hueClamp targets for success/warning/error/info onto metadata[\'core:hueTargetOverrides\'], skipped for any role with an explicit derivation relation, or entirely when metadata[\'derivation:semanticHuesEnabled\'] is false.',
    'name':        'derive:semanticHues',
    'reads':       ['input.roles', 'metadata'],
    'writes':      ['metadata']
  });

  run(state: PaletteStateInterface, _context: PipelineContextInterface): void {
    const roleSchema = state.input.roles;
    if (roleSchema === undefined) {return;}
    if (state.metadata['derivation:semanticHuesEnabled'] === false) {return;}
    const configRaw = state.metadata['derivation:config'];
    const config = DerivationConfigEntity.validate(configRaw)
      ? DerivationConfigEntity.intake(configRaw)
      : undefined;

    const overrides = new Map<string, { 'hue': number; 'hueClamp': number }>();
    const roles = roleSchema.roles;
    for (let index = 0; index < roles.length; index += 1) {
      const role = roles[index];
      if (role === undefined) {continue;}
      const targetHue = SEMANTIC_HUE[role.name];
      if (targetHue === undefined) {continue;}
      if (config?.relations[role.name] !== undefined) {continue;}
      overrides.set(role.name, { 'hue': targetHue, 'hueClamp': SEMANTIC_HUE_CLAMP });
    }
    const serializedOverrides: Record<string, { 'hue': number; 'hueClamp': number }> = {};
    overrides.forEach((override, name) => {
      Object.defineProperty(serializedOverrides, name, { 'configurable': true, 'enumerable': true, 'value': override, 'writable': true });
    });
    state.metadata['core:hueTargetOverrides'] = serializedOverrides;
  }
}

/** Singleton task registered by createColorEngine. */
export const deriveSemanticHues = new DeriveSemanticHues();
