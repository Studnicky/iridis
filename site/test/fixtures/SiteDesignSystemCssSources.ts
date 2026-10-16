import { readdirSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

export class SiteDesignSystemCssSources {
  static readonly ENGINE_COLOR_TOKEN_FALLBACK = /var\(--ui-[-a-zA-Z0-9]+\s*,/u;
  static readonly CSS_COMMENT = /\/\*[\s\S]*?\*\//gu;
  static readonly FORBIDDEN_APP_CONFIG_COLOR_FALLBACK = /\b(?:white|gray-\d+)\b/u;
  static readonly PRIMARY_CONTRAST_CLASS = /text-\[var\(--ui-primary-contrast\)\]/u;
  static readonly RAW_COLOR_MIX_ENDPOINT = /color-mix\([^;]*(?:\bwhite\b|\bblack\b)/iu;
  static readonly VUE_STYLE_BLOCK = /<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/gu;

  static collect(directory: string, root = directory): readonly (readonly [string, string])[] {
    const sources: (readonly [string, string])[] = [];
    for (const entry of readdirSync(directory, { 'withFileTypes': true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        sources.push(...SiteDesignSystemCssSources.collect(path, root));
        continue;
      }
      if (!entry.name.endsWith('.css') && !entry.name.endsWith('.vue')) {continue;}
      const source = readFileSync(path, 'utf8');
      let css = source;
      if (entry.name.endsWith('.vue')) {
        css = '';
        for (const match of source.matchAll(SiteDesignSystemCssSources.VUE_STYLE_BLOCK)) {
          css += `${match[1] ?? ''}\n`;
        }
      }
      if (css.trim().length > 0) {
        sources.push([relative(root, path), css]);
      }
    }
    sources.sort();
    return sources;

  }
}
