import type { PaletteStateInterface } from '@studnicky/iridis';

import { ApcaPairResultSetInterfaceTypeEntity } from '../../../src/entities/ApcaPairResultSetInterfaceTypeEntity.ts';
import { CvdResultSetInterfaceTypeEntity } from '../../../src/entities/CvdResultSetInterfaceTypeEntity.ts';
import { WcagPairResultSetInterfaceTypeEntity } from '../../../src/entities/WcagPairResultSetInterfaceTypeEntity.ts';

/** Validated metadata access for contrast scenario assertions. */
export class ContrastMetadataAssertionPort {
  static aa(state: PaletteStateInterface): WcagPairResultSetInterfaceTypeEntity.Type | undefined {
    const value = state.metadata['contrast:aa'];
    const result = value === undefined ? undefined : WcagPairResultSetInterfaceTypeEntity.intake(value);
    return result;
  }

  static aaa(state: PaletteStateInterface): WcagPairResultSetInterfaceTypeEntity.Type | undefined {
    const value = state.metadata['contrast:aaa'];
    const result = value === undefined ? undefined : WcagPairResultSetInterfaceTypeEntity.intake(value);
    return result;
  }

  static apca(state: PaletteStateInterface): ApcaPairResultSetInterfaceTypeEntity.Type | undefined {
    const value = state.metadata['contrast:apca'];
    const result = value === undefined ? undefined : ApcaPairResultSetInterfaceTypeEntity.intake(value);
    return result;
  }

  static cvd(state: PaletteStateInterface): CvdResultSetInterfaceTypeEntity.Type | undefined {
    const value = state.metadata['contrast:cvd'];
    const result = value === undefined ? undefined : CvdResultSetInterfaceTypeEntity.intake(value);
    return result;
  }
}
