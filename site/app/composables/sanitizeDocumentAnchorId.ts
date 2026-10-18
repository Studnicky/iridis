import { HYPHEN_CHARACTER } from './constants/HYPHEN_CHARACTER.ts';
import { LEADING_HYPHENS_PATTERN } from './constants/LEADING_HYPHENS_PATTERN.ts';
import { UNSAFE_CHARACTER_PATTERN } from './constants/UNSAFE_CHARACTER_PATTERN.ts';

/** Shared with index.vue's docs `:id`/`AccordionPanel`'s `panel-id` construction — a doc's scroll anchor and its accordion panel id are both derived from the same raw path, so this is the one place that mapping lives. */
class SanitizedocumentAnchorIdOperation {
  static run(path: string): string {
    const normalizedPath = path.replace(UNSAFE_CHARACTER_PATTERN, HYPHEN_CHARACTER).replace(LEADING_HYPHENS_PATTERN, '');
    let trailingIndex = normalizedPath.length;
    while (trailingIndex > 0 && normalizedPath[trailingIndex - 1] === HYPHEN_CHARACTER) {
      trailingIndex -= 1;
    }
    const result = normalizedPath.slice(0, trailingIndex);
    return result;
  }
}

export const sanitizeDocumentAnchorId = SanitizedocumentAnchorIdOperation.run;
