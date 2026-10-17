export const SiteDesignSystemCssPatterns = Object.freeze({
  'CSS_COMMENT': /\/\*[\s\S]*?\*\//gu,
  'ENGINE_COLOR_TOKEN_FALLBACK': /var\(--ui-[-a-zA-Z0-9]+\s*,/u,
  'FORBIDDEN_APP_CONFIG_COLOR_FALLBACK': /\b(?:white|gray-\d+)\b/u,
  'PRIMARY_CONTRAST_CLASS': /text-\[var\(--ui-primary-contrast\)\]/u,
  'RAW_COLOR_MIX_ENDPOINT': /color-mix\([^;]*(?:\bwhite\b|\bblack\b)/iu,
  'VUE_STYLE_BLOCK': /<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/gu
});
