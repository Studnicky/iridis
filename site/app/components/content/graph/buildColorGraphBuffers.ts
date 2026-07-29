import { colorRecordFactory } from '@studnicky/iridis';

import type { RoleMathEntryType } from '~/composables/types/roleMathEntry.ts';

class ColorGraphCategoryVisibility {
  public readonly derived: boolean;
  public readonly direct: boolean;
  public readonly pinned: boolean;
  public readonly synthesized: boolean;

  public constructor(derived: boolean, direct: boolean, pinned: boolean, synthesized: boolean) {
    this.derived = derived;
    this.direct = direct;
    this.pinned = pinned;
    this.synthesized = synthesized;
  }
}

class ColorGraphPointMeta {
  public readonly algorithm: string | null;
  public readonly category: 'pinned' | 'synthesized' | 'derived' | 'direct';
  public readonly clamped: boolean;
  public readonly hex: string;
  public readonly name: string;

  public constructor(
    algorithm: string | null,
    category: 'pinned' | 'synthesized' | 'derived' | 'direct',
    clamped: boolean,
    hex: string,
    name: string
  ) {
    this.algorithm = algorithm;
    this.category = category;
    this.clamped = clamped;
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
  private static readonly categoryIndex: Readonly<Record<
    'pinned' | 'synthesized' | 'derived' | 'direct',
    number
  >> = {
    'derived': 2,
    'direct': 3,
    'pinned': 0,
    'synthesized': 1
  };

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
    roles: readonly RoleMathEntryType[],
    visible: ColorGraphCategoryVisibility
  ): ColorGraphBuffers {
    const indexByName = new Map<string, number>();
    const meta: ColorGraphPointMeta[] = [];
    const positions: number[] = [];
    const colors: number[] = [];
    const sizes: number[] = [];
    const links: number[] = [];
    const linkColors: number[] = [];
    const signature = ColorGraphBuffersBuilder.colorSignatureForRoles(roles);
    const cached = ColorGraphBuffersBuilder.cacheMatch(roles, signature);

    if (cached !== null) {
      ColorGraphBuffersBuilder.populateCachedColors(cached, visible, colors, linkColors);
      return new ColorGraphBuffers(
        new Float32Array(colors),
        new Float32Array(linkColors),
        cached.links,
        cached.meta,
        cached.positions,
        cached.sizes
      );
    }

    const hubs: RoleMathEntryType[] = [];
    const leavesByParent = new Map<string, RoleMathEntryType[]>();
    for (const role of roles) {
      if (role.parentRole === undefined) {
        hubs.push(role);
      } else {
        const leaves = leavesByParent.get(role.parentRole) ?? [];
        leaves.push(role);
        leavesByParent.set(role.parentRole, leaves);
      }
    }

    const positionByName = new Map<string, [number, number]>();
    const hubCount = hubs.length;
    for (let hubIndex = 0; hubIndex < hubCount; hubIndex++) {
      const hub = hubs[hubIndex];
      if (hub === undefined) {continue;}
      const angle = (hubIndex / Math.max(hubCount, 1)) * Math.PI * 2;
      const x = ColorGraphBuffersBuilder.center
        + Math.cos(angle) * ColorGraphBuffersBuilder.hubRadius;
      const y = ColorGraphBuffersBuilder.center
        + Math.sin(angle) * ColorGraphBuffersBuilder.hubRadius;
      positionByName.set(hub.name, [x, y]);
      const leaves = leavesByParent.get(hub.name) ?? [];
      const leafCount = leaves.length;
      for (let leafIndex = 0; leafIndex < leafCount; leafIndex++) {
        const leaf = leaves[leafIndex];
        if (leaf === undefined) {continue;}
        const leafAngle = (leafIndex / Math.max(leafCount, 1)) * Math.PI * 2;
        positionByName.set(leaf.name, [
          x + Math.cos(leafAngle) * ColorGraphBuffersBuilder.leafRadius,
          y + Math.sin(leafAngle) * ColorGraphBuffersBuilder.leafRadius
        ]);
      }
    }

    for (const role of roles) {
      if (!positionByName.has(role.name)) {
        positionByName.set(role.name, [
          ColorGraphBuffersBuilder.center,
          ColorGraphBuffersBuilder.center
        ]);
      }
    }

    const linkCategoryA: number[] = [];
    const linkCategoryB: number[] = [];
    const linkAlpha: number[] = [];
    const linkRgb: number[] = [];
    const nodeRgb: number[] = [];
    const nodeCategoryIndexes: number[] = [];

    const roleCount = roles.length;
    for (let roleIndex = 0; roleIndex < roleCount; roleIndex++) {
      const role = roles[roleIndex];
      if (role === undefined) {continue;}
      indexByName.set(role.name, roleIndex);
      const category = ColorGraphBuffersBuilder.categoryOf(role);
      const categoryIndex = ColorGraphBuffersBuilder.categoryIndex[category];
      meta.push(new ColorGraphPointMeta(
        role.algorithmInfo?.hueAlgorithm ?? null,
        category,
        role.clamp !== null,
        role.hex,
        role.name
      ));
      const position = positionByName.get(role.name);
      if (position === undefined) {continue;}
      positions.push(position[0], position[1]);
      const [red, green, blue] = ColorGraphBuffersBuilder.rgbOf(role.hex);
      nodeRgb.push(red, green, blue);
      nodeCategoryIndexes.push(categoryIndex);
      sizes.push(role.isDerived
        ? ColorGraphBuffersBuilder.leafSize
        : ColorGraphBuffersBuilder.hubSize);
    }

    for (const role of roles) {
      if (role.parentRole === undefined) {continue;}
      const childIndex = indexByName.get(role.name);
      const parentIndex = indexByName.get(role.parentRole);
      if (childIndex === undefined || parentIndex === undefined) {continue;}
      links.push(childIndex, parentIndex);
      const [red, green, blue] = ColorGraphBuffersBuilder.rgbOf(role.hex);
      const categoryIndex = ColorGraphBuffersBuilder.categoryIndex[
        ColorGraphBuffersBuilder.categoryOf(role)
      ];
      linkCategoryA.push(categoryIndex);
      linkCategoryB.push(-1);
      linkAlpha.push(ColorGraphBuffersBuilder.linkAlphaDerivedVisible);
      linkRgb.push(red, green, blue);
    }

    if (hubCount > 1) {
      for (let hubIndex = 0; hubIndex < hubCount; hubIndex++) {
        const hub = hubs[hubIndex];
        const next = hubs[(hubIndex + 1) % hubCount];
        if (hub === undefined || next === undefined) {continue;}
        const currentHubIndex = indexByName.get(hub.name);
        const nextHubIndex = indexByName.get(next.name);
        if (currentHubIndex === undefined || nextHubIndex === undefined) {continue;}
        links.push(currentHubIndex, nextHubIndex);
        const [red, green, blue] = ColorGraphBuffersBuilder.rgbOf(hub.hex);
        linkCategoryA.push(ColorGraphBuffersBuilder.categoryIndex[
          ColorGraphBuffersBuilder.categoryOf(hub)
        ]);
        linkCategoryB.push(ColorGraphBuffersBuilder.categoryIndex[
          ColorGraphBuffersBuilder.categoryOf(next)
        ]);
        linkAlpha.push(ColorGraphBuffersBuilder.linkAlphaRingVisible);
        linkRgb.push(red, green, blue);
      }
    }

    ColorGraphBuffersBuilder.populateColors(
      nodeCategoryIndexes,
      nodeRgb,
      linkCategoryA,
      linkCategoryB,
      linkAlpha,
      linkRgb,
      visible,
      colors,
      linkColors
    );

    const geometry = new CachedGraphGeometry(
      Float32Array.from(linkAlpha),
      Int8Array.from(linkCategoryA),
      Int8Array.from(linkCategoryB),
      Float32Array.from(linkRgb),
      new Float32Array(links),
      meta,
      Int8Array.from(nodeCategoryIndexes),
      Float32Array.from(nodeRgb),
      new Float32Array(positions),
      roleCount,
      signature,
      new Float32Array(sizes)
    );
    ColorGraphBuffersBuilder.geometryCache = geometry;

    return new ColorGraphBuffers(
      new Float32Array(colors),
      new Float32Array(linkColors),
      geometry.links,
      meta,
      geometry.positions,
      geometry.sizes
    );
  }

