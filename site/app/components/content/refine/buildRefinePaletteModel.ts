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

  public static sortPinnableRoles(roles: readonly string[]): string[] {
    const result = [...roles].sort((left, right) => {
      const leftIndex = this.roleGroupOrder.indexOf(left);
      const rightIndex = this.roleGroupOrder.indexOf(right);
      if (leftIndex === -1 && rightIndex === -1) {
        return left.localeCompare(right);
      }
      if (leftIndex === -1) {
        return 1;
      }
      if (rightIndex === -1) {
        return -1;
      }
      return leftIndex - rightIndex;
    });
    return result;
  }
};
