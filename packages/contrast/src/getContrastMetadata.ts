import type { JsonObjectType } from '@studnicky/types';

import type {
  ApcaPairResultSetInterfaceType,
  ContrastMetadataInterfaceType,
  CvdResultSetInterfaceType,
  WcagPairResultSetInterfaceType
} from './types/augmentation.ts';

import { ApcaPairResultSetInterfaceTypeEntity } from './entities/ApcaPairResultSetInterfaceTypeEntity.ts';
import { CvdResultSetInterfaceTypeEntity } from './entities/CvdResultSetInterfaceTypeEntity.ts';
import { WcagPairResultSetInterfaceTypeEntity } from './entities/WcagPairResultSetInterfaceTypeEntity.ts';

class ContrastMetadataReader {
  static getContrastMetadata(
    metadata: JsonObjectType,
    key: 'contrast:aa'
  ): WcagPairResultSetInterfaceType | undefined;
  static getContrastMetadata(
    metadata: JsonObjectType,
    key: 'contrast:aaa'
  ): WcagPairResultSetInterfaceType | undefined;
  static getContrastMetadata(
    metadata: JsonObjectType,
    key: 'contrast:apca'
  ): ApcaPairResultSetInterfaceType | undefined;
  static getContrastMetadata(
    metadata: JsonObjectType,
    key: 'contrast:cvd'
  ): CvdResultSetInterfaceType | undefined;
  static getContrastMetadata(
    metadata: JsonObjectType,
    key: keyof ContrastMetadataInterfaceType
  ): ContrastMetadataInterfaceType[keyof ContrastMetadataInterfaceType] {
    const value = metadata[key];

    if ((key === 'contrast:aa' || key === 'contrast:aaa') && WcagPairResultSetInterfaceTypeEntity.validate(value)) {
      return value;
    }
    if (key === 'contrast:apca' && ApcaPairResultSetInterfaceTypeEntity.validate(value)) {
      return value;
    }
    if (key === 'contrast:cvd' && CvdResultSetInterfaceTypeEntity.validate(value)) {
      return value;
    }

    return undefined;
  }
}

export const { getContrastMetadata } = ContrastMetadataReader;
