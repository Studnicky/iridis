import type { PaletteSnapshotEntity } from '../entities/PaletteSnapshotEntity.ts';
import type { PaletteSessionImageEntity } from './entities/PaletteSessionImageEntity.ts';
import type { PaletteSessionInputEntity } from './entities/PaletteSessionInputEntity.ts';

import { AccessibilityBlockers } from '../accessibilityBlockers.ts';
import { PaletteAdmission } from '../paletteAdmission.ts';
import { PaletteSessionReadModelEntity } from './entities/PaletteSessionReadModelEntity.ts';
import { PaletteSessionInput } from './PaletteSessionInput.ts';

/** Derives each successive read model from the previous one; a withheld palette keeps the last admitted one. */
export class PaletteSessionReadModel {
  public static failed(model: PaletteSessionReadModelEntity.Type, message: string): PaletteSessionReadModelEntity.Type {
    const result = PaletteSessionReadModelEntity.create({
      'correlationId': model.correlationId,
      'error': message,
      'image': model.image,
      'input': model.input,
      ...PaletteSessionReadModel.resolvedOf(model),
      'revision': model.revision,
      'status': 'failed',
      'withheld': model.withheld
    });
    return result;
  }

  public static initial(input: PaletteSessionInputEntity.Type, image: PaletteSessionImageEntity.Type): PaletteSessionReadModelEntity.Type {
    const result = PaletteSessionReadModelEntity.create({
      'correlationId': 'session',
      'image': image,
      'input': input,
      'revision': 0,
      'status': 'resolving',
      'withheld': false
    });
    return result;
  }

  /** The input changed in place; the status carries over. */
  public static revised(
    model: PaletteSessionReadModelEntity.Type,
    revision: number,
    correlationId: string,
    input: PaletteSessionInputEntity.Type,
    image: PaletteSessionImageEntity.Type
  ): PaletteSessionReadModelEntity.Type {
    const result = PaletteSessionReadModelEntity.create({
      'correlationId': correlationId,
      ...PaletteSessionReadModel.errorOf(model),
      'image': image,
      'input': input,
      ...PaletteSessionReadModel.resolvedOf(model),
      'revision': revision,
      'status': model.status,
      'withheld': model.withheld
    });
    return result;
  }

  public static resolved(
    model: PaletteSessionReadModelEntity.Type,
    revision: number,
    correlationId: string,
    input: PaletteSessionInputEntity.Type,
    snapshot: PaletteSnapshotEntity.Type
  ): PaletteSessionReadModelEntity.Type {
    const blockers = AccessibilityBlockers.fromReport(snapshot.compliance);
    const admitted = PaletteAdmission.admit(blockers);
    const admittedPalette = {
      'resolved': {
        'correlationId': correlationId,
        'framing': input.framing,
        'inputFingerprint': PaletteSessionInput.fingerprint(input),
        'revision': revision,
        'snapshot': snapshot
      }
    };
    const result = PaletteSessionReadModelEntity.create({
      'correlationId': model.correlationId,
      'image': model.image,
      'input': model.input,
      ...(admitted ? admittedPalette : PaletteSessionReadModel.resolvedOf(model)),
      'revision': model.revision,
      'status': 'idle',
      'withheld': blockers.withheld
    });
    return result;
  }

  /** A new revision of the input awaits resolution. */
  public static resolving(
    model: PaletteSessionReadModelEntity.Type,
    revision: number,
    correlationId: string,
    input: PaletteSessionInputEntity.Type,
    image: PaletteSessionImageEntity.Type
  ): PaletteSessionReadModelEntity.Type {
    const result = PaletteSessionReadModelEntity.create({
      'correlationId': correlationId,
      'image': image,
      'input': input,
      ...PaletteSessionReadModel.resolvedOf(model),
      'revision': revision,
      'status': 'resolving',
      'withheld': model.withheld
    });
    return result;
  }

  private static errorOf(model: PaletteSessionReadModelEntity.Type): { 'error'?: string } {
    const result = model.error === undefined ? {} : { 'error': model.error };
    return result;
  }

  private static resolvedOf(model: PaletteSessionReadModelEntity.Type): { 'resolved'?: NonNullable<PaletteSessionReadModelEntity.Type['resolved']> } {
    const result = model.resolved === undefined ? {} : { 'resolved': model.resolved };
    return result;
  }
}
