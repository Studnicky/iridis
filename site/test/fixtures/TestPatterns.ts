export class TestPatterns {
  static readonly ALWAYS_VISIBLE_STAGE_IDENTIFIERS = ['upload', 'refine', 'explore', 'result', 'reference'];
  static readonly CSS_EXTERNAL_TOKEN = /--(?:dag-explorer|dagonizer|vp)-/u;
  static readonly CSS_HARDCODED_BORDER_STYLE = /\b(?:border(?:-[a-z]+)?|outline):[^;]*\b(?:dashed|dotted|solid)\b/u;
  static readonly CSS_HARDCODED_RADIUS = /border(?:-[a-z-]+)?-radius:\s*[1-9][\d.]*(?:em|px|rem)\b/u;
  static readonly CSS_LITERAL_COLOR = /#[\da-f]{3,8}|(?:rgb|hsl)a?\(/iu;
  static readonly CSS_MODAL_REDUCED_MOTION = /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.dagonizer-modal-shell,[\s\S]*\.dagonizer-modal-card[\s\S]*animation: none;/u;
  static readonly CSS_TOKEN_DEFINITION = /(--[-a-zA-Z0-9]+)\s*:/gu;
  static readonly CSS_TOKEN_FALLBACK = /var\(--[-a-zA-Z0-9]+\s*,/u;
  static readonly CSS_TOKEN_REFERENCE = /var\((--[-a-zA-Z0-9]+)/gu;
  static readonly HEX = /^#[0-9a-f]{6}$/iu;
  static readonly INVALID_DRAG_END = /Cannot handle event "DRAG_END" in state "idle"/u;
  static readonly INVALID_DRAG_MOVE = /Cannot handle event "DRAG_MOVE" in state "idle"/u;
  static readonly DOCUMENT_IDENTIFIERS = [
    '01-what-is-iridis',
    '02-the-four-stages',
    '03-adopting-existing-apps',
    '04-engine-api',
    '05-recipe-vue-capacitor',
    '06-plugin-ecosystem',
    '07-cli-usage',
    '08-vscode-theme-recipe',
    '09-task-registry-reference',
    '10-math-primitives-reference',
    '11-architecture-internals',
    '12-living-color'
  ];
  static readonly EXPECTED_INITIAL_NAVIGATION_ORDER = [
    ...TestPatterns.DOCUMENT_IDENTIFIERS.slice(0, 2),
    ...TestPatterns.ALWAYS_VISIBLE_STAGE_IDENTIFIERS,
    ...TestPatterns.DOCUMENT_IDENTIFIERS.slice(2)
  ];
  static readonly EXPECTED_NAVIGATION_ORDER_WITH_COMBINE = [
    ...TestPatterns.DOCUMENT_IDENTIFIERS.slice(0, 2),
    'upload', 'combine', 'refine', 'explore', 'result', 'reference',
    ...TestPatterns.DOCUMENT_IDENTIFIERS.slice(2)
  ];
  static readonly SSR_DOCUMENT_ONE = /id="01-what-is-iridis"/u;
  static readonly SSR_COMBINE_STAGE = /id="combine"/u;
  static readonly SSR_NUXT_ROOT = /id="__nuxt"/u;
  static readonly SSR_REMAINING_DOCUMENTS = /id="remaining-documents"/u;
  static readonly SSR_TOKEN_SELECTOR = /html:root, html:root\.dark, html:root:not\(\.dark\)/u;
}
