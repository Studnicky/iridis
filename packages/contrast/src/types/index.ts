import type { CorrectionCandidateInterfaceTypeEntity } from '../entities/CorrectionCandidateInterfaceTypeEntity.ts';
import type { CvdEvalInterfaceTypeEntity } from '../entities/CvdEvalInterfaceTypeEntity.ts';
import type { CvdMatrixInterfaceTypeEntity } from '../entities/CvdMatrixInterfaceTypeEntity.ts';
import type { CvdThresholdInterfaceTypeEntity } from '../entities/CvdThresholdInterfaceTypeEntity.ts';

type CvdMatrixSchemaShapeType = CvdMatrixInterfaceTypeEntity.Type;

/** `matrix` is narrowed from `number[]` to the exact 9-tuple JSON Schema's array `items` keyword cannot express. */
export type CvdMatrixInterfaceType = {
  [K in keyof CvdMatrixSchemaShapeType]-?: K extends 'matrix'
    ? [number, number, number, number, number, number, number, number, number]
    : CvdMatrixSchemaShapeType[K];
};

type CvdThresholdSchemaShapeType = CvdThresholdInterfaceTypeEntity.Type;

export type CvdThresholdInterfaceType = { [K in keyof CvdThresholdSchemaShapeType]-?: CvdThresholdSchemaShapeType[K] };

type CvdEvalSchemaShapeType = CvdEvalInterfaceTypeEntity.Type;

export type CvdEvalInterfaceType = { [K in keyof CvdEvalSchemaShapeType]-?: CvdEvalSchemaShapeType[K] };

type CorrectionCandidateSchemaShapeType = CorrectionCandidateInterfaceTypeEntity.Type;

export type CorrectionCandidateInterfaceType = { [K in keyof CorrectionCandidateSchemaShapeType]-?: CorrectionCandidateSchemaShapeType[K] };

export type * from './augmentation.ts';
