import type { RoleSchemaEntity } from '@studnicky/iridis';

import { CompositeKey, RoleRelationshipEntity } from '@studnicky/iridis';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildColorGraphBuffers } from '../app/components/content/graph/buildColorGraphBuffers.ts';
import { ColorGraphCategoryVisibility } from '../app/components/content/graph/ColorGraphCategoryVisibility.ts';
import { RelationshipSource } from '../app/composables/RelationshipSource.ts';
import { RoleMathOrigin } from '../app/composables/types/roleMathOrigin.ts';
import { roleSchemaByName } from '../app/theme/RoleSchemaByName.ts';

class GraphRoleFixture {
  public readonly relationship = null;
  public readonly c = 0;
  public readonly candidates: [] = [];
  public readonly clamp = null;
  public readonly compliance = 'pass';
  public readonly def = undefined;
  public readonly h = 0;
  public readonly hex = '#102030';
  public readonly l = 0;
  public readonly pinnedSeedHex = null;
  public readonly ratio = 1;

  public constructor(
    public readonly name: string,
    public readonly origin: typeof RoleMathOrigin.Direct,
    public readonly parentRole: string | undefined
  ) {}
}

class RelationshipSourceFixture {
  static assertEdges(schema: RoleSchemaEntity.Type): void {
    const relationshipsByTarget = RelationshipSourceFixture.relationshipsByTarget(schema);
    const roleNames = new Set<string>();
    const edgeKeys = RelationshipSourceFixture.edgeKeys(schema, relationshipsByTarget, roleNames);
    RelationshipSourceFixture.assertRelationships(relationshipsByTarget, roleNames, edgeKeys);
  }

  private static assertRelationships(
    relationshipsByTarget: ReadonlyMap<string, RoleRelationshipEntity.Type>,
    roleNames: ReadonlySet<string>,
    edgeKeys: ReadonlySet<string>
  ): void {
    const relationships = [...relationshipsByTarget.values()];
    for (let relationshipIndex = 0; relationshipIndex < relationships.length; relationshipIndex += 1) {
      const relationship = relationships[relationshipIndex];
      if (relationship === undefined) {
        continue;
      }
      const parent = RelationshipSource.primary(relationship);
      if (parent === undefined) {
        const selfLoop = edgeKeys.has(CompositeKey.of(relationship.target, relationship.target));
        assert.equal(selfLoop, false);
        continue;
      }
      assert.ok(roleNames.has(parent));
      assert.notEqual(parent, relationship.target);
      const relationshipEdge = edgeKeys.has(CompositeKey.of(relationship.target, parent));
      assert.ok(relationshipEdge);
    }
  }

  private static edgeKeys(
    schema: RoleSchemaEntity.Type,
    relationshipsByTarget: ReadonlyMap<string, RoleRelationshipEntity.Type>,
    roleNames: Set<string>
  ): ReadonlySet<string> {
    const roles: GraphRoleFixture[] = [];
    for (let roleIndex = 0; roleIndex < schema.roles.length; roleIndex += 1) {
      const role = schema.roles[roleIndex];
      if (role === undefined) {
        continue;
      }
      roleNames.add(role.name);
      const relationship = relationshipsByTarget.get(role.name);
      roles.push(new GraphRoleFixture(
        role.name,
        relationship === undefined ? RoleMathOrigin.Direct : RoleMathOrigin.Derived,
        RelationshipSource.primary(relationship)
      ));
    }
    const graph = buildColorGraphBuffers.build(roles, new ColorGraphCategoryVisibility());
    const result = new Set<string>();
    for (let linkIndex = 0; linkIndex < graph.links.length; linkIndex += 2) {
      const childIndex = graph.links[linkIndex];
      const parentIndex = graph.links[linkIndex + 1];
      assert.notEqual(childIndex, undefined, `graph child index ${linkIndex} exists`);
      assert.notEqual(parentIndex, undefined, `graph parent index ${linkIndex + 1} exists`);
      if (childIndex === undefined || parentIndex === undefined) {
        throw new Error(`graph link ${linkIndex} is incomplete`);
      }
      const child = graph.meta[childIndex]?.name;
      const parent = graph.meta[parentIndex]?.name;
      if (child !== undefined && parent !== undefined) {
        result.add(CompositeKey.of(child, parent));
      }
    }
    return result;
  }

  private static relationshipsByTarget(schema: RoleSchemaEntity.Type): ReadonlyMap<string, RoleRelationshipEntity.Type> {
    const result = new Map<string, RoleRelationshipEntity.Type>();
    const groups = schema.relationshipGraph?.groups ?? [];
    for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
      const relationships = groups[groupIndex]?.relationships ?? [];
      for (let relationshipIndex = 0; relationshipIndex < relationships.length; relationshipIndex += 1) {
        const relationship = relationships[relationshipIndex];
        if (relationship !== undefined) {
          const admitted = RoleRelationshipEntity.intake(relationship);
          result.set(admitted.target, admitted);
        }
      }
    }
    return result;
  }
}

await test('iridis-12 relationship graph edges join declared roles without self-loops', () => {
  RelationshipSourceFixture.assertEdges(roleSchemaByName['iridis-12'].dark);
});

await test('iridis-16 relationship graph edges join declared roles without self-loops', () => {
  RelationshipSourceFixture.assertEdges(roleSchemaByName['iridis-16'].dark);
});

await test('iridis-32 relationship graph edges join declared roles without self-loops', () => {
  RelationshipSourceFixture.assertEdges(roleSchemaByName['iridis-32'].dark);
});
