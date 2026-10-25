import { ComplianceReportEntity } from '../entities/ComplianceReportEntity.ts';
import { CvdResultSetEntity } from '../entities/CvdResultSetEntity.ts';

export const CONTRAST_PLUGIN_SCHEMAS = Object.freeze({
  'complianceReport': ComplianceReportEntity.Schema,
  'cvd': CvdResultSetEntity.Schema
} as const);
