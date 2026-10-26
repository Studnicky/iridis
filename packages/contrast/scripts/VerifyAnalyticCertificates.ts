import type { PaletteStateInterface } from '@studnicky/iridis';

import {
  ColorCoordinate,
  colorRecordFactory,
  consoleLogger,
  ContrastOptionsEntity,
  deriveRoleRelations,
  InputEntity,
  PaletteRoleState,
  RoleDefinitionEntity,
  RoleSchemaEntity,
  RuntimeOptionsEntity
} from '@studnicky/iridis';
import { ContrastFeasibility } from '@studnicky/iridis-contrast';
import { ContrastPolicy, RoleGeometry } from '@studnicky/iridis/tasks';

import { roleSchemaByName } from '../../../site/app/theme/RoleSchemaByName.ts';

type Role = RoleSchemaEntity.Type['roles'][number];

interface Endpoint {
  readonly c: number;
  readonly l: number;
}

interface CellCounts {
  readonly alwaysReachable: number;
  readonly indeterminate: number;
  readonly neverReachable: number;
  readonly reachableOnlyForSomeHues: number;
}

interface Verification {
  readonly allPass: boolean;
  readonly anyPass: boolean;
}

const configurations = [
  { algorithm: 'wcag21', level: 'AA' },
  { algorithm: 'wcag21', level: 'AAA' },
  { algorithm: 'apca', level: 'Lc' }
];

const framings: readonly ('dark' | 'light')[] = ['dark', 'light'];

const roleFor = (roles: ReadonlyMap<string, Role>, name: string): Role => {
  const role = roles.get(name);
  if (role === undefined) throw new Error(`Role "${name}" is absent.`);
  return role;
};

const endpoints = (role: Role): readonly Endpoint[] => {
  const chroma = role.chromaRange;
  const lightness = role.lightnessRange;
  if (chroma === undefined || lightness === undefined) {
    throw new Error(`Role "${role.name}" lacks authored ranges.`);
  }
  return [
    { c: chroma[0], l: lightness[0] }, { c: chroma[1], l: lightness[0] },
    { c: chroma[0], l: lightness[1] }, { c: chroma[1], l: lightness[1] }
  ];
};

const relationshipsByTarget = (schema: RoleSchemaEntity.Type): ReadonlyMap<string, NonNullable<RoleSchemaEntity.Type['relationshipGraph']>['groups'][number]['relationships'][number]> => {
  const result = new Map<string, NonNullable<RoleSchemaEntity.Type['relationshipGraph']>['groups'][number]['relationships'][number]>();
  for (const group of schema.relationshipGraph?.groups ?? []) {
    for (const relationship of group.relationships) {
      result.set(relationship.target, relationship);
    }
  }
  return result;
};

const sourceFor = (role: Role, relationships: ReadonlyMap<string, NonNullable<RoleSchemaEntity.Type['relationshipGraph']>['groups'][number]['relationships'][number]>): string | undefined => {
  const relationship = relationships.get(role.name);
  if (relationship === undefined) return undefined;
  if (relationship.operation === 'alpha-overlay' || relationship.operation === 'oklch-interpolate') return undefined;
  return relationship.source;
};

const rootFor = (
  role: Role,
  roles: ReadonlyMap<string, Role>,
  relationships: ReadonlyMap<string, NonNullable<RoleSchemaEntity.Type['relationshipGraph']>['groups'][number]['relationships'][number]>,
  seen: ReadonlySet<string> = new Set<string>()
): string => {
  if (seen.has(role.name)) throw new Error(`Hue relationship cycle includes "${role.name}".`);
  const source = sourceFor(role, relationships);
  if (source === undefined) return role.name;
  const next = new Set(seen);
  next.add(role.name);
  return rootFor(roleFor(roles, source), roles, relationships, next);
};

const degreesFor = (
  schema: RoleSchemaEntity.Type,
  relationship: Extract<NonNullable<RoleSchemaEntity.Type['relationshipGraph']>['groups'][number]['relationships'][number], { readonly 'operation': 'hue-offset' }>
): number => {
  if (relationship.degrees !== undefined) return relationship.degrees;
  for (const group of schema.relationshipGraph?.groups ?? []) {
    if (!group.relationships.some((candidate) => candidate.id === relationship.id)) continue;
    const modeId = relationship.modeId ?? group.defaultMode;
    const mode = group.modes.find((candidate) => candidate.id === modeId);
    const variant = mode?.hueOffsets.find((candidate) => candidate.variantId === relationship.variantId);
    if (variant !== undefined) return variant.degrees;
  }
  throw new Error(`Hue offset relationship "${relationship.id}" lacks degrees.`);
};

