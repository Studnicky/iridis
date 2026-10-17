import type { CanonicalShapeType, NominalSchemaType } from '@studnicky/json-tology/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { vscodeSeedRoleData } from '@studnicky/iridis-vscode';

/** Validates a structured VS Code tier palette before it enters the theme pipeline. */
export namespace VscodeThemeRequestEntity {
  export const Schema = {
    '$id': 'https://iridis.dev/site/vscode-theme-request',
    'additionalProperties': false,
    'properties': {
      'framing': { 'enum': ['dark', 'light'], 'type': 'string' },
      'roles': {
        'additionalProperties': { 'pattern': '^#[0-9A-Fa-f]{6}$', 'type': 'string' },
        'type': 'object'
      },
      'tier': { 'enum': [4, 8, 16, 64], 'type': 'number' }
    },
    'required': ['framing', 'roles', 'tier'],
    'type': 'object'
  } as const;

  export type Type = NominalSchemaType<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  const schemaIntake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type, CanonicalShapeType<typeof Schema>>(Schema);

  class TierRoleContract {
    static validate(request: Type): Type {
      let requiredRoleNames: readonly string[] | undefined;
      for (let index = 0; index < vscodeSeedRoleData.roleTiers.length; index += 1) {
        const candidate = vscodeSeedRoleData.roleTiers[index];
        if (candidate?.tier === request.tier) {
          requiredRoleNames = candidate.roleNames;
          break;
        }
      }
      if (requiredRoleNames === undefined) {throw new RangeError(`Unsupported VS Code role tier: ${request.tier}`);}
      const suppliedRoleNames = Object.keys(request.roles);
      if (suppliedRoleNames.length !== requiredRoleNames.length) {
        throw new TypeError(`VS Code theme input must contain exactly the ${request.tier}-tier role names`);
      }
      const suppliedSet = new Set(suppliedRoleNames);
      for (let index = 0; index < requiredRoleNames.length; index += 1) {
        if (!suppliedSet.has(requiredRoleNames[index]!)) {
          throw new TypeError(`VS Code theme input must contain exactly the ${request.tier}-tier role names`);
        }
      }
      return request;
    }
  }

  class InputAdmission {
    static intake(value: unknown): Type {
      const admitted = schemaIntake(value);
      const result = TierRoleContract.validate(admitted);
      return result;
    }
  }

  export const intake = InputAdmission.intake;
}
