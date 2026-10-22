import { ComplianceReportEntity } from '../entities/ComplianceReportEntity.ts';
import { CVD_BLOCKED_PAIR_SCHEMA } from './CvdBlockedPairSchema.ts';
import { CVD_CORRECTION_SCHEMA } from './CvdCorrectionSchema.ts';
import { CVD_WARNING_SCHEMA } from './CvdWarningSchema.ts';

export const CONTRAST_PLUGIN_SCHEMAS = Object.freeze({
  'complianceReport': ComplianceReportEntity.Schema,
  'cvd': {
    'additionalProperties': false,
    'properties': {
      'blocked': { 'items': CVD_BLOCKED_PAIR_SCHEMA, 'type': 'array' },
      'corrections': { 'items': CVD_CORRECTION_SCHEMA, 'type': 'array' },
      'warnings': { 'items': CVD_WARNING_SCHEMA, 'type': 'array' }
    },
    'required': ['blocked', 'corrections', 'warnings'],
    'type': 'object'
  }
} as const);