const hueFor = (
  role: Role,
  roles: ReadonlyMap<string, Role>,
  schema: RoleSchemaEntity.Type,
  relationships: ReadonlyMap<string, NonNullable<RoleSchemaEntity.Type['relationshipGraph']>['groups'][number]['relationships'][number]>,
  roots: ReadonlyMap<string, number>
): number => {
  const relationship = relationships.get(role.name);
  const source = sourceFor(role, relationships);
  const sourceHue = source === undefined ? roots.get(role.name) : hueFor(roleFor(roles, source), roles, schema, relationships, roots);
  if (sourceHue === undefined) throw new Error(`Root hue for "${role.name}" is absent.`);
  if (relationship === undefined || relationship.operation === 'alias' || relationship.operation === 'alpha-overlay' || relationship.operation === 'oklch-interpolate') return sourceHue;
  if (relationship.operation === 'hue-offset') return ((sourceHue + degreesFor(schema, relationship)) % 360 + 360) % 360;
  if (relationship.operation === 'hue-target') return RoleGeometry.hueTowards(sourceHue, relationship.hue, relationship.clamp ?? RoleGeometry.DEFAULT_HUE_CLAMP);
  return ((sourceHue + (relationship.hueOffset ?? 0)) % 360 + 360) % 360;
};

const samples = (sameRoot: boolean): readonly number[] => {
  const step = sameRoot ? 1 : 5;
  const values: number[] = [];
  for (let hue = 0; hue <= 360; hue += step) values.push(hue);
  return values;
};

const passes = (
  foreground: Role,
  background: Role,
  foregroundHue: number,
  backgroundHue: number,
  requirement: ContrastPolicy.RequirementInterface
): boolean => {
  for (const foregroundEndpoint of endpoints(foreground)) {
    const foregroundCoordinate = ColorCoordinate.fromOklch(foregroundEndpoint.l, foregroundEndpoint.c, foregroundHue);
    for (const backgroundEndpoint of endpoints(background)) {
      const backgroundCoordinate = ColorCoordinate.fromOklch(backgroundEndpoint.l, backgroundEndpoint.c, backgroundHue);
      const actual = requirement.algorithm === 'apca'
        ? Math.abs(foregroundCoordinate.apca(backgroundCoordinate))
        : foregroundCoordinate.wcag21(backgroundCoordinate);
      if (actual >= requirement.minimumContrastRatio) return true;
    }
  }
  return false;
};

const verify = (
  foreground: Role,
  background: Role,
  roles: ReadonlyMap<string, Role>,
  schema: RoleSchemaEntity.Type,
  relationships: ReadonlyMap<string, NonNullable<RoleSchemaEntity.Type['relationshipGraph']>['groups'][number]['relationships'][number]>,
  requirement: ContrastPolicy.RequirementInterface
): Verification => {
  const foregroundRoot = rootFor(foreground, roles, relationships);
  const backgroundRoot = rootFor(background, roles, relationships);
  const sameRoot = foregroundRoot === backgroundRoot;
  let allPass = true;
  let anyPass = false;
  for (const foregroundRootHue of samples(sameRoot)) {
    for (const backgroundRootHue of sameRoot ? [0] : samples(false)) {
      const roots = new Map<string, number>();
      roots.set(foregroundRoot, foregroundRootHue);
      roots.set(backgroundRoot, sameRoot ? foregroundRootHue : backgroundRootHue);
      const value = passes(
        foreground,
        background,
        hueFor(foreground, roles, schema, relationships, roots),
        hueFor(background, roles, schema, relationships, roots),
        requirement
      );
      allPass &&= value;
      anyPass ||= value;
    }
  }
  return { allPass, anyPass };
};

let certificates = 0;
let failures = 0;
const checked = new Map<string, number>();
const cells = new Map<string, CellCounts>();

