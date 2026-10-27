import {
  RelationshipSources,
  type RoleRelationshipGraphEntity
} from '@studnicky/iridis';
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { VSCODE_COMPACT_ROLE_SCHEMAS } from '../../src/constants/VscodeCompactRoleSchemas.ts';
import { VSCODE_FULL_ROLE_SCHEMAS } from '../../src/constants/VscodeFullRoleSchemas.ts';

class VscodeRoleSchemaGraph {
  static relationshipTopology(
    graph: RoleRelationshipGraphEntity.Type
  ): readonly Readonly<{
    'id': string;
    'operation': string;
    'source'?: string;
    'target': string;
  }>[] {
    const result: Readonly<{
      'id': string;
      'operation': string;
      'source'?: string;
      'target': string;
    }>[] = [];
    for (
      let groupIndex = 0;
      groupIndex < graph.groups.length;
      groupIndex += 1
    ) {
      const group = graph.groups.at(groupIndex);
      if (group === undefined) {
        continue;
      }
      for (
        let relationshipIndex = 0;
        relationshipIndex < group.relationships.length;
        relationshipIndex += 1
      ) {
        const relationship = group.relationships.at(relationshipIndex);
        if (relationship !== undefined) {
          result.push(
            VscodeRoleSchemaGraph.relationshipTopologyEntry(relationship)
          );
        }
      }
    }
    return result;
  }

  private static relationshipTopologyEntry(
    relationship: RoleRelationshipGraphEntity.Type['groups'][number]['relationships'][number]
  ): Readonly<{
    'id': string;
    'operation': string;
    'source'?: string;
    'target': string;
  }> {
    const shared = {
      'id': relationship.id,
      'operation': relationship.operation,
      'target': relationship.target
    };
    if (relationship.operation === 'alpha-overlay') {
      return shared;
    }
    if (relationship.operation === 'oklch-interpolate') {
      return { ...shared, 'source': relationship.source };
    }
    if (relationship.source === undefined) {
      return shared;
    }
    return { ...shared, 'source': relationship.source };
  }

  static assertBaseRelationships(
    graph: RoleRelationshipGraphEntity.Type,
    baseRoleNames: ReadonlySet<string>
  ): void {
    for (
      let groupIndex = 0;
      groupIndex < graph.groups.length;
      groupIndex += 1
    ) {
      const group = graph.groups.at(groupIndex);
      if (group === undefined) {
        continue;
      }
      for (
        let relationshipIndex = 0;
        relationshipIndex < group.relationships.length;
        relationshipIndex += 1
      ) {
        const relationship = group.relationships.at(relationshipIndex);
        if (relationship === undefined) {
          continue;
        }
        assert.ok(baseRoleNames.has(relationship.target));
        const names = RelationshipSources.names(relationship);
        for (let nameIndex = 0; nameIndex < names.length; nameIndex += 1) {
          const name = names.at(nameIndex);
          assert.ok(name !== undefined && baseRoleNames.has(name));
        }
      }
    }
  }

  static assertTolerantRelationships(
    graph: RoleRelationshipGraphEntity.Type
  ): void {
    for (
      let groupIndex = 0;
      groupIndex < graph.groups.length;
      groupIndex += 1
    ) {
      const group = graph.groups.at(groupIndex);
      if (group === undefined) {
        continue;
      }
      for (
        let relationshipIndex = 0;
        relationshipIndex < group.relationships.length;
        relationshipIndex += 1
      ) {
        const relationship = group.relationships.at(relationshipIndex);
        if (relationship === undefined) {
          continue;
        }
        assert.equal(relationship.relaxability, 'tolerant');
        assert.deepStrictEqual(relationship.tolerance, {
          'alpha': 1,
          'chroma': 0.5,
          'hue': 5,
          'lightness': 1
        });
      }
    }
  }
}

