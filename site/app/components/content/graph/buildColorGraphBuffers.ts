import { colorRecordFactory } from '@studnicky/iridis';

import type { RoleMathEntry } from '~/composables/types/roleMathEntry.ts';

import type { ColorGraphCategoryVisibility } from './ColorGraphCategoryVisibility.ts';

import { ColorGraphNodeCategory } from './ColorGraphNodeCategory.ts';

class ColorGraphPointMeta {
  public readonly algorithm: string | null;
  public readonly category: ColorGraphNodeCategory;
  public readonly labelSuffix: string;
  public readonly hex: string;
  public readonly name: string;

  public constructor(
    algorithm: string | null,
    category: ColorGraphNodeCategory,
    labelSuffix: string,
    hex: string,
    name: string
  ) {
    this.algorithm = algorithm;
    this.category = category;
    this.labelSuffix = labelSuffix;
    this.hex = hex;
    this.name = name;
  }
}

class ColorGraphBuffers {
  public readonly colors: Float32Array;
  public readonly linkColors: Float32Array;
  public readonly links: Float32Array;
  public readonly meta: ColorGraphPointMeta[];
  public readonly positions: Float32Array;
  public readonly sizes: Float32Array;

  public constructor(
    colors: Float32Array,
    linkColors: Float32Array,
    links: Float32Array,
    meta: ColorGraphPointMeta[],
    positions: Float32Array,
    sizes: Float32Array
  ) {
    this.colors = colors;
    this.linkColors = linkColors;
    this.links = links;
    this.meta = meta;
    this.positions = positions;
    this.sizes = sizes;
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
  public readonly meta: ColorGraphPointMeta[];
  public readonly nodeCategoryIndexes: number[];
  public readonly nodeRgb: number[];
  public readonly positions: number[];
  public readonly sizes: number[];

  public constructor(
    indexByName: Map<string, number>,
    meta: ColorGraphPointMeta[],
    nodeCategoryIndexes: number[],
    nodeRgb: number[],
    positions: number[],
    sizes: number[]
  ) {
    this.indexByName = indexByName;
    this.meta = meta;
    this.nodeCategoryIndexes = nodeCategoryIndexes;
    this.nodeRgb = nodeRgb;
    this.positions = positions;
    this.sizes = sizes;
  }
}

class ColorGraphLinkGeometry {
  public readonly categoriesA: number[];
  public readonly categoriesB: number[];
  public readonly baseAlphas: number[];
  public readonly rgb: number[];
  public readonly indexes: number[];

  public constructor(
    categoriesA: number[],
    categoriesB: number[],
    baseAlphas: number[],
    rgb: number[],
    indexes: number[]
  ) {
    this.categoriesA = categoriesA;
    this.categoriesB = categoriesB;
    this.baseAlphas = baseAlphas;
    this.rgb = rgb;
    this.indexes = indexes;
  }
}

class CachedGraphGeometry {
  public readonly linkBaseAlphas: Float32Array;
  public readonly linkCategoriesA: Int8Array;
  public readonly linkCategoriesB: Int8Array;
  public readonly linkColorRgb: Float32Array;
  public readonly links: Float32Array;
  public readonly meta: ColorGraphPointMeta[];
  public readonly nodeCategoryIndexes: Int8Array;
  public readonly nodeRgb: Float32Array;
  public readonly positions: Float32Array;
  public readonly rolesLength: number;
  public readonly signature: string;
  public readonly sizes: Float32Array;

