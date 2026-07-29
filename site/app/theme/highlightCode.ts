import type { HighlighterGeneric, RawThemeSetting, ThemeRegistration } from 'shiki';

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

class ThemeRegistrationOperation {
  private static isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  private static isSettings(value: unknown): value is RawThemeSetting['settings'] {
    return ThemeRegistrationOperation.isRecord(value)
      && (value.background === undefined || typeof value.background === 'string')
      && (value.fontStyle === undefined || typeof value.fontStyle === 'string')
      && (value.foreground === undefined || typeof value.foreground === 'string');
  }

  private static isStringRecord(value: unknown): value is Record<string, string> {
    return ThemeRegistrationOperation.isRecord(value)
      && Object.values(value).every((member) => {return typeof member === 'string';});
  }

  private static isThemeSetting(value: unknown): value is RawThemeSetting {
    if (!ThemeRegistrationOperation.isRecord(value)) {return false;}
    const scope = value.scope;
    const scopeValid = scope === undefined
      || typeof scope === 'string'
      || (Array.isArray(scope) && scope.every((member) => {return typeof member === 'string';}));
    return (value.name === undefined || typeof value.name === 'string')
      && scopeValid
      && ThemeRegistrationOperation.isSettings(value.settings);
  }

  private static isThemeSettings(value: unknown): value is RawThemeSetting[] {
    return Array.isArray(value) && value.every(ThemeRegistrationOperation.isThemeSetting);
  }

  private static colors(value: unknown): Record<string, string> | undefined {
    if (value === undefined) {return undefined;}
    if (ThemeRegistrationOperation.isStringRecord(value)) {return value;}
    throw new TypeError('VS Code theme colors must contain only string values');
  }

  private static mode(value: unknown): 'dark' | 'light' | undefined {
    if (value === undefined) {return undefined;}
    if (value === 'dark' || value === 'hc-dark') {return 'dark';}
    if (value === 'light' || value === 'hc-light') {return 'light';}
    throw new TypeError('VS Code theme type must be dark, light, hc-dark, or hc-light');
  }

  private static name(value: unknown): string | undefined {
    if (value === undefined || typeof value === 'string') {return value;}
    throw new TypeError('VS Code theme name must be a string when present');
  }

  private static settings(value: unknown): RawThemeSetting[] | undefined {
    if (value === undefined) {return undefined;}
    if (ThemeRegistrationOperation.isThemeSettings(value)) {return [...value];}
    throw new TypeError('VS Code theme tokenColors must match the TextMate theme contract');
  }

  static run(theme: object): ThemeRegistration {
    if (!ThemeRegistrationOperation.isRecord(theme)) {
      throw new TypeError('VS Code theme must be an object');
    }
    const colors = ThemeRegistrationOperation.colors(theme.colors);
    const name = ThemeRegistrationOperation.name(theme.name);
    const settings = ThemeRegistrationOperation.settings(theme.tokenColors);
    const type = ThemeRegistrationOperation.mode(theme.type);
    return {
      ...(colors === undefined ? {} : { 'colors': colors }),
      ...(name === undefined ? {} : { 'name': name }),
      ...(settings === undefined ? {} : { 'settings': settings }),
      ...(type === undefined ? {} : { 'type': type })
    };
  }
}

/** Highlights `code` as `lang` using the live VS Code theme emitted by Iridis. */
class HighlightCodeOperation {
  static async run(code: string, lang: SupportedLangType.Type, theme: object): Promise<string> {
    const registration = ThemeRegistrationOperation.run(theme);
    const highlighter = await Highlighter.get();
    return highlighter.codeToHtml(code, {
      'lang': lang,
      'theme': registration
    });
  }
}

export const highlightCode = HighlightCodeOperation.run;
