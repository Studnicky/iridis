import type { JSONSchema7Type } from 'json-schema';

import { ApcaPairResultSetInterfaceTypeEntity } from './entities/ApcaPairResultSetInterfaceTypeEntity.ts';
import { CvdResultSetInterfaceTypeEntity } from './entities/CvdResultSetInterfaceTypeEntity.ts';
import { WcagPairResultSetInterfaceTypeEntity } from './entities/WcagPairResultSetInterfaceTypeEntity.ts';

class ContrastMetadataReader {
  static getContrastMetadata(
    metadata: Record<string, JSONSchema7Type | undefined>,
    key: string
  ): WcagPairResultSetInterfaceTypeEntity.Type | ApcaPairResultSetInterfaceTypeEntity.Type | CvdResultSetInterfaceTypeEntity.Type | undefined {
    const value = metadata[key];

    if ((key === 'contrast:aa' || key === 'contrast:aaa') && value !== undefined && WcagPairResultSetInterfaceTypeEntity.validate(value)) {
      return value;
    }
    if (key === 'contrast:apca' && value !== undefined && ApcaPairResultSetInterfaceTypeEntity.validate(value)) {
      return value;
    }
    if (key === 'contrast:cvd' && value !== undefined && CvdResultSetInterfaceTypeEntity.validate(value)) {
      return value;
    }

    return undefined;
  }
}

export const { getContrastMetadata } = ContrastMetadataReader;
