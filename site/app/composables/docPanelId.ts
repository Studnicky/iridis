/** A doc's accordion panel id, derived from its raw path — see sanitizeDocAnchorId.ts for its paired scroll-anchor id. */
export function docPanelId(path: string): string {
  const result = `doc-${path}`;
  return result;
}
