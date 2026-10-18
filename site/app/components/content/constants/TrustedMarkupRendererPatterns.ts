const fragmentIdentifierPattern = '[A-Za-z_][\\w:.-]*';

export const TRUSTED_MARKUP_RENDERER_PATTERNS = Object.freeze({
  'controlCharacters': /[\u0000-\u001F\u007F]/u,
  'fragment': new RegExp(`^#${  fragmentIdentifierPattern  }$`, 'u'),
  'internalCssUrl': new RegExp(`url\\(\\s*['"]?#${  fragmentIdentifierPattern  }['"]?\\s*\\)`, 'giu'),
  'remainingUrl': /url\s*\(/iu,
  'unsafeCss': /\\|@import|expression\s*\(|javascript\s*:|vbscript\s*:|data\s*:|behavior\s*:|-moz-binding/iu
});
