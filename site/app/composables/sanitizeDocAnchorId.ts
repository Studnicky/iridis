/** Shared with index.vue's docs `:id`/`AccordionPanel`'s `panel-id` construction — a doc's scroll anchor and its accordion panel id are both derived from the same raw path, so this is the one place that mapping lives. */
export function sanitizeDocAnchorId(path: string): string {
  const result = path.replace(/[^a-zA-Z0-9-]/g, '-').replace(/^-+|-+$/g, '');
  return result;
}
