import type { HighlighterGeneric } from 'shiki';

import { createHighlighter } from 'shiki';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';

import type { SupportedLangType } from '../composables/types/supportedLang.ts';

import { SUPPORTED_LANGS } from './supportedLangs.ts';

let highlighterPromise: Promise<HighlighterGeneric<never, never>> | null = null;

/**
 * Lazy singleton — the JS regex engine (not the WASM/oniguruma one) avoids
 * shipping a wasm binary for a demo that only ever highlights four languages.
 * No themes are preloaded: every call supplies its own theme object (built
 * fresh from the live engine palette via emit:vscodeThemeJson), so there is
 * nothing stable to preload — see CodeBlock.vue.
 */
class Highlighter {
  static get(): Promise<HighlighterGeneric<never, never>> {
    highlighterPromise ??= createHighlighter({
      'engine': createJavaScriptRegexEngine(),
      'langs':  [...SUPPORTED_LANGS],
      'themes': []
    }).catch((e: unknown) => {
      // Clears the cache on failure so a transient init error (e.g. a momentary
      // dynamic-import/chunk failure) doesn't wedge highlighting for the rest
      // of the session — the next Highlighter.get() call retries from scratch
      // instead of reusing this rejected promise forever.
      highlighterPromise = null;
      throw e;
    });
    return highlighterPromise;
  }
}

/** Highlights `code` as `lang` using an arbitrary VS Code-shaped theme object (engine.run() output, not a static Shiki theme). */
export async function highlightCode(code: string, lang: SupportedLangType, theme: object): Promise<string> {
  const highlighter = await Highlighter.get();
  return highlighter.codeToHtml(code, { 'lang': lang, 'theme': theme as never });
}
