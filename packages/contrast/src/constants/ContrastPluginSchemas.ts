import { APCA_PAIR_RESULT_SCHEMA } from './ApcaPairResultSchema.ts';
import { CVD_CORRECTION_SCHEMA } from './CvdCorrectionSchema.ts';
import { CVD_WARNING_SCHEMA } from './CvdWarningSchema.ts';
import { WCAG_PAIR_RESULT_SCHEMA } from './WcagPairResultSchema.ts';

export const CONTRAST_PLUGIN_SCHEMAS = Object.freeze({
  'aa': {
    'additionalProperties': false,
    'properties': { 'pairs': { 'items': WCAG_PAIR_RESULT_SCHEMA, 'type': 'array' } },
    'type': 'object'
  },
  'aaa': {
    'additionalProperties': false,
    'properties': { 'pairs': { 'items': WCAG_PAIR_RESULT_SCHEMA, 'type': 'array' } },
    'type': 'object'
  },
  'apca': {
    'additionalProperties': false,
    'properties': { 'pairs': { 'items': APCA_PAIR_RESULT_SCHEMA, 'type': 'array' } },
    'type': 'object'
  },
  'cvd': {
    'additionalProperties': false,
    'properties': {
      'corrections': { 'items': CVD_CORRECTION_SCHEMA, 'type': 'array' },
      'warnings': { 'items': CVD_WARNING_SCHEMA, 'type': 'array' }
    },
    'type': 'object'
  }
} as const);
