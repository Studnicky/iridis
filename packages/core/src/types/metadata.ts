import type { JSONSchema7Type } from 'json-schema';

import { ContrastReportEntity } from '../entities/ContrastReportEntity.ts';
import { EngineMetadataEntity } from '../entities/EngineMetadataEntity.ts';
import { RelationshipResolutionEntity } from '../entities/RelationshipResolutionEntity.ts';
import { RoleProvenanceEntity } from '../entities/RoleProvenanceEntity.ts';
import { WeakIdentityMemo } from '../model/WeakIdentityMemo.ts';

/** Validates known metadata slots at intake and serializes dynamic runtime Maps at the metadata boundary. */
export class Metadata {
  static readonly #relationshipResolutionEntries = new WeakIdentityMemo<object, RelationshipResolutionEntity.Type>();
  static #recordFromEntries<ValueType>(
    entries: Iterable<readonly [string, ValueType]>
  ): Record<string, ValueType> {
    const result: Record<string, ValueType> = {};
    for (const [name, value] of entries) {
      Object.defineProperty(result, name, {
        'configurable': true,
        'enumerable': true,
        'value': value,
        'writable': true
      });
    }
    return result;
  }

  static roleDistances(
    metadataRecord: Record<string, JSONSchema7Type>
  ): Map<string, Map<string, number>> {
    const value = metadataRecord['core:roleDistances'];
    if (value === undefined) {
      return new Map();
    }
    const normalized = EngineMetadataEntity.intake({
      'core:roleDistances': value
    });
    const source = normalized['core:roleDistances'];
    const result = new Map<string, Map<string, number>>();
    if (source === undefined) {
      return result;
    }
    const entries = Object.entries(source);
    for (let entryIndex = 0; entryIndex < entries.length; entryIndex += 1) {
      const entry = entries.at(entryIndex);
      if (entry === undefined) {
        continue;
      }
      const [roleName, candidates] = entry;
      result.set(roleName, new Map(Object.entries(candidates)));
    }
    return result;
  }

  static roleProvenance(
    metadataRecord: Record<string, JSONSchema7Type>
  ): Map<string, RoleProvenanceEntity.Type> {
    const value = metadataRecord['core:roleProvenance'];
    if (value === undefined) {
      return new Map();
    }
    const normalized = EngineMetadataEntity.intake({
      'core:roleProvenance': value
    });
    const source = normalized['core:roleProvenance'];
    const result = new Map<string, RoleProvenanceEntity.Type>();
    if (source === undefined) {
      return result;
    }
    const entries = Object.entries(source);
    for (let entryIndex = 0; entryIndex < entries.length; entryIndex += 1) {
      const entry = entries.at(entryIndex);
      if (entry === undefined) {
        continue;
      }
      const [roleName, provenance] = entry;
      result.set(
        roleName,
        RoleProvenanceEntity.intake(provenance)
      );
    }
    return result;
  }

  static relationshipResolution(
    metadataRecord: Record<string, JSONSchema7Type>
  ): Map<string, RelationshipResolutionEntity.Type> {
    const value = metadataRecord['core:relationshipResolution'];
    if (value === undefined) {
      return new Map();
    }
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new TypeError('core:relationshipResolution must be an object');
    }
    const result = new Map<string, RelationshipResolutionEntity.Type>();
    const entries = Object.entries(value);
    for (let entryIndex = 0; entryIndex < entries.length; entryIndex += 1) {
      const entry = entries.at(entryIndex);
      if (entry === undefined) {
        continue;
      }
      const [roleName, resolution] = entry;
      result.set(roleName, RelationshipResolutionEntity.intake(resolution));
    }
    return result;
  }

  static relationshipResolutionForRole(
    metadataRecord: Record<string, JSONSchema7Type>,
    roleName: string
  ): RelationshipResolutionEntity.Type | undefined {
    const value = metadataRecord['core:relationshipResolution'];
    if (value === undefined) {
      return undefined;
    }
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new TypeError('core:relationshipResolution must be an object');
    }
    const entry = value[roleName];
    if (entry === undefined) {
      return undefined;
    }
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      const result = RelationshipResolutionEntity.intake(entry);
      return result;
    }
    const result = Metadata.#relationshipResolutionEntries.get(entry, () => {
      const admitted = RelationshipResolutionEntity.intake(entry);
      return admitted;
    });
    return result;
  }

  static contrastReport(
    metadataRecord: Record<string, JSONSchema7Type>
  ): ContrastReportEntity.Type | undefined {
    const value = metadataRecord['core:contrastReport'];
    if (value === undefined) {
      return undefined;
    }
    const result = ContrastReportEntity.intake(value);
    return result;
  }

  static writeContrastReport(
    metadataRecord: Record<string, JSONSchema7Type>,
    report: ContrastReportEntity.Type
  ): void {
    const normalized = EngineMetadataEntity.create({
      'core:contrastReport': report
    });
    const value = normalized['core:contrastReport'];
    if (value !== undefined) {
      metadataRecord['core:contrastReport'] = value;
    }
  }

  static writeRoleDistances(
    metadataRecord: Record<string, JSONSchema7Type>,
    distances: Map<string, Map<string, number>>
  ): void {
    const serializedEntries = new Map<string, Record<string, number>>();
    for (const [roleName, candidates] of distances) {
      serializedEntries.set(roleName, Metadata.#recordFromEntries(candidates));
    }
    const normalized = EngineMetadataEntity.create({
      'core:roleDistances': Metadata.#recordFromEntries(serializedEntries)
    });
    const value = normalized['core:roleDistances'];
    if (value !== undefined) {
      metadataRecord['core:roleDistances'] = value;
    }
  }

  static writeRoleProvenance(
    metadataRecord: Record<string, JSONSchema7Type>,
    provenance: Map<string, RoleProvenanceEntity.Type>
  ): void {
    const normalized = EngineMetadataEntity.create({
      'core:roleProvenance': Metadata.#recordFromEntries(provenance)
    });
    const value = normalized['core:roleProvenance'];
    if (value !== undefined) {
      metadataRecord['core:roleProvenance'] = value;
    }
  }

  static writeRelationshipResolution(
    metadataRecord: Record<string, JSONSchema7Type>,
    resolution: Map<string, RelationshipResolutionEntity.Type>
  ): void {
    metadataRecord['core:relationshipResolution'] = Metadata.#recordFromEntries(resolution);
  }
}
