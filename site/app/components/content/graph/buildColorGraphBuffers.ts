import { colorRecordFactory } from '@studnicky/iridis';

import type { RoleMathEntry } from '~/composables/types/roleMathEntry.ts';

import type { ColorGraphCategoryVisibility } from './ColorGraphCategoryVisibility.ts';

import { ColorGraphNodeCategory } from './ColorGraphNodeCategory.ts';
import { ColorGraphPointMeta } from './ColorGraphPointMeta.ts';

class ColorGraphBuffers {
  public readonly colors: Float32Array;
  public readonly layoutKey: string;
  public readonly linkColors: Float32Array;
  public readonly links: Float32Array;
  public readonly meta: ColorGraphPointMeta[];
  public readonly positions: Float32Array;
  public readonly sizes: Float32Array;
  public readonly structureKey: string;

  public constructor(
    colors: Float32Array,
    layoutKey: string,
    linkColors: Float32Array,
    links: Float32Array,
    meta: ColorGraphPointMeta[],
    positions: Float32Array,
    sizes: Float32Array,
    structureKey: string
  ) {
    this.colors = colors;
    this.layoutKey = layoutKey;
    this.linkColors = linkColors;
    this.links = links;
    this.meta = meta;
    this.positions = positions;
    this.sizes = sizes;
    this.structureKey = structureKey;
  }
}

class ColorGraphRolePartition {
  public readonly hubs: RoleMathEntry[];
  public readonly leavesByParent: Map<string, RoleMathEntry[]>;

  public constructor(hubs: RoleMathEntry[], leavesByParent: Map<string, RoleMathEntry[]>) {
    this.hubs = hubs;
    this.leavesByParent = leavesByParent;
  }
}

class ColorGraphNodeGeometry {
  public readonly indexByName: Map<string, number>;
  public readonly nodeCategoryIndexes: number[];
  public readonly positions: number[];
  public readonly sizes: number[];

  public constructor(
    indexByName: Map<string, number>,
    nodeCategoryIndexes: number[],
    positions: number[],
    sizes: number[]
  ) {
    this.indexByName = indexByName;
    this.nodeCategoryIndexes = nodeCategoryIndexes;
    this.positions = positions;
    this.sizes = sizes;
  }
}

class ColorGraphLinkGeometry {
  public readonly categoriesA: number[];
  public readonly categoriesB: number[];
  public readonly baseAlphas: number[];
  public readonly indexes: number[];

  public constructor(
    categoriesA: number[],
    categoriesB: number[],
    baseAlphas: number[],
    indexes: number[]
  ) {
    this.categoriesA = categoriesA;
    this.categoriesB = categoriesB;
    this.baseAlphas = baseAlphas;
    this.indexes = indexes;
  }
}

class CachedGraphGeometry {
  public readonly linkBaseAlphas: Float32Array;
  public readonly linkCategoriesA: Int8Array;
  public readonly linkCategoriesB: Int8Array;
  public readonly links: Float32Array;
  public readonly nodeCategoryIndexes: Int8Array;
  public readonly positions: Float32Array;
  public readonly rolesLength: number;
  public readonly signature: string;
  public readonly sizes: Float32Array;

  public constructor(
    linkBaseAlphas: Float32Array,
    linkCategoriesA: Int8Array,
    linkCategoriesB: Int8Array,
    links: Float32Array,
    nodeCategoryIndexes: Int8Array,
    positions: Float32Array,
    rolesLength: number,
    signature: string,
    sizes: Float32Array
  ) {
    this.linkBaseAlphas = linkBaseAlphas;
    this.linkCategoriesA = linkCategoriesA;
    this.linkCategoriesB = linkCategoriesB;
    this.links = links;
    this.nodeCategoryIndexes = nodeCategoryIndexes;
    this.positions = positions;
    this.rolesLength = rolesLength;
    this.signature = signature;
    this.sizes = sizes;
  }
}

