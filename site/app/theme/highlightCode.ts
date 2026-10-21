import type { HighlighterGeneric } from 'shiki';

import { createHighlighter } from 'shiki';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';

import { SUPPORTED_LANGS } from './supportedLangs.ts';
import { ThemeRegistrationEntity } from './ThemeRegistrationEntity.ts';

let highlighterPromise: Promise<HighlighterGeneric<never, never>> | null = null;

/** Lazy singleton for the site's JavaScript-regex Shiki highlighter. */
class Highlighter {
  static get(): Promise<HighlighterGeneric<never, never>> {
    highlighterPromise ??= createHighlighter({
      'engine': createJavaScriptRegexEngine(),
      'langs':  [...SUPPORTED_LANGS],
      'themes': []
    }).catch((error: Error) => {
      highlighterPromise = null;
      throw error;
    });
    const result = highlighterPromise;
    return result;
  }
}

/** Highlights code using the live VS Code theme emitted by Iridis. */
class HighlightCodeOperation {
  static async run(code: string, language: string, theme: object): Promise<string> {
    const registration = ThemeRegistrationEntity.intake(theme);
    const highlighter = await Highlighter.get();
    const html = highlighter.codeToHtml(code, {
      'lang': language,
      'theme': registration,
      // A zero limit keeps cold regex compilation on a slow machine from truncating tokens.
      'tokenizeTimeLimit': 0
    });
    return html;
  }
}

export const highlightCode = HighlightCodeOperation.run;