for (const [schemaName, schemaPair] of Object.entries(roleSchemaByName)) {
  for (const framing of framings) {
    const schema = schemaPair[framing];
    if (schema === undefined) throw new Error(`Schema "${schemaName}" lacks "${framing}" framing.`);
    const roles = new Map<string, Role>();
    const records: Record<string, ReturnType<typeof colorRecordFactory.fromOklch>> = {};
    for (const role of schema.roles) {
      roles.set(role.name, role);
      records[role.name] = colorRecordFactory.fromOklch(0.5, 0, 0);
    }
    const relationships = relationshipsByTarget(schema);
    for (const configuration of configurations) {
      const options = ContrastOptionsEntity.intake(configuration);
      const input = InputEntity.intake({ colors: [], contrast: options, roles: schema });
      const requirements = ContrastPolicy.normalize(input, PaletteRoleState.admit(records));
      const report = ContrastFeasibility.analyzeSchema(schema, options);
      let alwaysReachable = 0;
      let indeterminate = 0;
      let neverReachable = 0;
      let reachableOnlyForSomeHues = 0;
      for (const pair of report.pairs) {
        if (pair.reachability === 'always-reachable') alwaysReachable += 1;
        if (pair.reachability === 'indeterminate') indeterminate += 1;
        if (pair.reachability === 'never-reachable') neverReachable += 1;
        if (pair.reachability === 'reachable-only-for-some-hues') reachableOnlyForSomeHues += 1;
        if (pair.reachability === 'indeterminate') continue;
        const requirement = requirements.find(
          (candidate) => candidate.foreground === pair.foreground && candidate.background === pair.background
        );
        if (requirement === undefined) throw new Error(`Requirement for "${pair.foreground}/${pair.background}" is absent.`);
        const result = verify(roleFor(roles, pair.foreground), roleFor(roles, pair.background), roles, schema, relationships, requirement);
        const valid = pair.reachability === 'always-reachable'
          ? result.allPass
          : pair.reachability === 'never-reachable'
            ? !result.anyPass
            : result.anyPass && !result.allPass;
        certificates += 1;
        checked.set(pair.reachability, (checked.get(pair.reachability) ?? 0) + 1);
        if (!valid) {
          failures += 1;
          console.error(JSON.stringify({
            actual: result,
            background: pair.background,
            configuration: options,
            expected: pair.reachability,
            foreground: pair.foreground,
            framing,
            schema: schemaName
          }));
        }
      }
      const key = `${schemaName}/${framing}/${configuration.algorithm}-${configuration.level}`;
      cells.set(key, { alwaysReachable, indeterminate, neverReachable, reachableOnlyForSomeHues });
    }
  }
}

interface RelationshipFixture {
  readonly 'state': PaletteStateInterface;
  readonly 'tolerance': number | undefined;
}

const relationshipFixture = (tolerance: number | undefined): RelationshipFixture => {
  const relationship = tolerance === undefined
    ? {
      'id': 'text-alias',
      'operation': 'alias',
      'priority': 0,
      'relaxability': 'fixed',
      'source': 'source',
      'target': 'text'
    }
    : {
      'id': 'text-alias',
      'operation': 'alias',
      'priority': 0,
      'relaxability': 'tolerant',
      'source': 'source',
      'target': 'text',
      'tolerance': { 'chroma': 0, 'lightness': tolerance }
    };
  const schema = RoleSchemaEntity.intake({
    'contrastPairs': [{ 'background': 'background', 'foreground': 'text', 'minimumContrastRatio': 7 }],
    'name': 'relationship-certificate-fixture',
    'relationshipGraph': {
      'groups': [{
        'anchor': 'source',
        'defaultMode': 'base',
        'id': 'text-group',
        'modes': [{ 'hueOffsets': [{ 'degrees': 0, 'variantId': 'base' }], 'id': 'base' }],
        'name': 'Text',
        'relationships': [relationship]
      }]
    },
    'roles': [
      RoleDefinitionEntity.intake({ 'chromaRange': [0, 0], 'lightnessRange': [1, 1], 'name': 'background' }),
      RoleDefinitionEntity.intake({ 'chromaRange': [0, 0], 'lightnessRange': [0.5, 0.5], 'name': 'source' }),
      RoleDefinitionEntity.intake({ 'chromaRange': [0, 0.5], 'lightnessRange': [0, 1], 'name': 'text' })
    ]
  });
  const input = InputEntity.intake({
    'colors': [],
    'contrast': ContrastOptionsEntity.intake({ 'algorithm': 'wcag21', 'level': 'AA' }),
    'roles': schema
  });
  const state: PaletteStateInterface = {
    'colors': [],
    'input': input,
    'metadata': {},
    'outputs': {},
    'roles': {
      'background': colorRecordFactory.fromHex('#ffffff'),
      'source': colorRecordFactory.fromHex('#777777')
    },
    'runtime': RuntimeOptionsEntity.intake({}),
    'variants': {}
  };
  deriveRoleRelations.run(state, { 'logger': consoleLogger, 'startedAt': 0 });
  return { state, tolerance };
};

