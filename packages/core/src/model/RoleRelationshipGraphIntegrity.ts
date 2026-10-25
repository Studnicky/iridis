import type { InputEntity } from '../entities/InputEntity.ts';

import { HarmonyModeEntity } from '../entities/HarmonyModeEntity.ts';
import { RoleRelationshipEntity } from '../entities/RoleRelationshipEntity.ts';
import { RoleRelationshipGroupEntity } from '../entities/RoleRelationshipGroupEntity.ts';
import { ValidationErrorEntity } from '../entities/ValidationErrorEntity.ts';

class GraphIntegrityContext {
  readonly errors: ValidationErrorEntity.Type[] = [];
  readonly groupIds: Set<string> = new Set();
  readonly roleNames: ReadonlySet<string>;

  constructor(schema: NonNullable<InputEntity.Type['roles']>) {
    this.roleNames = new Set(schema.roles.map((role) => {
      return role.name;
    }));
  }
}

/** Validates graph references that JSON Schema cannot express. */
export class RoleRelationshipGraphIntegrity {
  static validate(schema: NonNullable<InputEntity.Type['roles']>): ValidationErrorEntity.Type[] {
    const graph = schema.relationshipGraph;
    if (graph === undefined) {
      return [];
    }

    const context = new GraphIntegrityContext(schema);
    for (let groupIndex = 0; groupIndex < graph.groups.length; groupIndex += 1) {
      const group = graph.groups[groupIndex];
      if (group !== undefined) {
        const admittedGroup = RoleRelationshipGroupEntity.intake(group);
        this.#validateGroup(context, admittedGroup, groupIndex);
      }
    }
    return context.errors;
  }

