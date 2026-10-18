import { readdirSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

import { SiteDesignSystemCssPatterns } from './SiteDesignSystemCssPatterns.ts';

export class SiteDesignSystemCssSources {
  static readonly CSS_COMMENT = SiteDesignSystemCssPatterns.CSS_COMMENT;
  static readonly ENGINE_COLOR_TOKEN_FALLBACK = SiteDesignSystemCssPatterns.ENGINE_COLOR_TOKEN_FALLBACK;
  static readonly FORBIDDEN_APP_CONFIG_COLOR_FALLBACK = SiteDesignSystemCssPatterns.FORBIDDEN_APP_CONFIG_COLOR_FALLBACK;
  static readonly PRIMARY_CONTRAST_CLASS = SiteDesignSystemCssPatterns.PRIMARY_CONTRAST_CLASS;
  static readonly RAW_COLOR_MIX_ENDPOINT = SiteDesignSystemCssPatterns.RAW_COLOR_MIX_ENDPOINT;
  static readonly VUE_STYLE_BLOCK = SiteDesignSystemCssPatterns.VUE_STYLE_BLOCK;

  static collect(directory: string, root = directory): readonly (readonly [string, string])[] {
    const sources: (readonly [string, string])[] = [];
    const entries = readdirSync(directory, { 'withFileTypes': true });
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index]!;
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
    sources.sort((left, right) => {
      const comparison = left[0].localeCompare(right[0]);
      return comparison;
    });
    return sources;
  }
}
