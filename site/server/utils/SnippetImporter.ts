/**
 * Resolves `<<< @/relative/path#region` directives in raw markdown into
 * real fenced code blocks, sourced directly from the referenced file on
 * disk. Mirrors VitePress's "Import Code Snippets" syntax so docs authors
 * can embed real, drift-proof source rather than hand-typed paraphrases.
 *
 * Runs during `content:file:beforeParse`, before Nuxt Content's markdown
 * parser sees the file — the substitution is plain string work on
 * `ContentFile.body`, so the resulting fence flows through the site's
 * existing ProsePre.vue -> CodeBlock.vue Shiki pipeline with no new
 * rendering path. Resolved once per file at `nuxt generate` time; nothing
 * reads the filesystem at request/runtime, so this is static-hosting safe.
 */
import { readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';

const DIRECTIVE_PATTERN = /^<<<\s*@\/(\S+?)(?:#(\S+))?\s*$/gm;

const LANG_BY_EXTENSION: Record<string, string> = {
  'json': 'json',
  'md': 'md',
  'mjs': 'js',
  'ts': 'ts',
  'vue': 'vue',
  'yaml': 'yaml',
  'yml': 'yaml',
};

class SnippetImporter {
  resolve(markdown: string, repoRoot: string): string {
    return markdown.replace(DIRECTIVE_PATTERN, (_match, relativePath: string, region?: string) => {
      const absolutePath = resolve(repoRoot, relativePath);
      const source = readFileSync(absolutePath, 'utf-8');
      const snippet = region ? this.extractRegion(source, region, relativePath) : source.trim();
      const lang = LANG_BY_EXTENSION[extname(relativePath).slice(1)] ?? 'text';
      return '```' + lang + '\n' + snippet + '\n```';
    });
  }

  private extractRegion(source: string, region: string, relativePath: string): string {
    const lines = source.split('\n');
    const startPattern = new RegExp(`//\\s*#region\\s+${region}\\b`);
    const endPattern = new RegExp(`//\\s*#endregion\\s+${region}\\b`);
    const startIndex = lines.findIndex((line) => startPattern.test(line));
    const endIndex = lines.findIndex((line) => endPattern.test(line));

    if (startIndex === -1 || endIndex === -1) {
      throw new Error(`SnippetImporter: region "${region}" not found in ${relativePath}`);
    }

    return this.dedent(lines.slice(startIndex + 1, endIndex)).join('\n').trim();
  }

  private dedent(lines: readonly string[]): string[] {
    const indents = lines.filter((line) => line.trim().length > 0).map((line) => line.match(/^\s*/)![0].length);
    const minIndent = indents.length > 0 ? Math.min(...indents) : 0;
    return lines.map((line) => line.slice(minIndent));
  }
}

export const snippetImporter = new SnippetImporter();
