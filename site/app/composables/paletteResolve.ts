import type { PaletteStateInterface, RoleProvenanceEntity } from '@studnicky/iridis';
import type { ContrastFeasibilityReportEntity } from '@studnicky/iridis-contrast';

import { colorRecordFactory, ContrastOptionsEntity, InputEntity, Metadata, RoleRelationshipGraphEntity, RoleSchemaEntity } from '@studnicky/iridis';
import { ComplianceReportEntity, ContrastFeasibility, CvdResultSetEntity } from '@studnicky/iridis-contrast';

import type { PaletteResolveRequestEntity } from './entities/PaletteResolveRequestEntity.ts';
import type { PickerSeedType } from './types/pickerSeedType.ts';

import { roleSchemaByName } from '../theme/RoleSchemaByName.ts';
import { Tokens } from '../theme/Tokens.ts';
import { COLOR_PIPELINE } from './colorPipeline.ts';
import { ContrastConfigFor } from './contrastConfigFor.ts';
import { createColorEngine } from './createColorEngine.ts';
import { ContrastConfigOptionsEntity } from './entities/ContrastConfigOptionsEntity.ts';
import { PaletteSnapshotEntity } from './entities/PaletteSnapshotEntity.ts';
import { pickerSeedInputs } from './pickerSeedInputs.ts';
import { roleSchemaFor } from './roleSchemaFor.ts';

class ContrastMetadataSlot {
  static compliance(metadata: PaletteStateInterface['metadata']): ComplianceReportEntity.Type | undefined {
    const value = metadata['contrast:complianceReport'];
    const result = value !== undefined && ComplianceReportEntity.validate(value) ? value : undefined;
    return result;
  }

  static cvd(metadata: PaletteStateInterface['metadata']): CvdResultSetEntity.Type | undefined {
    const value = metadata['contrast:cvd'];
    const result = value === undefined ? undefined : CvdResultSetEntity.intake(value);
    return result;
  }
}

class RoleClampReadModel {
  private static rangeAdjustment(value: RoleProvenanceEntity.Type['adjustments'][number]): { readonly 'afterHex': string; readonly 'beforeHex': string } | undefined {
    const result = value.operation === 'role-range' ? { 'afterHex': value.afterHex, 'beforeHex': value.beforeHex } : undefined;
    return result;
  }

  private static oklchLabel(hex: string): string {
    const oklch = colorRecordFactory.fromHex(hex).oklch;
    const result = `L ${oklch.l.toFixed(2)} · C ${oklch.c.toFixed(2)} · H ${Math.round(oklch.h)}`;
    return result;
  }

  static fromProvenance(provenance: ReadonlyMap<string, RoleProvenanceEntity.Type>): PaletteSnapshotEntity.Type['clamps'] {
    const clamps: PaletteSnapshotEntity.Type['clamps'] = [];
    for (const [roleName, evidence] of provenance) {
      let rangeAdjustment: { readonly 'afterHex': string; readonly 'beforeHex': string } | undefined;
      for (let index = 0; index < evidence.adjustments.length; index += 1) {
        const adjustment = evidence.adjustments[index];
        if (adjustment !== undefined) {
          rangeAdjustment ??= RoleClampReadModel.rangeAdjustment(adjustment);
        }
      }
      if (rangeAdjustment !== undefined) {
        clamps.push({
          'resolvedHex': rangeAdjustment.afterHex.toLowerCase(),
          'roleName': roleName,
          'roleOklch': RoleClampReadModel.oklchLabel(rangeAdjustment.afterHex),
          'seedHex': rangeAdjustment.beforeHex.toLowerCase(),
          'seedOklch': RoleClampReadModel.oklchLabel(rangeAdjustment.beforeHex)
        });
      }
    }
    return clamps;
  }
}

/** Resolves one palette request to a JSON-serializable snapshot; the single engine path shared by the worker, SSR, and build-time callers. */
export class PaletteResolve {
  public static seeds(seeds: readonly PickerSeedType[]): PaletteResolveRequestEntity.Type['seeds'] {
    const result = seeds.map((seed) => {
      const entry = seed.role === undefined ? { 'hex': seed.hex } : { 'hex': seed.hex, 'role': seed.role };
      return entry;
    });
    return result;
  }