const VSCODE_ROLE_SCHEMA_EXPECTATIONS = {
  'baseNames': [
    'background',
    'foreground',
    'surface',
    'muted',
    'keyword',
    'type',
    'function',
    'variable',
    'string',
    'number',
    'constant',
    'comment',
    'error',
    'warning',
    'info',
    'success'
  ],
  'extensionContrastPairs': [
    {
      'algorithm': 'wcag21',
      'background': 'background',
      'foreground': 'accent',
      'maximumContrastRatio': 4.5,
      'minimumContrastRatio': 3.0
    },
    {
      'algorithm': 'wcag21',
      'background': 'accent',
      'foreground': 'onAccent',
      'minimumContrastRatio': 4.5
    },
    {
      'algorithm': 'wcag21',
      'background': 'background',
      'foreground': 'link',
      'minimumContrastRatio': 4.5
    },
    {
      'algorithm': 'wcag21',
      'background': 'chrome',
      'foreground': 'chromeForeground',
      'minimumContrastRatio': 4.5
    }
  ],
  'extensionNames': [
    'accent',
    'onAccent',
    'accentHover',
    'link',
    'selection',
    'selectionList',
    'buttonSecondary',
    'buttonSecondaryHover',
    'findMatch',
    'bracketMatch',
    'hover',
    'border',
    'guide',
    'guideActive',
    'chrome',
    'chromeInactive',
    'chromeForeground',
    'inputBackground',
    'ansiBlack',
    'ansiRed',
    'ansiGreen',
    'ansiYellow',
    'ansiBlue',
    'ansiMagenta',
    'ansiCyan',
    'ansiWhite',
    'ansiBrightBlack',
    'ansiBrightRed',
    'ansiBrightGreen',
    'ansiBrightYellow',
    'ansiBrightBlue',
    'ansiBrightMagenta',
    'ansiBrightCyan',
    'ansiBrightWhite',
    'gitAdded',
    'gitModified',
    'gitDeleted',
    'gitUntracked',
    'gitConflicting',
    'diffInserted',
    'diffRemoved',
    'bracketLevel1',
    'bracketLevel2',
    'bracketLevel3',
    'bracketLevel4',
    'bracketLevel5',
    'bracketLevel6',
    'widgetBackground',
    'widgetBorder'
  ]
} as const;

await test('VscodeRoleSchemas :: each framing exposes the canonical full role vocabulary', () => {
  const expectedNames = [
    ...VSCODE_ROLE_SCHEMA_EXPECTATIONS.baseNames,
    ...VSCODE_ROLE_SCHEMA_EXPECTATIONS.extensionNames
  ];
  const schemas = [
    VSCODE_FULL_ROLE_SCHEMAS.dark,
    VSCODE_FULL_ROLE_SCHEMAS.light
  ];
  for (
    let schemaCount = schemas.length, schemaIndex = 0;
    schemaIndex < schemaCount;
    schemaIndex += 1
  ) {
    const schema = schemas.at(schemaIndex);
    assert.notEqual(schema, undefined, `full schema ${schemaIndex} exists`);
    if (schema === undefined) {
      throw new Error(`full schema ${schemaIndex} is absent`);
    }
    const names: string[] = [];
    for (
      let roleCount = schema.roles.length, roleIndex = 0;
      roleIndex < roleCount;
      roleIndex += 1
    ) {
      const role = schema.roles.at(roleIndex);
      assert.notEqual(
        role,
        undefined,
        `full schema ${schemaIndex} role ${roleIndex} exists`
      );
      if (role === undefined) {
        throw new Error(
          `full schema ${schemaIndex} role ${roleIndex} is absent`
        );
      }
      names.push(role.name);
    }
    assert.deepStrictEqual(names, expectedNames);
    assert.strictEqual(new Set(names).size, expectedNames.length);
    assert.strictEqual(schema.roles.length, expectedNames.length);
  }
});