  private static cacheMatch(
    roles: readonly RoleMathEntryType[],
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

  private static categoryOf(
    role: RoleMathEntryType
  ): 'pinned' | 'synthesized' | 'derived' | 'direct' {
    if (role.isPinned) {return 'pinned';}
    if (role.synthesized) {return 'synthesized';}
    if (role.isDerived) {return 'derived';}
    return 'direct';
  }

  private static colorSignatureForRoles(roles: readonly RoleMathEntryType[]): string {
    const roleCount = roles.length;
    if (roleCount === 0) {return '0';}
    const roleSignatures: string[] = [];
    for (let index = 0; index < roleCount; index++) {
      const role = roles[index];
      if (role === undefined) {continue;}
      roleSignatures.push([
        role.name,
        role.parentRole ?? '',
        role.isPinned ? 'p' : '',
        role.synthesized ? 's' : '',
        role.isDerived ? 'd' : '',
        role.hex,
        role.algorithmInfo?.hueAlgorithm ?? ''
      ].join(':'));
    }
    return roleSignatures.join('|');
  }

  private static populateCachedColors(
    cached: CachedGraphGeometry,
    visible: ColorGraphCategoryVisibility,
    colors: number[],
    linkColors: number[]
  ): void {
    const visibleNode = [
      visible.pinned,
      visible.synthesized,
      visible.derived,
      visible.direct
    ];
    const nodeCount = cached.nodeCategoryIndexes.length;
    for (let index = 0; index < nodeCount; index++) {
      const categoryIndex = cached.nodeCategoryIndexes[index];
      const red = cached.nodeRgb[index * 3];
      const green = cached.nodeRgb[index * 3 + 1];
      const blue = cached.nodeRgb[index * 3 + 2];
      if (categoryIndex === undefined || red === undefined
        || green === undefined || blue === undefined) {continue;}
      const alpha = visibleNode[categoryIndex] === true
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
        visibleNode
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
    const visibleNode = [
      visible.pinned,
      visible.synthesized,
      visible.derived,
      visible.direct
    ];
    const nodeCount = nodeCategoryIndexes.length;
    for (let index = 0; index < nodeCount; index++) {
      const categoryIndex = nodeCategoryIndexes[index];
      const red = nodeRgb[index * 3];
      const green = nodeRgb[index * 3 + 1];
      const blue = nodeRgb[index * 3 + 2];
      if (categoryIndex === undefined || red === undefined
        || green === undefined || blue === undefined) {continue;}
      const alpha = visibleNode[categoryIndex] === true
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
        visibleNode
      );
      linkColors.push(red, green, blue, visibleAlpha);
    }
  }

  private static linkAlpha(
    firstCategory: number,
    secondCategory: number,
    baseAlpha: number,
    visibleNode: readonly boolean[]
  ): number {
    if (secondCategory < 0) {
      return visibleNode[firstCategory] === true
        ? baseAlpha
        : ColorGraphBuffersBuilder.linkAlphaHidden;
    }
    return visibleNode[firstCategory] === true && visibleNode[secondCategory] === true
      ? baseAlpha
      : ColorGraphBuffersBuilder.linkAlphaHidden;
  }

  private static rgbOf(hex: string): [number, number, number] {
    const { 'b': blue, 'g': green, 'r': red } = colorRecordFactory.fromHex(hex).rgb;
    return [red, green, blue];
  }
};
