import type { PaletteStateInterface, PipelineContextInterface, TaskInterface } from '@studnicky/iridis';
import type { JSONSchema7Type } from 'json-schema';

import { ModuleError } from '@studnicky/errors/node';
import { TaskManifestEntity } from '@studnicky/iridis';
import { LOG_STATUS, LogBody } from '@studnicky/logger/node';
import { JsonObject, JsonValue } from '@studnicky/types/node';

import { vscodeSeedRoleData } from '../data/vscodeSeedRoleData.ts';
import { VscodeRoleBridgeEntity } from '../entities/VscodeRoleBridgeEntity.ts';
import { VscodeRolePaletteEntity } from '../entities/VscodeRolePaletteEntity.ts';
import { VscodeRoleProjectionEntity } from '../entities/VscodeRoleProjectionEntity.ts';

class VscodeRoleBridgeResolution {
  static readonly #seedRoleTier = vscodeSeedRoleData.roleTiers[2];
  static readonly #seedRoleNames = VscodeRoleBridgeResolution.#seedRoleTier.roleNames;

  static bridge(state: PaletteStateInterface): {
    readonly 'palette': VscodeRolePaletteEntity.Type;
    readonly 'projection': VscodeRoleProjectionEntity.Type;
  } | undefined {
    const candidate = state.input.metadata?.['vscode:roleBridge'];
    if (candidate === undefined) {
      return undefined;
    }
    const bridge = VscodeRoleBridgeEntity.intake(candidate);
    if (state.runtime.framing !== bridge.framing) {
      throw ModuleError.create('vscode:bridgeRoles requires bridge framing to equal runtime.framing', {
        'context': { 'bridgeFraming': bridge.framing, 'runtimeFraming': state.runtime.framing },
        'scenario': 'CONFIGURATION'
      });
    }
    const bridgeRoles = new Map(Object.entries(bridge.roles));
    const resolvedRoles = new Map(Object.entries(state.roles));
    const paletteEntries = new Map<string, JSONSchema7Type>();
    const projectionEntries = new Map<string, JSONSchema7Type>();
    for (let roleIndex = 0; roleIndex < VscodeRoleBridgeResolution.#seedRoleNames.length; roleIndex += 1) {
      const seedRole = VscodeRoleBridgeResolution.#seedRoleNames.at(roleIndex);
      if (seedRole === undefined) {
        continue;
      }
      const candidates = bridgeRoles.get(seedRole);
      const sourceRole = VscodeRoleBridgeResolution.sourceRole(resolvedRoles, candidates, seedRole);
      const color = resolvedRoles.get(sourceRole);
      if (color === undefined) {
        throw ModuleError.create(`vscode:bridgeRoles resolved absent source role '${sourceRole}'`, {
          'context': { 'seedRole': seedRole, 'sourceRole': sourceRole },
          'scenario': 'CONFIGURATION'
        });
      }
      paletteEntries.set(seedRole, color);
      projectionEntries.set(seedRole, { 'color': color, 'sourceRole': sourceRole });
    }
    const palette = VscodeRolePaletteEntity.intake({
      'framing': bridge.framing,
      'roles': JsonObject.fromEntries(paletteEntries),
      'tier': VscodeRoleBridgeResolution.#seedRoleTier.tier
    });
    const projection = VscodeRoleProjectionEntity.intake({
      'framing': bridge.framing,
      'roles': JsonObject.fromEntries(projectionEntries)
    });
    return { 'palette': palette, 'projection': projection };
  }

  private static sourceRole(
    roles: ReadonlyMap<string, JSONSchema7Type>,
    candidates: readonly string[] | undefined,
    seedRole: string
  ): string {
    if (candidates === undefined) {
      throw ModuleError.create(`vscode:roleBridge omits canonical seed role '${seedRole}'`, {
        'context': { 'seedRole': seedRole },
        'scenario': 'CONFIGURATION'
      });
    }
    for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex += 1) {
      const candidate = candidates.at(candidateIndex);
      if (candidate !== undefined && roles.has(candidate)) {
        return candidate;
      }
    }
    throw ModuleError.create(`vscode:bridgeRoles cannot resolve seed role '${seedRole}'`, {
      'context': { 'candidates': candidates, 'seedRole': seedRole },
      'scenario': 'CONFIGURATION'
    });
  }
}

class BridgeVscodeRoles implements TaskInterface {
  readonly 'name' = 'vscode:bridgeRoles';

  readonly 'manifest' = TaskManifestEntity.create({
    'description': 'Maps resolved caller roles to the canonical VS Code seed palette without inventing unresolved colours.',
    'name': 'vscode:bridgeRoles',
    'reads': ['input.metadata.vscode:roleBridge', 'roles', 'runtime.framing'],
    'requires': ['enforce:contrast'],
    'writes': ['metadata.vscode:rolePalette', 'metadata.vscode:roleProjection']
  });

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    const result = VscodeRoleBridgeResolution.bridge(state);
    if (result === undefined) {
      return;
    }
    state.metadata['vscode:rolePalette'] = JsonValue.from(result.palette);
    state.metadata['vscode:roleProjection'] = JsonValue.from(result.projection);
    context.logger.debug(
      LogBody.create({
        'component': 'BridgeVscodeRoles',
        'context': { 'framing': result.palette.framing, 'tier': result.palette.tier },
        'message': 'Mapped resolved caller roles to VS Code seed roles',
        'operation': 'run',
        'status': LOG_STATUS.SUCCESS
      })
    );
  }
}

export const bridgeVscodeRoles = new BridgeVscodeRoles();
