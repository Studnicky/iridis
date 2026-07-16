import { colorRecordFactory } from '@studnicky/iridis';
import type { RoleMathEntryType } from '~/composables/types/roleMathEntry.ts';

const HUB_SIZE = 20;
const LEAF_SIZE = 13;
const SPACE_SIZE = 4096;
const CENTER = SPACE_SIZE / 2;
const HUB_RADIUS = 900;
const LEAF_RADIUS = 260;
const NODE_ALPHA_VISIBLE = 1.0;
const NODE_ALPHA_HIDDEN = 0.06;
const LINK_ALPHA_HIDDEN = 0.03;
const LINK_ALPHA_DERIVED_VISIBLE = 0.5;
const LINK_ALPHA_RING_VISIBLE = 0.35;
const CATEGORY_INDEX: Readonly<Record<ResolutionCategory, number>> = {
  'pinned': 0,
  'synthesized': 1,
  'derived': 2,
  'direct': 3
};

type CachedGraphGeometry = {
  readonly signature: string;
  readonly rolesLength: number;
  readonly positions: Float32Array;
  readonly sizes: Float32Array;
  readonly links: Float32Array;
  readonly linkCategoriesA: Int8Array;
  readonly linkCategoriesB: Int8Array;
  readonly linkBaseAlphas: Float32Array;
  readonly nodeRgb: Float32Array;
  readonly nodeCategoryIndexes: Int8Array;
  readonly linkColorRgb: Float32Array;
  readonly meta: {
    readonly name: string;
    readonly hex: string;
    readonly clamped: boolean;
    readonly category: ResolutionCategory;
    readonly algorithm: string | null;
  }[];
};

let geometryCache: CachedGraphGeometry | null = null;

function colorSignatureForRoles(roles: readonly RoleMathEntryType[]): string {
  if (roles.length === 0) return '0';
  return roles.map((role) => [
    role.name,
    role.parentRole ?? '',
    role.isPinned ? 'p' : '',
    role.synthesized ? 's' : '',
    role.isDerived ? 'd' : '',
    role.hex,
    role.algorithmInfo?.hueAlgorithm ?? '',
  ].join(':')).join('|');
}

function cacheMatch(roles: readonly RoleMathEntryType[], signature: string): CachedGraphGeometry | null {
  if (geometryCache === null || geometryCache.signature !== signature) {
    return null;
  }
  if (geometryCache.rolesLength !== roles.length) { return null; }
  for (let i = 0; i < roles.length; i++) {
    if (geometryCache.meta[i] === undefined || roles[i]?.name !== geometryCache.meta[i]?.name) {
      return null;
    }
  }
  return geometryCache;
}

type ResolutionCategory = 'pinned' | 'synthesized' | 'derived' | 'direct';

function categoryOf(role: RoleMathEntryType): ResolutionCategory {
  if (role.isPinned) return 'pinned';
  if (role.synthesized) return 'synthesized';
  if (role.isDerived) return 'derived';
  return 'direct';
}

function rgbOf(hex: string): [number, number, number] {
  const { r, g, b } = colorRecordFactory.fromHex(hex).rgb;
  return [r, g, b];
}

/**
 * Seed layout for the force simulation: hub roles (not derived from
 * anything) sit evenly spaced around a large ring; each derived role sits
 * in a small satellite ring around its own parent's position, and hubs are
 * ringed to each other so the whole graph starts as one connected structure
 * instead of N isolated clusters.
 */