  static #validateGroup(
    context: GraphIntegrityContext,
    group: RoleRelationshipGroupEntity.Type,
    groupIndex: number
  ): void {
    const path = `relationshipGraph.groups[${groupIndex}]`;
    this.#requireSetUnique(context, context.groupIds, group.id, `${path}.id`, 'must be unique');
    this.#requireRole(context, group.anchor, `${path}.anchor`);
    const modes = this.#validateModes(context, group, path);
    const defaultMode = modes.get(group.defaultMode);
    if (defaultMode === undefined) {
      context.errors.push(this.#error(`${path}.defaultMode`, 'must name a mode in its group'));
    }
    this.#validateRelationships(context, group, path, modes, defaultMode);
  }

  static #validateModes(
    context: GraphIntegrityContext,
    group: RoleRelationshipGroupEntity.Type,
    groupPath: string
  ): Map<string, HarmonyModeEntity.Type> {
    const modes = new Map<string, HarmonyModeEntity.Type>();
    for (let modeIndex = 0; modeIndex < group.modes.length; modeIndex += 1) {
      const mode = group.modes[modeIndex];
      if (mode !== undefined) {
        const admittedMode = HarmonyModeEntity.intake(mode);
        const path = `${groupPath}.modes[${modeIndex}]`;
        if (modes.has(admittedMode.id)) {
          context.errors.push(this.#error(`${path}.id`, 'must be unique within its group'));
        } else {
          modes.set(admittedMode.id, admittedMode);
        }
        this.#validateVariants(context, admittedMode.hueOffsets, path);
      }
    }
    return modes;
  }

  static #validateVariants(
    context: GraphIntegrityContext,
    variants: HarmonyModeEntity.Type['hueOffsets'],
    modePath: string
  ): void {
    const variantIds = new Set<string>();
    for (let variantIndex = 0; variantIndex < variants.length; variantIndex += 1) {
      const variant = variants[variantIndex];
      if (variant !== undefined) {
        this.#requireSetUnique(context, variantIds, variant.variantId, `${modePath}.hueOffsets[${variantIndex}].variantId`, 'must be unique within its mode');
      }
    }
  }

  static #validateRelationships(
    context: GraphIntegrityContext,
    group: RoleRelationshipGroupEntity.Type,
    groupPath: string,
    modes: ReadonlyMap<string, HarmonyModeEntity.Type>,
    defaultMode: HarmonyModeEntity.Type | undefined
  ): void {
    const relationshipIds = new Set<string>();
    const prioritiesByTarget = new Map<string, Set<number>>();
    for (let index = 0; index < group.relationships.length; index += 1) {
      const relationship = group.relationships[index];
      if (relationship !== undefined) {
        const admittedRelationship = RoleRelationshipEntity.intake(relationship);
        const path = `${groupPath}.relationships[${index}]`;
        this.#requireSetUnique(context, relationshipIds, admittedRelationship.id, `${path}.id`, 'must be unique within its group');
        this.#requireRole(context, admittedRelationship.target, `${path}.target`);
        this.#requirePriority(context, prioritiesByTarget, admittedRelationship, path);
        this.#validateReferences(context, admittedRelationship, path);
        this.#validateHueVariant(context, admittedRelationship, path, modes, defaultMode);
      }
    }
  }

  static #requirePriority(
    context: GraphIntegrityContext,
    prioritiesByTarget: Map<string, Set<number>>,
    relationship: RoleRelationshipEntity.Type,
    path: string
  ): void {
    const priorities = prioritiesByTarget.get(relationship.target) ?? new Set<number>();
    if (priorities.has(relationship.priority)) {
      context.errors.push(this.#error(`${path}.priority`, 'must be distinct for relationships with the same target in its group'));
    }
    priorities.add(relationship.priority);
    prioritiesByTarget.set(relationship.target, priorities);
  }

  static #validateReferences(
    context: GraphIntegrityContext,
    relationship: RoleRelationshipEntity.Type,
    path: string
  ): void {
    if ('source' in relationship) {
      this.#requireRole(context, relationship.source, `${path}.source`);
    }
    if ('toward' in relationship) {
      this.#requireRole(context, relationship.toward, `${path}.toward`);
    }
    if ('base' in relationship) {
      this.#requireRole(context, relationship.base, `${path}.base`);
    }
    if ('overlay' in relationship) {
      this.#requireRole(context, relationship.overlay, `${path}.overlay`);
    }
  }

  static #validateHueVariant(
    context: GraphIntegrityContext,
    relationship: RoleRelationshipEntity.Type,
    path: string,
    modes: ReadonlyMap<string, HarmonyModeEntity.Type>,
    defaultMode: HarmonyModeEntity.Type | undefined
  ): void {
    if (relationship.operation !== 'hue-offset') {
      return;
    }
    const selectedMode = relationship.modeId === undefined
      ? defaultMode
      : modes.get(relationship.modeId);
    if (relationship.modeId !== undefined && selectedMode === undefined) {
      context.errors.push(this.#error(`${path}.modeId`, 'must name a mode in its group'));
    }
    if (relationship.variantId === undefined) {
      return;
    }
    const variantExists = selectedMode?.hueOffsets.some((variant) => {
      const result = variant.variantId === relationship.variantId;
      return result;
    }) ?? false;
    if (!variantExists) {
      context.errors.push(this.#error(`${path}.variantId`, 'must name a hue variant in its selected mode'));
    }
  }

  static #requireRole(context: GraphIntegrityContext, name: string, path: string): void {
    if (!context.roleNames.has(name)) {
      context.errors.push(this.#error(path, 'must name a declared role'));
    }
  }

  static #requireSetUnique(
    context: GraphIntegrityContext,
    known: Set<string>,
    value: string,
    path: string,
    message: string
  ): void {
    if (known.has(value)) {
      context.errors.push(this.#error(path, message));
      return;
    }
    known.add(value);
  }

  static #error(path: string, message: string): ValidationErrorEntity.Type {
    const result = ValidationErrorEntity.create({ 'message': message, 'path': path });
    return result;
  }
}
