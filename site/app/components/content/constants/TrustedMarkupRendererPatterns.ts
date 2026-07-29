export const TRUSTED_MARKUP_RENDERER_PATTERNS = Object.freeze({
  'controlCharacters': /[\u0000-\u001F\u007F]/u,
  'fragment': /^#[A-Za-z_][\w:.-]*$/u,
  'internalCssUrl': /url\(\s*['"]?#[A-Za-z_][\w:.-]*['"]?\s*\)/giu,
  'remainingUrl': /url\s*\(/iu,
  'unsafeCss': /\\|@import|expression\s*\(|javascript\s*:|vbscript\s*:|data\s*:|behavior\s*:|-moz-binding/iu
});