export function buildColorGraphBuffers(
  roles: readonly RoleMathEntryType[],
  visible: Readonly<Record<ResolutionCategory, boolean>>
): {
    readonly positions: Float32Array;
    readonly colors: Float32Array;
    readonly sizes: Float32Array;
    readonly links: Float32Array;
    readonly linkColors: Float32Array;
    readonly meta: {
      readonly name: string;
      readonly hex: string;
      readonly clamped: boolean;
      readonly category: ResolutionCategory;
      readonly algorithm: string | null;
    }[];
  } {
  const indexByName = new Map<string, number>();
  const meta: {
    readonly name: string;
    readonly hex: string;
    readonly clamped: boolean;
    readonly category: ResolutionCategory;
    readonly algorithm: string | null;
  }[] = [];
  const positions: number[] = [];
  const colors: number[] = [];
  const sizes: number[] = [];
  const links: number[] = [];
  const linkColors: number[] = [];
  const signature = colorSignatureForRoles(roles);
  const cached = cacheMatch(roles, signature);

  if (cached !== null) {
    const visibleNode = [
      visible['pinned'],
      visible['synthesized'],
      visible['derived'],
      visible['direct']
    ];

    for (let index = 0; index < cached.nodeCategoryIndexes.length; index += 1) {
      const categoryIndex = cached.nodeCategoryIndexes[index];
      if (categoryIndex === undefined) { continue; }
      const alpha = visibleNode[categoryIndex] ? NODE_ALPHA_VISIBLE : NODE_ALPHA_HIDDEN;
      const sourceIndex = index * 3;
      colors.push(
        cached.nodeRgb[sourceIndex] ?? 0,
        cached.nodeRgb[sourceIndex + 1] ?? 0,
        cached.nodeRgb[sourceIndex + 2] ?? 0,
        alpha
      );
    }

    for (let linkIndex = 0; linkIndex < cached.linkCategoriesA.length; linkIndex += 1) {
      const rgbSource = linkIndex * 3;
      const firstCategory = cached.linkCategoriesA[linkIndex] as number;
      const secondCategory = cached.linkCategoriesB[linkIndex] as number;
      const baseAlpha = cached.linkBaseAlphas[linkIndex] ?? LINK_ALPHA_HIDDEN;
      let visibleAlpha = LINK_ALPHA_HIDDEN;
      if (secondCategory < 0) {
        if (visibleNode[firstCategory] ?? false) {
          visibleAlpha = baseAlpha;
        }
      } else if ((visibleNode[firstCategory] ?? false) && (visibleNode[secondCategory] ?? false)) {
        visibleAlpha = baseAlpha;
      }
      linkColors.push(
        cached.linkColorRgb[rgbSource] ?? 0,
        cached.linkColorRgb[rgbSource + 1] ?? 0,
        cached.linkColorRgb[rgbSource + 2] ?? 0,
        visibleAlpha
      );
    }

    return {
      positions: cached.positions,
      colors: new Float32Array(colors),
      sizes: cached.sizes,
      links: cached.links,
      linkColors: new Float32Array(linkColors),
      meta: cached.meta
    };
  }

  const hubs = roles.filter((role) => role.parentRole === undefined);
  const leavesByParent = new Map<string, RoleMathEntryType[]>();
  for (const role of roles) {
    if (role.parentRole === undefined) continue;
    const list = leavesByParent.get(role.parentRole) ?? [];
    list.push(role);
    leavesByParent.set(role.parentRole, list);
  }

  const positionByName = new Map<string, [number, number]>();
  hubs.forEach((hub, index) => {
    const angle = (index / Math.max(hubs.length, 1)) * Math.PI * 2;
    const x = CENTER + Math.cos(angle) * HUB_RADIUS;
    const y = CENTER + Math.sin(angle) * HUB_RADIUS;
    positionByName.set(hub.name, [x, y]);
    const leaves = leavesByParent.get(hub.name) ?? [];
    leaves.forEach((leaf, leafIndex) => {
      const leafAngle = (leafIndex / Math.max(leaves.length, 1)) * Math.PI * 2;
      positionByName.set(leaf.name, [x + Math.cos(leafAngle) * LEAF_RADIUS, y + Math.sin(leafAngle) * LEAF_RADIUS]);
    });
  });

  for (const role of roles) {
    if (!positionByName.has(role.name)) positionByName.set(role.name, [CENTER, CENTER]);
  }

  const linkCategoryA: number[] = [];
  const linkCategoryB: number[] = [];
  const linkAlpha: number[] = [];
  const linkRgb: number[] = [];
  const nodeRgb: number[] = [];
  const nodeCategoryIndexes: number[] = [];

  roles.forEach((role, index) => {
    indexByName.set(role.name, index);
    const category = categoryOf(role);
    const categoryIndex = CATEGORY_INDEX[category];
    meta.push({
      'name': role.name,
      'hex': role.hex,
      'clamped': role.clamp !== null,
      'category': category,
      'algorithm': role.algorithmInfo?.hueAlgorithm ?? null
    });
    const [x, y] = positionByName.get(role.name)!;
    positions.push(x, y);
    const [r, g, b] = rgbOf(role.hex);
    nodeRgb.push(r, g, b);
    nodeCategoryIndexes.push(categoryIndex);
    sizes.push(role.isDerived ? LEAF_SIZE : HUB_SIZE);
  });

  for (const role of roles) {
    if (role.parentRole === undefined) continue;
    const childIdx = indexByName.get(role.name);
    const parentIdx = indexByName.get(role.parentRole);
    if (childIdx === undefined || parentIdx === undefined) continue;
    links.push(childIdx, parentIdx);
    const [r, g, b] = rgbOf(role.hex);
    const categoryIndex = CATEGORY_INDEX[categoryOf(role)];
    linkCategoryA.push(categoryIndex);
    linkCategoryB.push(-1);
    linkAlpha.push(LINK_ALPHA_DERIVED_VISIBLE);
    linkRgb.push(r, g, b);
  }

  if (hubs.length > 1) {
    hubs.forEach((hub, index) => {
      const next = hubs[(index + 1) % hubs.length];
      if (next === undefined) return;
      const hubIdx = indexByName.get(hub.name);
      const nextIdx = indexByName.get(next.name);
      if (hubIdx === undefined || nextIdx === undefined) return;
      links.push(hubIdx, nextIdx);
      const [r, g, b] = rgbOf(hub.hex);
      const hubCategoryA = CATEGORY_INDEX[categoryOf(hub)];
      const hubCategoryB = CATEGORY_INDEX[categoryOf(next)];
      linkCategoryA.push(hubCategoryA);
      linkCategoryB.push(hubCategoryB);
      linkAlpha.push(LINK_ALPHA_RING_VISIBLE);
      linkRgb.push(r, g, b);
    });
  }

  const visibleNode = [
    visible['pinned'],
    visible['synthesized'],
    visible['derived'],
    visible['direct']
  ];
  for (let index = 0; index < nodeCategoryIndexes.length; index += 1) {
    const categoryIndex = nodeCategoryIndexes[index];
    if (categoryIndex === undefined) { continue; }
    const alpha = visibleNode[categoryIndex] ? NODE_ALPHA_VISIBLE : NODE_ALPHA_HIDDEN;
    const sourceIndex = index * 3;
    colors.push(
      nodeRgb[sourceIndex] ?? 0,
      nodeRgb[sourceIndex + 1] ?? 0,
      nodeRgb[sourceIndex + 2] ?? 0,
      alpha
    );
  }

  for (let linkIndex = 0; linkIndex < linkCategoryA.length; linkIndex += 1) {
    const rgbSource = linkIndex * 3;
    const firstCategory = linkCategoryA[linkIndex]!;
    const secondCategory = linkCategoryB[linkIndex]!;
    const baseAlpha = linkAlpha[linkIndex]!;
    let visibleAlpha = LINK_ALPHA_HIDDEN;
    if (secondCategory < 0) {
      if (visibleNode[firstCategory]) {
        visibleAlpha = baseAlpha;
      }
    } else if (visibleNode[firstCategory] && visibleNode[secondCategory]) {
      visibleAlpha = baseAlpha;
    }
    linkColors.push(linkRgb[rgbSource] ?? 0, linkRgb[rgbSource + 1] ?? 0, linkRgb[rgbSource + 2] ?? 0, visibleAlpha);
  }

  geometryCache = {
    'signature': signature,
    'rolesLength': roles.length,
    'positions': new Float32Array(positions),
    'sizes': new Float32Array(sizes),
    'links': new Float32Array(links),
    'linkCategoriesA': Int8Array.from(linkCategoryA),
    'linkCategoriesB': Int8Array.from(linkCategoryB),
    'linkBaseAlphas': Float32Array.from(linkAlpha),
    'nodeRgb': Float32Array.from(nodeRgb),
    'nodeCategoryIndexes': Int8Array.from(nodeCategoryIndexes),
    'linkColorRgb': Float32Array.from(linkRgb),
    'meta': meta
  };

  return {
    positions: geometryCache.positions,
    colors: new Float32Array(colors),
    sizes: geometryCache.sizes,
    links: geometryCache.links,
    linkColors: new Float32Array(linkColors),
    meta
  };
}
