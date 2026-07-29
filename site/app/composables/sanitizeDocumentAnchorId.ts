import { DOCUMENT_ANCHOR_PATTERNS } from './constants/DocumentAnchorPatterns.ts';

/** Shared with index.vue's docs `:id`/`AccordionPanel`'s `panel-id` construction — a doc's scroll anchor and its accordion panel id are both derived from the same raw path, so this is the one place that mapping lives. */
class SanitizedocumentAnchorIdOperation {
  static run(path: string): string {
    const result = path.replace(DOCUMENT_ANCHOR_PATTERNS.UNSAFE_CHARACTER, '-').replace(DOCUMENT_ANCHOR_PATTERNS.EDGE_HYPHENS, '');
    return result;
  }
}

export const sanitizeDocumentAnchorId = SanitizedocumentAnchorIdOperation.run;
