declare class StaggeredItem {
  readonly 'id': string;
  readonly 'index': number;
  readonly 'role': string;
}

/**
 * Builds `count` items with a stable id and a role cycled from `roles`.
 * Callers map the result into their own per-theme style objects — this only
 * covers the id/role/index bookkeeping shared across logo-background themes.
 */
class BuildStaggeredItemsOperation {
  static run(idPrefix: string, count: number, roles: readonly string[]): StaggeredItem[] {
    if (roles.length === 0) {throw new RangeError('roles must contain at least one item');}
    const result = new Array<StaggeredItem>(count);
    for (let index = 0; index < count; index += 1) {
      const role = roles[index % roles.length];
      if (role === undefined) {throw new RangeError('roles must contain at least one item');}
      result[index] = {
        'id': `${idPrefix}-${index}`,
        'index': index,
        'role': role
      };
    }
    return result;
  }
}

export const buildStaggeredItems = BuildStaggeredItemsOperation.run;