export const buildColorGraphBuffers = class ColorGraphBuffersBuilder {
  private static readonly center = 4096 / 2;
  private static geometryCache: CachedGraphGeometry | null = null;
  private static readonly hubRadius = 900;
  private static readonly hubSize = 20;
  private static readonly leafRadius = 260;
  private static readonly leafSize = 13;
  private static readonly linkAlphaDerivedVisible = 0.5;
  private static readonly linkAlphaHidden = 0.03;
  private static readonly linkAlphaRingVisible = 0.35;
  private static readonly nodeAlphaHidden = 0.06;
  private static readonly nodeAlphaVisible = 1.0;

  /**
   * Seed layout for the force simulation: hub roles (not derived from
   * anything) sit evenly spaced around a large ring; each derived role sits
   * in a small satellite ring around its own parent's position, and hubs are
   * ringed to each other so the whole graph starts as one connected structure
   * instead of N isolated clusters.
   */
  public static build(
    roles: readonly RoleMathEntry[],
    visible: ColorGraphCategoryVisibility
  ): ColorGraphBuffers {
    const colors: number[] = [];
    const linkColors: number[] = [];
    const signature = ColorGraphBuffersBuilder.structureSignatureForRoles(roles);
    const cached = ColorGraphBuffersBuilder.cacheMatch(roles, signature);
    const geometry = cached ?? ColorGraphBuffersBuilder.buildGeometry(roles, signature);
    ColorGraphBuffersBuilder.populateColors(geometry, roles, visible, colors, linkColors);
    const buffers = new ColorGraphBuffers(
      new Float32Array(colors),
      ColorGraphBuffersBuilder.layoutSignatureForRoles(roles),
      new Float32Array(linkColors),
      geometry.links,
      ColorGraphBuffersBuilder.metaForRoles(roles),
      geometry.positions,
      geometry.sizes,
      geometry.signature
    );
    return buffers;
  }

  private static buildGeometry(
    roles: readonly RoleMathEntry[],
    signature: string
  ): CachedGraphGeometry {
    const partition = ColorGraphBuffersBuilder.partitionRoles(roles);
    const positionsByName = ColorGraphBuffersBuilder.positionsByName(roles, partition);
    const nodes = ColorGraphBuffersBuilder.buildNodes(roles, positionsByName);
    const links = ColorGraphBuffersBuilder.buildLinks(roles, partition.hubs, nodes.indexByName);
    const geometry = new CachedGraphGeometry(
      Float32Array.from(links.baseAlphas),
      Int8Array.from(links.categoriesA),
      Int8Array.from(links.categoriesB),
      new Float32Array(links.indexes),
      Int8Array.from(nodes.nodeCategoryIndexes),
      new Float32Array(nodes.positions),
      roles.length,
      signature,
      new Float32Array(nodes.sizes)
    );
    ColorGraphBuffersBuilder.geometryCache = geometry;
    return geometry;
  }

  private static partitionRoles(
    roles: readonly RoleMathEntry[]
  ): ColorGraphRolePartition {
    const hubs: RoleMathEntry[] = [];
    const leavesByParent = new Map<string, RoleMathEntry[]>();
    const rolesLength = roles.length;
    for (let roleIndex = 0; roleIndex < rolesLength; roleIndex++) {
      const role = roles[roleIndex];
      if (role === undefined) {continue;}
      if (role.parentRole === undefined) {
        hubs.push(role);
        continue;
      }
      const leaves = leavesByParent.get(role.parentRole) ?? [];
      leaves.push(role);
      leavesByParent.set(role.parentRole, leaves);
    }
    const partition = new ColorGraphRolePartition(hubs, leavesByParent);
    return partition;
  }

  private static positionsByName(
    roles: readonly RoleMathEntry[],
    partition: ColorGraphRolePartition
  ): Map<string, [number, number]> {
    const positionsByName = new Map<string, [number, number]>;
    const hubs = partition.hubs;
    const hubCount = hubs.length;
    for (let hubIndex = 0; hubIndex < hubCount; hubIndex++) {
      const hub = hubs[hubIndex];
      if (hub === undefined) {continue;}
      ColorGraphBuffersBuilder.addHubPositions(
        hub,
        hubIndex,
        hubCount,
        partition.leavesByParent,
        positionsByName
      );
    }
    const rolesLength = roles.length;
    for (let roleIndex = 0; roleIndex < rolesLength; roleIndex++) {
      const role = roles[roleIndex];
      if (role === undefined || positionsByName.has(role.name)) {continue;}
      positionsByName.set(role.name, [
        ColorGraphBuffersBuilder.center,
        ColorGraphBuffersBuilder.center
      ]);
    }
    return positionsByName;
  }

  private static addHubPositions(
    hub: RoleMathEntry,
    hubIndex: number,
    hubCount: number,
    leavesByParent: ReadonlyMap<string, readonly RoleMathEntry[]>,
    positionsByName: Map<string, [number, number]>
  ): void {
    const angle = (hubIndex / Math.max(hubCount, 1)) * Math.PI * 2;
    const x = ColorGraphBuffersBuilder.center
      + Math.cos(angle) * ColorGraphBuffersBuilder.hubRadius;
    const y = ColorGraphBuffersBuilder.center
      + Math.sin(angle) * ColorGraphBuffersBuilder.hubRadius;
    positionsByName.set(hub.name, [x, y]);
    const leaves = leavesByParent.get(hub.name) ?? [];
    const leafCount = leaves.length;
    for (let leafIndex = 0; leafIndex < leafCount; leafIndex++) {
      const leaf = leaves[leafIndex];
      if (leaf === undefined) {continue;}
      const leafAngle = (leafIndex / Math.max(leafCount, 1)) * Math.PI * 2;
      positionsByName.set(leaf.name, [
        x + Math.cos(leafAngle) * ColorGraphBuffersBuilder.leafRadius,
        y + Math.sin(leafAngle) * ColorGraphBuffersBuilder.leafRadius
      ]);
    }
  }

  private static buildNodes(
    roles: readonly RoleMathEntry[],
    positionsByName: ReadonlyMap<string, readonly [number, number]>
  ): ColorGraphNodeGeometry {
    const indexByName = new Map<string, number>();
    const nodeCategoryIndexes: number[] = [];
    const positions: number[] = [];
    const sizes: number[] = [];
    const roleCount = roles.length;
    for (let roleIndex = 0; roleIndex < roleCount; roleIndex++) {
      const role = roles[roleIndex];
      if (role === undefined) {continue;}
      indexByName.set(role.name, roleIndex);
      const category = ColorGraphNodeCategory.fromRole(role);
      const position = positionsByName.get(role.name);
      if (position === undefined) {continue;}
      positions.push(position[0], position[1]);
      nodeCategoryIndexes.push(category.index);
      sizes.push(role.origin.isDerived()
        ? ColorGraphBuffersBuilder.leafSize
        : ColorGraphBuffersBuilder.hubSize);
    }
    const nodes = new ColorGraphNodeGeometry(
      indexByName,
      nodeCategoryIndexes,
      positions,
      sizes
    );
    return nodes;
  }

  private static buildLinks(
    roles: readonly RoleMathEntry[],
    hubs: readonly RoleMathEntry[],
    indexByName: ReadonlyMap<string, number>
  ): ColorGraphLinkGeometry {
    const categoriesA: number[] = [];
    const categoriesB: number[] = [];
    const baseAlphas: number[] = [];
    const indexes: number[] = [];
    ColorGraphBuffersBuilder.addParentLinks(
      roles,
      indexByName,
      categoriesA,
      categoriesB,
      baseAlphas,
      indexes
    );
    ColorGraphBuffersBuilder.addHubRingLinks(
      hubs,
      indexByName,
      categoriesA,
      categoriesB,
      baseAlphas,
      indexes
    );
    const links = new ColorGraphLinkGeometry(categoriesA, categoriesB, baseAlphas, indexes);
    return links;
  }

  private static addParentLinks(
    roles: readonly RoleMathEntry[],
    indexByName: ReadonlyMap<string, number>,
    categoriesA: number[],
    categoriesB: number[],
    baseAlphas: number[],
    indexes: number[]
  ): void {
    const rolesLength = roles.length;
    for (let roleIndex = 0; roleIndex < rolesLength; roleIndex++) {
      const role = roles[roleIndex];
      if (role?.parentRole === undefined) {continue;}
      const childIndex = indexByName.get(role.name);
      const parentIndex = indexByName.get(role.parentRole);
      if (childIndex === undefined || parentIndex === undefined) {continue;}
      indexes.push(childIndex, parentIndex);
      categoriesA.push(ColorGraphNodeCategory.fromRole(role).index);
      categoriesB.push(-1);
      baseAlphas.push(ColorGraphBuffersBuilder.linkAlphaDerivedVisible);
    }
  }

  private static addHubRingLinks(
    hubs: readonly RoleMathEntry[],
    indexByName: ReadonlyMap<string, number>,
    categoriesA: number[],
    categoriesB: number[],
    baseAlphas: number[],
    indexes: number[]
  ): void {
    const hubCount = hubs.length;
    if (hubCount <= 1) {return;}
    for (let hubIndex = 0; hubIndex < hubCount; hubIndex++) {
      const hub = hubs[hubIndex];
      const next = hubs[(hubIndex + 1) % hubCount];
      if (hub === undefined || next === undefined) {continue;}
      const currentHubIndex = indexByName.get(hub.name);
      const nextHubIndex = indexByName.get(next.name);
      if (currentHubIndex === undefined || nextHubIndex === undefined) {continue;}
      indexes.push(currentHubIndex, nextHubIndex);
      categoriesA.push(ColorGraphNodeCategory.fromRole(hub).index);
      categoriesB.push(ColorGraphNodeCategory.fromRole(next).index);
      baseAlphas.push(ColorGraphBuffersBuilder.linkAlphaRingVisible);
    }
  }

  private static cacheMatch(
    roles: readonly RoleMathEntry[],
    signature: string
  ): CachedGraphGeometry | null {
    const geometryCache = ColorGraphBuffersBuilder.geometryCache;
    if (geometryCache === null) {return null;}
    if (geometryCache.signature !== signature || geometryCache.rolesLength !== roles.length) {
      return null;
    }
    return geometryCache;
  }

  /** Names and lineage decide where nodes sit; a role changing category alone keeps the layout. */
  private static layoutSignatureForRoles(roles: readonly RoleMathEntry[]): string {
    const roleSignatures: string[] = [];
    for (let index = 0; index < roles.length; index++) {
      const role = roles[index];
      if (role === undefined) {continue;}
      roleSignatures.push(`${role.name}:${role.parentRole ?? ''}`);
    }
    const signature = roleSignatures.join('|');
    return signature;
  }

  private static structureSignatureForRoles(roles: readonly RoleMathEntry[]): string {
    const roleCount = roles.length;
    if (roleCount === 0) {
      const emptySignature = '0';
      return emptySignature;
    }
    const roleSignatures: string[] = [];
    for (let index = 0; index < roleCount; index++) {
      const role = roles[index];
      if (role === undefined) {continue;}
      roleSignatures.push([
        role.name,
        role.parentRole ?? '',
        role.origin.isPinned() ? 'p' : '',
        role.origin.isSynthesized() ? 's' : '',
        role.origin.isDerived() ? 'd' : ''
      ].join(':'));
    }
    const signature = roleSignatures.join('|');
    return signature;
  }

  private static metaForRoles(roles: readonly RoleMathEntry[]): ColorGraphPointMeta[] {
    const meta: ColorGraphPointMeta[] = [];
    const roleCount = roles.length;
    for (let index = 0; index < roleCount; index++) {
      const role = roles[index];
      if (role === undefined) {continue;}
      const category = ColorGraphNodeCategory.fromRole(role);
      meta.push(new ColorGraphPointMeta(
        category,
        role.hex,
        role.clamp === null ? '' : ' ⏚',
        role.name,
        role.relationship
      ));
    }
    return meta;
  }

  private static populateColors(
    geometry: CachedGraphGeometry,
    roles: readonly RoleMathEntry[],
    visible: ColorGraphCategoryVisibility,
    colors: number[],
    linkColors: number[]
  ): void {
    const nodeCount = geometry.nodeCategoryIndexes.length;
    for (let index = 0; index < nodeCount; index++) {
      const categoryIndex = geometry.nodeCategoryIndexes[index];
      const role = roles[index];
      if (categoryIndex === undefined || role === undefined) {continue;}
      const [red, green, blue] = ColorGraphBuffersBuilder.rgbOf(role.hex);
      const alpha = visible.isIndexVisible(categoryIndex)
        ? ColorGraphBuffersBuilder.nodeAlphaVisible
        : ColorGraphBuffersBuilder.nodeAlphaHidden;
      colors.push(red, green, blue, alpha);
    }

    const linkCount = geometry.linkCategoriesA.length;
    for (let linkIndex = 0; linkIndex < linkCount; linkIndex++) {
      const firstCategory = geometry.linkCategoriesA[linkIndex];
      const secondCategory = geometry.linkCategoriesB[linkIndex];
      const baseAlpha = geometry.linkBaseAlphas[linkIndex];
      const sourceIndex = geometry.links[linkIndex * 2];
      const role = sourceIndex === undefined ? undefined : roles[sourceIndex];
      if (firstCategory === undefined || secondCategory === undefined
        || baseAlpha === undefined || role === undefined) {continue;}
      const [red, green, blue] = ColorGraphBuffersBuilder.rgbOf(role.hex);
      const alpha = ColorGraphBuffersBuilder.linkAlpha(
        firstCategory,
        secondCategory,
        baseAlpha,
        visible
      );
      linkColors.push(red, green, blue, alpha);
    }
  }

  private static linkAlpha(
    firstCategory: number,
    secondCategory: number,
    baseAlpha: number,
    visible: ColorGraphCategoryVisibility
  ): number {
    const firstVisible = visible.isIndexVisible(firstCategory);
    if (secondCategory < 0) {
      const alpha = firstVisible ? baseAlpha : ColorGraphBuffersBuilder.linkAlphaHidden;
      return alpha;
    }
    const alpha = firstVisible && visible.isIndexVisible(secondCategory)
      ? baseAlpha
      : ColorGraphBuffersBuilder.linkAlphaHidden;
    return alpha;
  }

  public static requiresStructuralApply(
    appliedStructureKey: string | null,
    buffers: ColorGraphBuffers
  ): boolean {
    const requiresApply = buffers.layoutKey !== appliedStructureKey;
    return requiresApply;
  }

  private static rgbOf(hex: string): [number, number, number] {
    const { 'b': blue, 'g': green, 'r': red } = colorRecordFactory.fromHex(hex).rgb;
    return [red, green, blue];
  }
};
