import type { HighlighterGeneric } from 'shiki';

import { createHighlighter } from 'shiki';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';

/** Every language MultiOutput's tabs actually emit — CSS, JSON, JS/TS config modules, Android XML. */
export const SUPPORTED_LANGS = ['css', 'json', 'javascript', 'xml'] as const;
export type SupportedLangType = (typeof SUPPORTED_LANGS)[number];

let highlighterPromise: Promise<HighlighterGeneric<never, never>> | null = null;

/**
 * Lazy singleton — the JS regex engine (not the WASM/oniguruma one) avoids
 * shipping a wasm binary for a demo that only ever highlights four languages.
 * No themes are preloaded: every call supplies its own theme object (built
 * fresh from the live engine palette via emit:vscodeThemeJson), so there is
 * nothing stable to preload — see CodeBlock.vue.
 */
function getHighlighter(): Promise<HighlighterGeneric<never, never>> {
  highlighterPromise ??= createHighlighter({
    'engine': createJavaScriptRegexEngine(),
    'langs':  [...SUPPORTED_LANGS],
    'themes': []
  });
  return highlighterPromise;
}

/** Highlights `code` as `lang` using an arbitrary VS Code-shaped theme object (engine.run() output, not a static Shiki theme). */
export async function highlightCode(code: string, lang: SupportedLangType, theme: object): Promise<string> {
  const highlighter = await getHighlighter();
  return highlighter.codeToHtml(code, { lang, 'theme': theme as never });
}