const contrastAgainstBackground = (state: PaletteStateInterface, lightness: number | undefined): number => {
  const text = state.roles.text;
  const background = state.roles.background;
  if (text === undefined || background === undefined) throw new Error('Relationship fixture lacks resolved roles.');
  const coordinate = lightness === undefined
    ? ColorCoordinate.fromRecord(text)
    : ColorCoordinate.fromOklch(lightness, text.oklch.c, text.oklch.h);
  return coordinate.wcag21(ColorCoordinate.fromRecord(background));
};

const verifyRelationshipCertificates = (): { readonly 'certificates': number; readonly 'indeterminate': number } => {
  const fixed = relationshipFixture(undefined);
  const fixedPair = ContrastFeasibility.proveRun(fixed.state).pairs[0];
  const fixedActual = contrastAgainstBackground(fixed.state, undefined);
  if (
    fixedPair?.reachability !== 'never-reachable' ||
    fixedPair.proof === undefined ||
    Math.abs(fixedPair.proof.bestActual - fixedActual) > 1e-12 ||
    !fixedPair.proof.limitingBounds.some((bound) => bound.channel === 'hue-relationship')
  ) {
    throw new Error('Fixed relationship certificate does not preserve the resolved baseline.');
  }

  const tolerant = relationshipFixture(0.01);
  const tolerantPair = ContrastFeasibility.proveRun(tolerant.state).pairs[0];
  const baseline = tolerant.state.roles.text;
  if (baseline === undefined || tolerant.tolerance === undefined) throw new Error('Tolerant relationship fixture lacks a baseline.');
  const lower = contrastAgainstBackground(tolerant.state, baseline.oklch.l - tolerant.tolerance);
  const upper = contrastAgainstBackground(tolerant.state, baseline.oklch.l + tolerant.tolerance);
  const best = Math.max(lower, upper);
  if (
    tolerantPair?.reachability !== 'never-reachable' ||
    tolerantPair.proof === undefined ||
    tolerantPair.proof.bestActual > best + 1e-12
  ) {
    throw new Error('Tolerant relationship certificate exceeds its baseline-centred tolerance.');
  }

  const alphaSchema = RoleSchemaEntity.intake({
    'contrastPairs': [{ 'background': 'background', 'foreground': 'target', 'minimumContrastRatio': 4.5 }],
    'name': 'alpha-overlay-certificate-fixture',
    'relationshipGraph': {
      'groups': [{
        'anchor': 'base',
        'defaultMode': 'base',
        'id': 'overlay-group',
        'modes': [{ 'hueOffsets': [{ 'degrees': 0, 'variantId': 'base' }], 'id': 'base' }],
        'name': 'Overlay',
        'relationships': [{
          'alpha': 0.5,
          'base': 'base',
          'id': 'target-overlay',
          'operation': 'alpha-overlay',
          'overlay': 'overlay',
          'priority': 0,
          'relaxability': 'fixed',
          'target': 'target'
        }]
      }]
    },
    'roles': [
      RoleDefinitionEntity.intake({ 'chromaRange': [0, 0], 'lightnessRange': [0.1, 0.1], 'name': 'background' }),
      RoleDefinitionEntity.intake({ 'chromaRange': [0, 0], 'lightnessRange': [0.2, 0.2], 'name': 'base' }),
      RoleDefinitionEntity.intake({ 'chromaRange': [0, 0], 'lightnessRange': [0.9, 0.9], 'name': 'overlay' }),
      RoleDefinitionEntity.intake({ 'chromaRange': [0, 0], 'lightnessRange': [0.9, 0.9], 'name': 'target' })
    ]
  });
  const alpha = ContrastFeasibility.analyzeSchema(
    alphaSchema,
    ContrastOptionsEntity.intake({ 'algorithm': 'wcag21', 'level': 'AA' })
  ).pairs[0];
  if (alpha?.reachability !== 'indeterminate' || alpha.sampled === undefined) {
    throw new Error('Alpha-overlay target must remain sampled and indeterminate.');
  }

  const graphSchema = RoleSchemaEntity.intake({
    'contrastPairs': [
      { 'background': 'background', 'foreground': 'alias-target', 'minimumContrastRatio': 4.5 },
      { 'background': 'background', 'foreground': 'offset-target', 'minimumContrastRatio': 4.5 },
      { 'background': 'background', 'foreground': 'delta-target', 'minimumContrastRatio': 4.5 },
      { 'background': 'background', 'foreground': 'target-hue', 'minimumContrastRatio': 4.5 }
    ],
    'name': 'graph-domain-certificate-fixture',
    'relationshipGraph': {
      'groups': [{
        'anchor': 'source',
        'defaultMode': 'opposite',
        'id': 'derived',
        'modes': [{ 'hueOffsets': [{ 'degrees': 180, 'variantId': 'opposite' }], 'id': 'opposite' }],
        'name': 'Derived',
        'relationships': [
          { 'clamp': 180, 'hue': 0, 'id': 'background-hue', 'operation': 'hue-target', 'priority': 0, 'relaxability': 'fixed', 'target': 'background' },
          { 'clamp': 180, 'hue': 120, 'id': 'source-hue', 'operation': 'hue-target', 'priority': 1, 'relaxability': 'fixed', 'target': 'source' },
          { 'id': 'alias', 'operation': 'alias', 'priority': 2, 'relaxability': 'fixed', 'source': 'source', 'target': 'alias-target' },
          { 'id': 'offset', 'operation': 'hue-offset', 'priority': 3, 'relaxability': 'fixed', 'source': 'source', 'target': 'offset-target', 'variantId': 'opposite' },
          { 'id': 'delta', 'lightnessOffset': 0.1, 'operation': 'oklch-delta', 'priority': 4, 'relaxability': 'fixed', 'source': 'source', 'target': 'delta-target' },
          { 'clamp': 90, 'hue': 25, 'id': 'target-hue', 'operation': 'hue-target', 'priority': 5, 'relaxability': 'fixed', 'source': 'source', 'target': 'target-hue' }
        ]
      }]
    },
    'roles': [
      RoleDefinitionEntity.intake({ 'chromaRange': [0.01, 0.01], 'lightnessRange': [0.05, 0.05], 'name': 'background' }),
      RoleDefinitionEntity.intake({ 'chromaRange': [0.01, 0.01], 'lightnessRange': [0.85, 0.85], 'name': 'source' }),
      RoleDefinitionEntity.intake({ 'chromaRange': [0.01, 0.01], 'lightnessRange': [0.85, 0.85], 'name': 'alias-target' }),
      RoleDefinitionEntity.intake({ 'chromaRange': [0.01, 0.01], 'lightnessRange': [0.85, 0.85], 'name': 'offset-target' }),
      RoleDefinitionEntity.intake({ 'chromaRange': [0.01, 0.01], 'lightnessRange': [0.95, 0.95], 'name': 'delta-target' }),
      RoleDefinitionEntity.intake({ 'chromaRange': [0.01, 0.01], 'lightnessRange': [0.85, 0.85], 'name': 'target-hue' })
    ]
  });
  const graphPairs = ContrastFeasibility.analyzeSchema(
    graphSchema,
    ContrastOptionsEntity.intake({ 'algorithm': 'wcag21', 'level': 'AA' })
  ).pairs;
  for (let index = 0; index < graphPairs.length; index += 1) {
    const pair = graphPairs[index];
    if (pair?.reachability !== 'always-reachable' || pair.sampled !== undefined) {
      throw new Error('Graph alias, hue-offset, OKLCH delta, and hue-target relationships require continuous certificates.');
    }
  }
  return { 'certificates': 6, 'indeterminate': 1 };
};

const relationship = verifyRelationshipCertificates();

console.log(JSON.stringify({
  certificates,
  cells: Object.fromEntries(cells),
  checked: Object.fromEntries(checked),
  failures,
  relationship
}));
if (failures > 0) process.exitCode = 1;
