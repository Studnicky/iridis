export const StylesheetWideGamutScenarioPatterns = Object.freeze({
  'DISPLAY_P3_VARIABLE': /--c-primary:\s+color\(display-p3 [\d.]+ [\d.]+ [\d.]+\);/u,
  'ROOT_BLOCK': /:root \{/u,
  'ROOT_FALLBACK': /--c-primary:\s+#[0-9a-f]{6};/u,
  'SUPPORTS_WRAPPER': /^@supports/u
});
