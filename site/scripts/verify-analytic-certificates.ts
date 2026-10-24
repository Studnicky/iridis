import type { RoleSchemaEntity } from '@studnicky/iridis';

import {
  ColorCoordinate,
  colorRecordFactory,
  ContrastOptionsEntity,
  InputEntity,
  PaletteRoleState
} from '@studnicky/iridis';
import { ContrastFeasibility } from '@studnicky/iridis-contrast';
import { ContrastPolicy, RoleGeometry } from '@studnicky/iridis/tasks';

import { roleSchemaByName } from '../app/theme/RoleSchemaByName.ts';

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

const rootFor = (role: Role, roles: ReadonlyMap<string, Role>, seen: ReadonlySet<string> = new Set<string>()): string => {
  if (seen.has(role.name)) throw new Error(`Hue relationship cycle includes "${role.name}".`);
  if (role.derivedFrom === undefined || role.derivedFrom.length === 0) return role.name;
  const next = new Set(seen);
  next.add(role.name);
  return rootFor(roleFor(roles, role.derivedFrom), roles, next);
};

const hueFor = (role: Role, roles: ReadonlyMap<string, Role>, roots: ReadonlyMap<string, number>): number => {
  const sourceHue = role.derivedFrom === undefined || role.derivedFrom.length === 0
    ? roots.get(role.name)
    : hueFor(roleFor(roles, role.derivedFrom), roles, roots);
  if (sourceHue === undefined) throw new Error(`Root hue for "${role.name}" is absent.`);
  if (role.hue !== undefined) {
    return RoleGeometry.hueTowards(sourceHue, role.hue, role.hueClamp ?? RoleGeometry.DEFAULT_HUE_CLAMP);
  }
  return ((sourceHue + (role.hueOffset ?? 0)) % 360 + 360) % 360;
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
  requirement: ContrastPolicy.RequirementInterface
): Verification => {
  const foregroundRoot = rootFor(foreground, roles);
  const backgroundRoot = rootFor(background, roles);
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
        hueFor(foreground, roles, roots),
        hueFor(background, roles, roots),
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
        const result = verify(roleFor(roles, pair.foreground), roleFor(roles, pair.background), roles, requirement);
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

console.log(JSON.stringify({
  certificates,
  cells: Object.fromEntries(cells),
  checked: Object.fromEntries(checked),
  failures
}));
if (failures > 0) process.exitCode = 1;
