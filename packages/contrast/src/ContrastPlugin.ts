import type {
  PluginInterface,
  PluginSchemaContributionInterface,
  TaskInterface
} from '@studnicky/iridis';

import { enforceApca }        from './tasks/EnforceApca.ts';
import { enforceCvdSimulate } from './tasks/EnforceCvdSimulate.ts';
import { enforceWcagAa }      from './tasks/EnforceWcagAa.ts';
import { enforceWcagAaa }     from './tasks/EnforceWcagAaa.ts';

const wcagPairResultSchema = {
  'additionalProperties': false,
  'properties': {
    'after':      { 'type': 'number' },
    'algorithm':  { 'enum': ['wcag21', 'apca'], 'type': 'string' },
    'background': { 'type': 'string' },
    'before':     { 'type': 'number' },
    'foreground': { 'type': 'string' },
    'pass':       { 'type': 'boolean' },
    'required':   { 'type': 'number' }
  },
  'type': 'object'
} as const;

const apcaPairResultSchema = {
  'additionalProperties': false,
  'properties': {
    'afterLc':    { 'type': 'number' },
    'algorithm':  { 'enum': ['apca'], 'type': 'string' },
    'background': { 'type': 'string' },
    'beforeLc':   { 'type': 'number' },
    'foreground': { 'type': 'string' },
    'pass':       { 'type': 'boolean' },
    'requiredLc': { 'type': 'number' }
  },
  'type': 'object'
} as const;

const cvdWarningSchema = {
  'additionalProperties': false,
  'properties': {
    'background':                 { 'type': 'string' },
    'cvdType':                    { 'type': 'string' },
    'drop':                       { 'type': 'number' },
    'dropThreshold':              { 'type': 'number' },
    'foreground':                 { 'type': 'string' },
    'minSimulatedContrast':       { 'type': 'number' },
    'originalLuminanceContrast':  { 'type': 'number' },
    'simulatedLuminanceContrast': { 'type': 'number' }
  },
  'type': 'object'
} as const;

const wcagMetadataSchema = {
  'additionalProperties': false,
  'properties': {
    'aa': {
      'additionalProperties': false,
      'properties': { 'pairs': { 'items': wcagPairResultSchema, 'type': 'array' } },
      'type': 'object'
    },
    'aaa': {
      'additionalProperties': false,
      'properties': { 'pairs': { 'items': wcagPairResultSchema, 'type': 'array' } },
      'type': 'object'
    },
    'apca': {
      'additionalProperties': false,
      'properties': { 'pairs': { 'items': apcaPairResultSchema, 'type': 'array' } },
      'type': 'object'
    },
    'cvd': {
      'additionalProperties': false,
      'properties': { 'warnings': { 'items': cvdWarningSchema, 'type': 'array' } },
      'type': 'object'
    }
  },
  'type': 'object'
} as const;

export class ContrastPlugin implements PluginInterface {
  readonly 'name'    = 'contrast';

  readonly 'version' = '0.1.0';

  tasks(): readonly TaskInterface[] {
    return [
      enforceWcagAa,
      enforceWcagAaa,
      enforceApca,
      enforceCvdSimulate
    ];
  }

  schemas(): PluginSchemaContributionInterface {
    return {
      'metadata': {
        'contrast:aa':   wcagMetadataSchema.properties.aa,
        'contrast:aaa':  wcagMetadataSchema.properties.aaa,
        'contrast:apca': wcagMetadataSchema.properties.apca,
        'contrast:cvd':  wcagMetadataSchema.properties.cvd
      }
    };
  }
}
