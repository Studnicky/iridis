import type { JSONSchema7Type } from 'json-schema';

import type { HueTargetOverrideInterfaceTypeEntity } from '../entities/HueTargetOverrideInterfaceTypeEntity.ts';

import { EngineMetadataInterfaceTypeEntity } from '../entities/EngineMetadataInterfaceTypeEntity.ts';
import { RoleProvenanceInterfaceTypeEntity } from '../entities/RoleProvenanceInterfaceTypeEntity.ts';

/** Validates known metadata slots at intake and serializes dynamic runtime Maps at the metadata boundary. */
export class Metadata {
  static #recordFromEntries<ValueType>(entries: Iterable<readonly [string, ValueType]>): Record<string, ValueType> {
    const result: Record<string, ValueType> = {};
    for (const [name, value] of entries) {
      Object.defineProperty(result, name, { 'configurable': true, 'enumerable': true, 'value': value, 'writable': true });
    }
    return result;
  }

  static hueOffsetOverrides(metadataRecord: Record<string, JSONSchema7Type>): Record<string, number> | undefined {
    const value = metadataRecord['core:hueOffsetOverrides'];
    if (value === undefined) {
      return undefined;
    }
    const normalized = EngineMetadataInterfaceTypeEntity.intake({ 'core:hueOffsetOverrides': value });
    return normalized['core:hueOffsetOverrides'];
  }

  static hueTargetOverrides(
    metadataRecord: Record<string, JSONSchema7Type>
  ): Record<string, HueTargetOverrideInterfaceTypeEntity.Type> | undefined {
    const value = metadataRecord['core:hueTargetOverrides'];
    if (value === undefined) {
      return undefined;
    }
    const normalized = EngineMetadataInterfaceTypeEntity.intake({ 'core:hueTargetOverrides': value });
    return normalized['core:hueTargetOverrides'];
  }

  static roleDistances(metadataRecord: Record<string, JSONSchema7Type>): Map<string, Map<string, number>> {
    const value = metadataRecord['core:roleDistances'];
    if (value === undefined) {
      return new Map();
    }
    const normalized = EngineMetadataInterfaceTypeEntity.intake({ 'core:roleDistances': value });
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
  ): Map<string, RoleProvenanceInterfaceTypeEntity.Type> {
    const value = metadataRecord['core:roleProvenance'];
    if (value === undefined) {
      return new Map();
    }
    const normalized = EngineMetadataInterfaceTypeEntity.intake({ 'core:roleProvenance': value });
    const source = normalized['core:roleProvenance'];
    const result = new Map<string, RoleProvenanceInterfaceTypeEntity.Type>();
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
      result.set(roleName, RoleProvenanceInterfaceTypeEntity.intake(provenance));
    }
    return result;
  }

  static writeRoleDistances(
    metadataRecord: Record<string, JSONSchema7Type>,
    distances: Map<string, Map<string, number>>
  ): void {
    const serializedEntries = new Map<string, Record<string, number>>();
    for (const [roleName, candidates] of distances) {
      serializedEntries.set(roleName, Metadata.#recordFromEntries(candidates));
    }
    const normalized = EngineMetadataInterfaceTypeEntity.create({
      'core:roleDistances': Metadata.#recordFromEntries(serializedEntries)
    });
    const value = normalized['core:roleDistances'];
    if (value !== undefined) {
      metadataRecord['core:roleDistances'] = value;
    }
  }

  static writeRoleProvenance(
    metadataRecord: Record<string, JSONSchema7Type>,
    provenance: Map<string, RoleProvenanceInterfaceTypeEntity.Type>
  ): void {
    const normalized = EngineMetadataInterfaceTypeEntity.create({
      'core:roleProvenance': Metadata.#recordFromEntries(provenance)
    });
    const value = normalized['core:roleProvenance'];
    if (value !== undefined) {
      metadataRecord['core:roleProvenance'] = value;
    }
  }
}
