import type { InferType } from '@studnicky/json-tology/types';
import type { JSONSchema7Type } from 'json-schema';

import { EntityCompiler } from '@studnicky/entity/node';
import { Validator } from '@studnicky/iridis/model';

import { ContrastFeasibilityProofEntity } from './ContrastFeasibilityProofEntity.ts';
import { ContrastSampledFeasibilityEvidenceEntity } from './ContrastSampledFeasibilityEvidenceEntity.ts';
import { HueRangeEntity } from './HueRangeEntity.ts';

/** Reachability classification and optional measured evidence for one declared role pair. */
export namespace ContrastPairFeasibilityEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'background': { 'type': 'string' },
      'foreground': { 'type': 'string' },
      'proof': ContrastFeasibilityProofEntity.Schema,
      'reachability': {
        'enum': ['always-reachable', 'never-reachable', 'reachable-only-for-some-hues', 'indeterminate'],
        'type': 'string'
      },
      'reachableHueRanges': {
        'items': HueRangeEntity.Schema,
        'type': 'array'
      },
      'sampled': ContrastSampledFeasibilityEvidenceEntity.Schema
    },
    'required': ['background', 'foreground', 'reachableHueRanges', 'reachability'],
    'type': 'object'
  } as const;

  export type Type = InferType<typeof Schema>;

  export const validate = (value: JSONSchema7Type): value is Type => {
    const validation = new Validator().validate(Schema, value);
    const result = validation.errors.length === 0;
    return result;
  };
  export const intake: ReturnType<typeof EntityCompiler.compileIntake<Type>> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: ReturnType<typeof EntityCompiler.compileCreate<Type>> = EntityCompiler.compileCreate<Type>(Schema);
}
