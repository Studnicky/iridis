import type { PaletteSnapshotEntity } from '../entities/PaletteSnapshotEntity.ts';
import type { PaletteSessionImageEntity } from './entities/PaletteSessionImageEntity.ts';
import type { PaletteSessionInputEntity } from './entities/PaletteSessionInputEntity.ts';

import { AccessibilityBlockers } from '../accessibilityBlockers.ts';
import { PaletteAdmission } from '../paletteAdmission.ts';
import { PaletteSessionFeasibilityEntity } from './entities/PaletteSessionFeasibilityEntity.ts';
import { PaletteSessionReadModelEntity } from './entities/PaletteSessionReadModelEntity.ts';
import { PaletteSessionInput } from './PaletteSessionInput.ts';

/** Derives each successive read model from the previous one; a withheld palette keeps the last admitted one. */
export class PaletteSessionReadModel {
  public static failed(model: PaletteSessionReadModelEntity.Type, message: string): PaletteSessionReadModelEntity.Type {
    const result = PaletteSessionReadModelEntity.create({
      'blockers': model.blockers,
      'correlationId': model.correlationId,
      'error': message,
      'feasibility': model.feasibility,
      'image': model.image,
      'input': model.input,
      ...PaletteSessionReadModel.resolvedOf(model),
      'revision': model.revision,
      'status': 'failed',
      'withheld': model.withheld
    });
    return result;
  }

  /** A check is in flight; the previous report stays visible, and an already-running check keeps the same model. */
  public static feasibilityChecking(model: PaletteSessionReadModelEntity.Type): PaletteSessionReadModelEntity.Type {
    const previous = model.feasibility;
    const checking = PaletteSessionFeasibilityEntity.create({ ...PaletteSessionReadModel.reportOf(previous), 'status': 'checking' });
    const result = previous.status === 'checking' ? model : PaletteSessionReadModel.withFeasibility(model, checking);
    return result;
  }

  /** The last check failed; the previous report stays visible. */
  public static feasibilityFailed(model: PaletteSessionReadModelEntity.Type, message: string): PaletteSessionReadModelEntity.Type {
    const failed = PaletteSessionFeasibilityEntity.create({
      'error': message,
      ...PaletteSessionReadModel.reportOf(model.feasibility),
      'status': 'failed'
    });
    const result = PaletteSessionReadModel.withFeasibility(model, failed);
    return result;
  }

  /** The newest check delivered its report. */
  public static feasibilityReported(
    model: PaletteSessionReadModelEntity.Type,
    report: NonNullable<PaletteSessionFeasibilityEntity.Type['report']>
  ): PaletteSessionReadModelEntity.Type {
    const result = PaletteSessionReadModel.withFeasibility(model, PaletteSessionFeasibilityEntity.create({ 'report': report, 'status': 'idle' }));
    return result;
  }

  public static initial(input: PaletteSessionInputEntity.Type, image: PaletteSessionImageEntity.Type): PaletteSessionReadModelEntity.Type {
    const result = PaletteSessionReadModelEntity.create({
      'blockers': AccessibilityBlockers.fromReport(undefined),
      'correlationId': 'session',
      'feasibility': PaletteSessionFeasibilityEntity.create({ 'status': 'idle' }),
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
      'blockers': model.blockers,
      'correlationId': correlationId,
      ...PaletteSessionReadModel.errorOf(model),
      'feasibility': model.feasibility,
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
      'blockers': blockers,
      'correlationId': model.correlationId,
      'feasibility': model.feasibility,
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
      'blockers': model.blockers,
      'correlationId': correlationId,
      'feasibility': model.feasibility,
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

  private static reportOf(feasibility: PaletteSessionFeasibilityEntity.Type): { 'report'?: NonNullable<PaletteSessionFeasibilityEntity.Type['report']> } {
    const result = feasibility.report === undefined ? {} : { 'report': feasibility.report };
    return result;
  }

  private static withFeasibility(model: PaletteSessionReadModelEntity.Type, feasibility: PaletteSessionFeasibilityEntity.Type): PaletteSessionReadModelEntity.Type {
    const result = PaletteSessionReadModelEntity.create({
      'blockers': model.blockers,
      'correlationId': model.correlationId,
      ...PaletteSessionReadModel.errorOf(model),
      'feasibility': feasibility,
      'image': model.image,
      'input': model.input,
      ...PaletteSessionReadModel.resolvedOf(model),
      'revision': model.revision,
      'status': model.status,
      'withheld': model.withheld
    });
    return result;
  }

  private static resolvedOf(model: PaletteSessionReadModelEntity.Type): { 'resolved'?: NonNullable<PaletteSessionReadModelEntity.Type['resolved']> } {
    const result = model.resolved === undefined ? {} : { 'resolved': model.resolved };
    return result;
  }
}
