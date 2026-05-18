import type {
  PluginInterface,
  PluginSchemaContributionInterface,
  TaskInterface,
} from '@studnicky/iridis';
import { enforceApca }        from './tasks/EnforceApca.ts';
import { enforceCvdSimulate } from './tasks/EnforceCvdSimulate.ts';
import { enforceWcagAa }      from './tasks/EnforceWcagAa.ts';
import { enforceWcagAaa }     from './tasks/EnforceWcagAaa.ts';

const wcagPairResultSchema = {
  'type': 'object',
  'additionalProperties': false,
  'properties': {
    'foreground': { 'type': 'string' },
    'background': { 'type': 'string' },
    'algorithm':  { 'type': 'string', 'enum': ['wcag21', 'apca'] },
    'required':   { 'type': 'number' },
    'before':     { 'type': 'number' },
    'after':      { 'type': 'number' },
    'pass':       { 'type': 'boolean' },
  },
} as const;

const apcaPairResultSchema = {
  'type': 'object',
  'additionalProperties': false,
  'properties': {
    'foreground': { 'type': 'string' },
    'background': { 'type': 'string' },
    'algorithm':  { 'type': 'string', 'enum': ['apca'] },
    'requiredLc': { 'type': 'number' },
    'beforeLc':   { 'type': 'number' },
    'afterLc':    { 'type': 'number' },
    'pass':       { 'type': 'boolean' },
  },
} as const;

const cvdWarningSchema = {
  'type': 'object',
  'additionalProperties': false,
  'properties': {
    'foreground':                 { 'type': 'string' },
    'background':                 { 'type': 'string' },
    'cvdType':                    { 'type': 'string' },
    'originalLuminanceContrast':  { 'type': 'number' },
    'simulatedLuminanceContrast': { 'type': 'number' },
    'drop':                       { 'type': 'number' },
    'dropThreshold':              { 'type': 'number' },
    'minSimulatedContrast':       { 'type': 'number' },
  },
} as const;

const wcagMetadataSchema = {
  'type': 'object',
  'additionalProperties': false,
  'properties': {
    'aa': {
      'type': 'object',
      'additionalProperties': false,
      'properties': { 'pairs': { 'type': 'array', 'items': wcagPairResultSchema } },
    },
    'aaa': {
      'type': 'object',
      'additionalProperties': false,
      'properties': { 'pairs': { 'type': 'array', 'items': wcagPairResultSchema } },
    },
    'apca': {
      'type': 'object',
      'additionalProperties': false,
      'properties': { 'pairs': { 'type': 'array', 'items': apcaPairResultSchema } },
    },
    'cvd': {
      'type': 'object',
      'additionalProperties': false,
      'properties': { 'warnings': { 'type': 'array', 'items': cvdWarningSchema } },
    },
  },
} as const;

export class ContrastPlugin implements PluginInterface {
  readonly 'name'    = 'contrast';

  readonly 'version' = '0.1.0';

  tasks(): readonly TaskInterface[] {
    return [
      enforceWcagAa,
      enforceWcagAaa,
      enforceApca,
      enforceCvdSimulate,
    ];
  }

  schemas(): PluginSchemaContributionInterface {
    return {
      'metadata': {
        'contrast:aa':   wcagMetadataSchema.properties.aa,
        'contrast:aaa':  wcagMetadataSchema.properties.aaa,
        'contrast:apca': wcagMetadataSchema.properties.apca,
        'contrast:cvd':  wcagMetadataSchema.properties.cvd,
      },
    };
  }
}

export const contrastPlugin = new ContrastPlugin();
