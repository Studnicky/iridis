/** A doc's accordion panel id, derived from its raw path — see sanitizeDocumentAnchorId.ts for its paired scroll-anchor id. */
class DocumentPanelIdOperation {
  static run(path: string): string {
    const result = `doc-${path}`;
    return result;
  }
}

export const documentPanelId = DocumentPanelIdOperation.run;
