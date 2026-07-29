// Contrast plugin interface definitions.
// Module augmentation on PluginMetadataRegistry has been replaced with
// explicit schema contribution via ContrastPlugin.schemas().

import type { ApcaPairResultInterfaceTypeEntity } from '../entities/ApcaPairResultInterfaceTypeEntity.ts';
import type { CvdCorrectionInterfaceTypeEntity } from '../entities/CvdCorrectionInterfaceTypeEntity.ts';
import type { CvdPairWarningInterfaceTypeEntity } from '../entities/CvdPairWarningInterfaceTypeEntity.ts';
import type { WcagPairResultInterfaceTypeEntity } from '../entities/WcagPairResultInterfaceTypeEntity.ts';

type WcagPairResultSchemaShapeType = WcagPairResultInterfaceTypeEntity.Type;

export type WcagPairResultInterfaceType = { [K in keyof WcagPairResultSchemaShapeType]-?: WcagPairResultSchemaShapeType[K] };

export type WcagPairResultSetInterfaceType = {
  'pairs': WcagPairResultInterfaceType[];
};

type ApcaPairResultSchemaShapeType = ApcaPairResultInterfaceTypeEntity.Type;

export type ApcaPairResultInterfaceType = { [K in keyof ApcaPairResultSchemaShapeType]-?: ApcaPairResultSchemaShapeType[K] };

export type ApcaPairResultSetInterfaceType = {
  'pairs': ApcaPairResultInterfaceType[];
};

type CvdPairWarningSchemaShapeType = CvdPairWarningInterfaceTypeEntity.Type;

export type CvdPairWarningInterfaceType = { [K in keyof CvdPairWarningSchemaShapeType]-?: CvdPairWarningSchemaShapeType[K] };

type CvdCorrectionSchemaShapeType = CvdCorrectionInterfaceTypeEntity.Type;

export type CvdCorrectionInterfaceType = { [K in keyof CvdCorrectionSchemaShapeType]-?: CvdCorrectionSchemaShapeType[K] };

export type CvdResultSetInterfaceType = {
  'corrections': CvdCorrectionInterfaceType[] | undefined;
  'warnings':     CvdPairWarningInterfaceType[];
};

export abstract class WcagMetaSlotInterfaceType {
  abstract 'aa': WcagPairResultSetInterfaceType | undefined;
  abstract 'aaa': WcagPairResultSetInterfaceType | undefined;
  abstract 'apca': ApcaPairResultSetInterfaceType | undefined;
  abstract 'cvd': CvdResultSetInterfaceType | undefined;
}

/** Known `state.metadata` keys written by the contrast enforcement tasks. */
export abstract class ContrastMetadataInterfaceType {
  abstract 'contrast:aa': WcagPairResultSetInterfaceType | undefined;
  abstract 'contrast:aaa': WcagPairResultSetInterfaceType | undefined;
  abstract 'contrast:apca': ApcaPairResultSetInterfaceType | undefined;
  abstract 'contrast:cvd': CvdResultSetInterfaceType | undefined;
}