await test('VscodeRoleSchemas :: dark and light share role membership and graph structure', () => {
  const darkRoleNames = VSCODE_FULL_ROLE_SCHEMAS.dark.roles.map((role) => {
    return role.name;
  });
  const lightRoleNames = VSCODE_FULL_ROLE_SCHEMAS.light.roles.map((role) => {
    return role.name;
  });
  const darkGraph = VSCODE_FULL_ROLE_SCHEMAS.dark.relationshipGraph;
  const lightGraph = VSCODE_FULL_ROLE_SCHEMAS.light.relationshipGraph;
  assert.ok(darkGraph !== undefined);
  assert.ok(lightGraph !== undefined);
  assert.deepStrictEqual(darkRoleNames, lightRoleNames);
  assert.deepStrictEqual(
    VscodeRoleSchemaGraph.relationshipTopology(darkGraph),
    VscodeRoleSchemaGraph.relationshipTopology(lightGraph)
  );
  VscodeRoleSchemaGraph.assertTolerantRelationships(darkGraph);
  VscodeRoleSchemaGraph.assertTolerantRelationships(lightGraph);
  const extensionRoleNames = new Set<string>(
    VSCODE_ROLE_SCHEMA_EXPECTATIONS.extensionNames
  );
  const schemas = [
    VSCODE_FULL_ROLE_SCHEMAS.dark,
    VSCODE_FULL_ROLE_SCHEMAS.light
  ];
  for (
    let schemaCount = schemas.length, schemaIndex = 0;
    schemaIndex < schemaCount;
    schemaIndex += 1
  ) {
    const schema = schemas.at(schemaIndex);
    assert.notEqual(
      schema,
      undefined,
      `full contrast schema ${schemaIndex} exists`
    );
    if (schema === undefined) {
      throw new Error(`full contrast schema ${schemaIndex} is absent`);
    }
    const pairsWithExtensionRoles = [];
    const contrastPairs = schema.contrastPairs ?? [];
    for (let pairIndex = 0; pairIndex < contrastPairs.length; pairIndex += 1) {
      const pair = contrastPairs.at(pairIndex);
      if (
        pair !== undefined &&
        (extensionRoleNames.has(pair.background) ||
          extensionRoleNames.has(pair.foreground))
      ) {
        pairsWithExtensionRoles.push(pair);
      }
    }
    assert.deepStrictEqual(
      pairsWithExtensionRoles,
      VSCODE_ROLE_SCHEMA_EXPECTATIONS.extensionContrastPairs
    );
  }
});

await test('VscodeRoleSchemas :: compact views are exactly the canonical base vocabulary', () => {
  const baseRoleNames = new Set<string>(
    VSCODE_ROLE_SCHEMA_EXPECTATIONS.baseNames
  );
  const schemas = [
    VSCODE_COMPACT_ROLE_SCHEMAS.dark,
    VSCODE_COMPACT_ROLE_SCHEMAS.light
  ];
  for (
    let schemaCount = schemas.length, schemaIndex = 0;
    schemaIndex < schemaCount;
    schemaIndex += 1
  ) {
    const schema = schemas.at(schemaIndex);
    assert.notEqual(schema, undefined, `compact schema ${schemaIndex} exists`);
    if (schema === undefined) {
      throw new Error(`compact schema ${schemaIndex} is absent`);
    }
    const names: string[] = [];
    for (
      let roleCount = schema.roles.length, roleIndex = 0;
      roleIndex < roleCount;
      roleIndex += 1
    ) {
      const role = schema.roles.at(roleIndex);
      assert.notEqual(
        role,
        undefined,
        `compact schema ${schemaIndex} role ${roleIndex} exists`
      );
      if (role === undefined) {
        throw new Error(
          `compact schema ${schemaIndex} role ${roleIndex} is absent`
        );
      }
      names.push(role.name);
    }
    assert.deepStrictEqual(names, VSCODE_ROLE_SCHEMA_EXPECTATIONS.baseNames);
    assert.strictEqual(
      schema.roles.length,
      VSCODE_ROLE_SCHEMA_EXPECTATIONS.baseNames.length
    );
    const contrastPairs = schema.contrastPairs ?? [];
    for (let pairIndex = 0; pairIndex < contrastPairs.length; pairIndex += 1) {
      const pair = contrastPairs.at(pairIndex);
      if (pair !== undefined) {
        assert.ok(
          baseRoleNames.has(pair.background) &&
            baseRoleNames.has(pair.foreground)
        );
      }
    }
    const graph = schema.relationshipGraph;
    assert.ok(graph !== undefined);
    VscodeRoleSchemaGraph.assertBaseRelationships(graph, baseRoleNames);
  }
});
