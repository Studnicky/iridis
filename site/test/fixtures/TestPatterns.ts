export const TestPatterns = Object.freeze({
  'ALWAYS_VISIBLE_STAGE_IDENTIFIERS': Object.freeze(['upload', 'refine', 'explore', 'result', 'reference']),
  'CSS_EXTERNAL_TOKEN': /--(?:dag-explorer|dagonizer|vp)-/u,
  'CSS_HARDCODED_BORDER_STYLE': /\b(?:border(?:-[a-z]+)?|outline):[^;]*\b(?:dashed|dotted|solid)\b/u,
  'CSS_HARDCODED_RADIUS': /border(?:-[a-z-]+)?-radius:\s*[1-9][\d.]*(?:em|px|rem)\b/u,
  'CSS_LITERAL_COLOR': /#[\da-f]{3,8}|(?:rgb|hsl)a?\(/iu,
  'CSS_MODAL_REDUCED_MOTION': /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.dagonizer-modal-shell,[\s\S]*\.dagonizer-modal-card[\s\S]*animation: none;/u,
  'CSS_TOKEN_DEFINITION': /(--\w[\w-]*):/gu,
  'CSS_TOKEN_FALLBACK': /var\(--[-a-zA-Z0-9]+\s*,/u,
  'CSS_TOKEN_REFERENCE': /var\((--[-a-zA-Z0-9]+)/gu,
  'DOCUMENT_IDENTIFIERS': Object.freeze([
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
  ]),
  'EXPECTED_INITIAL_NAVIGATION_ORDER': Object.freeze([
    '01-what-is-iridis', '02-the-four-stages', 'upload', 'refine', 'explore', 'result', 'reference',
    '03-adopting-existing-apps', '04-engine-api', '05-recipe-vue-capacitor', '06-plugin-ecosystem',
    '07-cli-usage', '08-vscode-theme-recipe', '09-task-registry-reference', '10-math-primitives-reference',
    '11-architecture-internals', '12-living-color'
  ]),
  'EXPECTED_NAVIGATION_ORDER_WITH_COMBINE': Object.freeze([
    '01-what-is-iridis', '02-the-four-stages', 'upload', 'combine', 'refine', 'explore', 'result', 'reference',
    '03-adopting-existing-apps', '04-engine-api', '05-recipe-vue-capacitor', '06-plugin-ecosystem',
    '07-cli-usage', '08-vscode-theme-recipe', '09-task-registry-reference', '10-math-primitives-reference',
    '11-architecture-internals', '12-living-color'
  ]),
  'HEX': /^#[0-9a-f]{6}$/iu,
  'INVALID_DRAG_END': /Cannot handle event "DRAG_END" in state "idle"/u,
  'INVALID_DRAG_MOVE': /Cannot handle event "DRAG_MOVE" in state "idle"/u,
  'SSR_COMBINE_STAGE': /id="combine"/u,
  'SSR_DOCUMENT_ONE': /id="01-what-is-iridis"/u,
  'SSR_NUXT_ROOT': /id="__nuxt"/u,
  'SSR_REMAINING_DOCUMENTS': /id="remaining-documents"/u,
  'SSR_TOKEN_SELECTOR': /html:root, html:root\.dark, html:root:not\(\.dark\)/u
});
