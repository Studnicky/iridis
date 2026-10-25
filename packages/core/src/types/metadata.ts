import type { JSONSchema7Type } from 'json-schema';

import type { HueTargetOverrideEntity } from '../entities/HueTargetOverrideEntity.ts';

import { ContrastReportEntity } from '../entities/ContrastReportEntity.ts';
import { EngineMetadataEntity } from '../entities/EngineMetadataEntity.ts';
import { RelationshipResolutionEntity } from '../entities/RelationshipResolutionEntity.ts';
import { RoleProvenanceEntity } from '../entities/RoleProvenanceEntity.ts';

/** Validates known metadata slots at intake and serializes dynamic runtime Maps at the metadata boundary. */
export class Metadata {
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

  static hueOffsetOverrides(
    metadataRecord: Record<string, JSONSchema7Type>
  ): Record<string, number> | undefined {
    const value = metadataRecord['core:hueOffsetOverrides'];
    if (value === undefined) {
      return undefined;
    }
    const normalized = EngineMetadataEntity.intake({
      'core:hueOffsetOverrides': value
    });
    return normalized['core:hueOffsetOverrides'];
  }

  static hueTargetOverrides(
    metadataRecord: Record<string, JSONSchema7Type>
  ): Record<string, HueTargetOverrideEntity.Type> | undefined {
    const value = metadataRecord['core:hueTargetOverrides'];
    if (value === undefined) {
      return undefined;
    }
    const normalized = EngineMetadataEntity.intake({
      'core:hueTargetOverrides': value
    });
    return normalized['core:hueTargetOverrides'];
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
    const normalized = EngineMetadataEntity.intake({
      'core:relationshipResolution': value
    });
    const source = normalized['core:relationshipResolution'];
    const result = new Map<string, RelationshipResolutionEntity.Type>();
    if (source === undefined) {
      return result;
    }
    const entries = Object.entries(source);
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
    const normalized = EngineMetadataEntity.create({
      'core:relationshipResolution': Metadata.#recordFromEntries(resolution)
    });
    const value = normalized['core:relationshipResolution'];
    if (value !== undefined) {
      metadataRecord['core:relationshipResolution'] = value;
    }
  }
}
