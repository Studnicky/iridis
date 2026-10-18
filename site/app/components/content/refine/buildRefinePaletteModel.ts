export const buildRefinePaletteModel = class RefinePaletteModelBuilder {
  /** Group order for the role picker: surfaces, text, borders, brand/semantic, then syntax tokens. */
  private static readonly roleGroupOrder: readonly string[] = [
    'background', 'bg-soft', 'surface', 'code-bg', 'divider',
    'text', 'text-strong', 'text-subtle',
    'border', 'border-strong',
    'brand', 'on-brand', 'accent-alt', 'muted',
    'success', 'warning', 'error', 'info',
    'syntax-keyword', 'syntax-string', 'syntax-number', 'syntax-function', 'syntax-type',
    'syntax-comment', 'syntax-attribute', 'syntax-punctuation'
  ];
  private static readonly roleGroupIndices = RefinePaletteModelBuilder.buildRoleGroupIndices();

  public static sortPinnableRoles(roles: readonly string[]): string[] {
    const result = [...roles].sort((left, right) => {
      const leftIndex = this.roleGroupIndices.get(left);
      const rightIndex = this.roleGroupIndices.get(right);
      if (leftIndex === undefined && rightIndex === undefined) {
        const alphabeticalOrder = left.localeCompare(right);
        return alphabeticalOrder;
      }
      if (leftIndex === undefined) {
        const afterKnownRole = 1;
        return afterKnownRole;
      }
      if (rightIndex === undefined) {
        const beforeUnknownRole = -1;
        return beforeUnknownRole;
      }
      const groupOrder = leftIndex - rightIndex;
      return groupOrder;
    });
    return result;
  }

  private static buildRoleGroupIndices(): ReadonlyMap<string, number> {
    const indices = new Map<string, number>();
    for (let index = 0; index < this.roleGroupOrder.length; index += 1) {
      const roleName = this.roleGroupOrder[index];
      if (roleName !== undefined) {
        indices.set(roleName, index);
      }
    }
    return indices;
  }
};
