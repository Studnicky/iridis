export const StylesheetCellsOneToThreeScenarioPatterns = Object.freeze({
  'DARK_SCHEME': /@media \(prefers-color-scheme: dark\)/u,
  'FORCED_COLORS': /@media \(forced-colors: active\)/u,
  'FORCED_COLORS_PREFIX': '@media (forced-colors',
  'PRIMARY_CANVAS_TEXT': /--c-primary:\s+CanvasText;/u,
  'PRIMARY_VARIABLE': /--c-primary:\s+#[0-9a-f]{6};/u,
  'ROOT': /:root/u,
  'SECONDARY_VARIABLE': /--c-secondary:\s+#[0-9a-f]{6};/u,
  'SUPPORTS': '@supports',
  'TEXT_CANVAS': /--c-text:\s+Canvas;/u,
  'TEXT_CANVAS_TEXT': /--c-text:\s+CanvasText;/u,
  'UPPERCASE_CHARACTER': /[A-Z]/gu
});