  public constructor(
    linkBaseAlphas: Float32Array,
    linkCategoriesA: Int8Array,
    linkCategoriesB: Int8Array,
    linkColorRgb: Float32Array,
    links: Float32Array,
    meta: ColorGraphPointMeta[],
    nodeCategoryIndexes: Int8Array,
    nodeRgb: Float32Array,
    positions: Float32Array,
    rolesLength: number,
    signature: string,
    sizes: Float32Array
  ) {
    this.linkBaseAlphas = linkBaseAlphas;
    this.linkCategoriesA = linkCategoriesA;
    this.linkCategoriesB = linkCategoriesB;
    this.linkColorRgb = linkColorRgb;
    this.links = links;
    this.meta = meta;
    this.nodeCategoryIndexes = nodeCategoryIndexes;
    this.nodeRgb = nodeRgb;
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
    const signature = ColorGraphBuffersBuilder.colorSignatureForRoles(roles);
    const cached = ColorGraphBuffersBuilder.cacheMatch(roles, signature);
    const geometry = cached ?? ColorGraphBuffersBuilder.buildGeometry(roles, signature);
    ColorGraphBuffersBuilder.populateCachedColors(geometry, visible, colors, linkColors);
    const buffers = new ColorGraphBuffers(
      new Float32Array(colors),
      new Float32Array(linkColors),
      geometry.links,
      geometry.meta,
      geometry.positions,
      geometry.sizes
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
      Float32Array.from(links.rgb),
      new Float32Array(links.indexes),
      nodes.meta,
      Int8Array.from(nodes.nodeCategoryIndexes),
      Float32Array.from(nodes.nodeRgb),
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
    const meta: ColorGraphPointMeta[] = [];
    const nodeCategoryIndexes: number[] = [];
    const nodeRgb: number[] = [];
    const positions: number[] = [];
    const sizes: number[] = [];
    const roleCount = roles.length;
    for (let roleIndex = 0; roleIndex < roleCount; roleIndex++) {
      const role = roles[roleIndex];
      if (role === undefined) {continue;}
      indexByName.set(role.name, roleIndex);
      const category = ColorGraphNodeCategory.fromRole(role);
      meta.push(new ColorGraphPointMeta(
        role.algorithmInfo?.hueAlgorithm ?? null,
        category,
        role.clamp === null ? '' : ' ⏚',
        role.hex,
        role.name
      ));
      const position = positionsByName.get(role.name);
      if (position === undefined) {continue;}
      positions.push(position[0], position[1]);
      const [red, green, blue] = ColorGraphBuffersBuilder.rgbOf(role.hex);
      nodeRgb.push(red, green, blue);
      nodeCategoryIndexes.push(category.index);
      sizes.push(role.origin.isDerived()
        ? ColorGraphBuffersBuilder.leafSize
        : ColorGraphBuffersBuilder.hubSize);
    }
    const nodes = new ColorGraphNodeGeometry(
      indexByName,
      meta,
      nodeCategoryIndexes,
      nodeRgb,
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
    const rgb: number[] = [];
    const indexes: number[] = [];
    ColorGraphBuffersBuilder.addParentLinks(
      roles,
      indexByName,
      categoriesA,
      categoriesB,
      baseAlphas,
      rgb,
      indexes
    );
    ColorGraphBuffersBuilder.addHubRingLinks(
      hubs,
      indexByName,
      categoriesA,
      categoriesB,
      baseAlphas,
      rgb,
      indexes
    );
    const links = new ColorGraphLinkGeometry(categoriesA, categoriesB, baseAlphas, rgb, indexes);
    return links;
  }

  private static addParentLinks(
    roles: readonly RoleMathEntry[],
    indexByName: ReadonlyMap<string, number>,
    categoriesA: number[],
    categoriesB: number[],
    baseAlphas: number[],
    rgb: number[],
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
      const [red, green, blue] = ColorGraphBuffersBuilder.rgbOf(role.hex);
      categoriesA.push(ColorGraphNodeCategory.fromRole(role).index);
      categoriesB.push(-1);
      baseAlphas.push(ColorGraphBuffersBuilder.linkAlphaDerivedVisible);
      rgb.push(red, green, blue);
    }
  }

  private static addHubRingLinks(
    hubs: readonly RoleMathEntry[],
    indexByName: ReadonlyMap<string, number>,
    categoriesA: number[],
    categoriesB: number[],
    baseAlphas: number[],
    rgb: number[],
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
      const [red, green, blue] = ColorGraphBuffersBuilder.rgbOf(hub.hex);
      categoriesA.push(ColorGraphNodeCategory.fromRole(hub).index);
      categoriesB.push(ColorGraphNodeCategory.fromRole(next).index);
      baseAlphas.push(ColorGraphBuffersBuilder.linkAlphaRingVisible);
      rgb.push(red, green, blue);
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
    const roleCount = roles.length;
    for (let index = 0; index < roleCount; index++) {
      if (geometryCache.meta[index] === undefined
        || roles[index]?.name !== geometryCache.meta[index]?.name) {
        return null;
      }
    }
    return geometryCache;
  }

  private static colorSignatureForRoles(roles: readonly RoleMathEntry[]): string {
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
        role.origin.isDerived() ? 'd' : '',
        role.hex,
        role.algorithmInfo?.hueAlgorithm ?? ''
      ].join(':'));
    }
    const signature = roleSignatures.join('|');
    return signature;
  }

  private static populateCachedColors(
    cached: CachedGraphGeometry,
    visible: ColorGraphCategoryVisibility,
    colors: number[],
    linkColors: number[]
  ): void {
    const isNodeVisible = (categoryIndex: number): boolean => {
      const categoryVisible = visible.isIndexVisible(categoryIndex);
      return categoryVisible;
    };
    const nodeCount = cached.nodeCategoryIndexes.length;
    for (let index = 0; index < nodeCount; index++) {
      const categoryIndex = cached.nodeCategoryIndexes[index];
      const red = cached.nodeRgb[index * 3];
      const green = cached.nodeRgb[index * 3 + 1];
      const blue = cached.nodeRgb[index * 3 + 2];
      if (categoryIndex === undefined || red === undefined
        || green === undefined || blue === undefined) {continue;}
      const alpha = isNodeVisible(categoryIndex)
        ? ColorGraphBuffersBuilder.nodeAlphaVisible
        : ColorGraphBuffersBuilder.nodeAlphaHidden;
      colors.push(red, green, blue, alpha);
    }

    const linkCount = cached.linkCategoriesA.length;
    for (let linkIndex = 0; linkIndex < linkCount; linkIndex++) {
      const firstCategory = cached.linkCategoriesA[linkIndex];
      const secondCategory = cached.linkCategoriesB[linkIndex];
      const baseAlpha = cached.linkBaseAlphas[linkIndex];
      const red = cached.linkColorRgb[linkIndex * 3];
      const green = cached.linkColorRgb[linkIndex * 3 + 1];
      const blue = cached.linkColorRgb[linkIndex * 3 + 2];
      if (firstCategory === undefined || secondCategory === undefined
        || baseAlpha === undefined || red === undefined
        || green === undefined || blue === undefined) {continue;}
      const visibleAlpha = ColorGraphBuffersBuilder.linkAlpha(
        firstCategory,
        secondCategory,
        baseAlpha,
        visible
      );
      linkColors.push(red, green, blue, visibleAlpha);
    }
  }

  private static populateColors(
    nodeCategoryIndexes: readonly number[],
    nodeRgb: readonly number[],
    linkCategoryA: readonly number[],
    linkCategoryB: readonly number[],
    linkAlpha: readonly number[],
    linkRgb: readonly number[],
    visible: ColorGraphCategoryVisibility,
    colors: number[],
    linkColors: number[]
  ): void {
    const isNodeVisible = (categoryIndex: number): boolean => {
      const categoryVisible = visible.isIndexVisible(categoryIndex);
      return categoryVisible;
    };
    const nodeCount = nodeCategoryIndexes.length;
    for (let index = 0; index < nodeCount; index++) {
      const categoryIndex = nodeCategoryIndexes[index];
      const red = nodeRgb[index * 3];
      const green = nodeRgb[index * 3 + 1];
      const blue = nodeRgb[index * 3 + 2];
      if (categoryIndex === undefined || red === undefined
        || green === undefined || blue === undefined) {continue;}
      const alpha = isNodeVisible(categoryIndex)
        ? ColorGraphBuffersBuilder.nodeAlphaVisible
        : ColorGraphBuffersBuilder.nodeAlphaHidden;
      colors.push(red, green, blue, alpha);
    }

    const linkCount = linkCategoryA.length;
    for (let linkIndex = 0; linkIndex < linkCount; linkIndex++) {
      const firstCategory = linkCategoryA[linkIndex];
      const secondCategory = linkCategoryB[linkIndex];
      const baseAlpha = linkAlpha[linkIndex];
      const red = linkRgb[linkIndex * 3];
      const green = linkRgb[linkIndex * 3 + 1];
      const blue = linkRgb[linkIndex * 3 + 2];
      if (firstCategory === undefined || secondCategory === undefined
        || baseAlpha === undefined || red === undefined
        || green === undefined || blue === undefined) {continue;}
      const visibleAlpha = ColorGraphBuffersBuilder.linkAlpha(
        firstCategory,
        secondCategory,
        baseAlpha,
        visible
      );
      linkColors.push(red, green, blue, visibleAlpha);
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

  private static rgbOf(hex: string): [number, number, number] {
    const { 'b': blue, 'g': green, 'r': red } = colorRecordFactory.fromHex(hex).rgb;
    return [red, green, blue];
  }
};