  public static input(request: PaletteResolveRequestEntity.Type): InputEntity.Type {
    const pair = roleSchemaByName[request.schemaName];
    const selected = request.framing === 'dark' ? pair.dark : pair.light;
    const relationshipGraph = request.relationshipGraph === undefined
      ? undefined
      : RoleRelationshipGraphEntity.intake(request.relationshipGraph);
    const roles = RoleSchemaEntity.intake({
      ...selected,
      ...(relationshipGraph === undefined ? {} : { 'relationshipGraph': relationshipGraph })
    });
    const seeds = request.seeds.map((seed) => {
      const result = { 'hex': seed.hex, 'role': seed.role };
      return result;
    });
    const result = InputEntity.create({
      'colors': pickerSeedInputs(seeds),
      'contrast': ContrastConfigFor.forOptions(ContrastConfigOptionsEntity.create({
        'cvdMode': request.cvdMode,
        'enableStrictCompliance': request.enableStrictCompliance,
        'nonMandatoryLevel': request.nonMandatoryLevel,
        'strictness': request.strictness
      })),
      'roles': roleSchemaFor(roles),
      'runtime': { 'colorSpace': request.colorSpace, 'framing': request.framing }
    });
    return result;
  }

  public static feasibility(request: PaletteResolveRequestEntity.Type): ContrastFeasibilityReportEntity.Type {
    const input = PaletteResolve.input(request);
    if (input.roles === undefined || input.contrast === undefined) {
      throw new RangeError('Schema feasibility requires role definitions and contrast options');
    }
    const result = ContrastFeasibility.analyzeSchema(RoleSchemaEntity.intake(input.roles), ContrastOptionsEntity.intake(input.contrast));
    return result;
  }

  public static run(request: PaletteResolveRequestEntity.Type): PaletteSnapshotEntity.Type {
    const engine = createColorEngine();
    engine.pipeline(COLOR_PIPELINE);
    const state = engine.run(PaletteResolve.input(request));
    const result = PaletteResolve.snapshot(state);
    return result;
  }

  private static record<ValueType>(entries: Iterable<readonly [string, ValueType]>): Record<string, ValueType> {
    const result: Record<string, ValueType> = {};
    for (const [name, value] of entries) {
      Object.defineProperty(result, name, { 'configurable': true, 'enumerable': true, 'value': value, 'writable': true });
    }
    return result;
  }

  private static scales(state: PaletteStateInterface): Record<string, Record<string, string>> {
    const shades = new Map<string, Record<string, string>>();
    const entries = Object.entries(Tokens.extractEngineMaps(state).scales);
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (entry !== undefined) {
        shades.set(entry[0], PaletteResolve.record(Object.entries(entry[1])));
      }
    }
    const result = PaletteResolve.record(shades);
    return result;
  }

  private static snapshot(state: PaletteStateInterface): PaletteSnapshotEntity.Type {
    const provenance = Metadata.roleProvenance(state.metadata);
    const derived: string[] = [];
    const pinned: string[] = [];
    const synthesized: string[] = [];
    for (const [roleName, evidence] of provenance) {
      if (evidence.origin === 'derived') { derived.push(roleName); }
      if (evidence.origin === 'stated') { pinned.push(roleName); }
      if (evidence.origin === 'synthesized') { synthesized.push(roleName); }
    }
    const roles = Object.entries(state.roles).map(([name, role]) => {
      const view = { 'c': role.oklch.c, 'h': role.oklch.h, 'hex': role.hex, 'l': role.oklch.l, 'name': name };
      const result = role.displayP3 === undefined ? view : { ...view, 'displayP3': role.displayP3 };
      return result;
    });
    const distances = new Map<string, Record<string, number>>();
    for (const [roleName, candidates] of Metadata.roleDistances(state.metadata)) {
      distances.set(roleName, PaletteResolve.record(candidates));
    }
    const compliance = ContrastMetadataSlot.compliance(state.metadata);
    const cvd = ContrastMetadataSlot.cvd(state.metadata);
    const result = PaletteSnapshotEntity.create({
      'clamps': RoleClampReadModel.fromProvenance(provenance),
      ...(compliance === undefined ? {} : { 'compliance': compliance }),
      ...(cvd === undefined ? {} : { 'cvd': cvd }),
      'distances': PaletteResolve.record(distances),
      'provenance': { 'derived': derived, 'pinned': pinned, 'synthesized': synthesized },
      'roles': roles,
      'scales': PaletteResolve.scales(state)
    });
    return result;
  }
}
