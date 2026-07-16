/** Group order for the role picker: surfaces, text, borders, brand/semantic, then syntax tokens. */
const ROLE_GROUP_ORDER: readonly string[] = [
  'background', 'bg-soft', 'surface', 'code-bg', 'divider',
  'text', 'text-strong', 'text-subtle',
  'border', 'border-strong',
  'brand', 'on-brand', 'accent-alt', 'muted',
  'success', 'warning', 'error', 'info',
  'syntax-keyword', 'syntax-string', 'syntax-number', 'syntax-function', 'syntax-type',
  'syntax-comment', 'syntax-attribute', 'syntax-punctuation'
];

export function sortPinnableRoles(roles: readonly string[]): string[] {
  return [...roles].sort((left, right) => {
    const leftIndex = ROLE_GROUP_ORDER.indexOf(left);
    const rightIndex = ROLE_GROUP_ORDER.indexOf(right);
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
}
