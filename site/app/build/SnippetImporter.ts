/**
 * Resolves `<<< @/relative/path#region` directives in raw markdown into
 * real fenced code blocks, sourced directly from the referenced file on
 * disk. Mirrors VitePress's "Import Code Snippets" syntax so docs authors
 * can embed real, drift-proof source rather than hand-typed paraphrases.
 *
 * Runs during `content:file:beforeParse`, before Nuxt Content's markdown
 * parser sees the file. Resolution occurs during the Nuxt build, so no
 * filesystem access reaches the generated client application.
 */
import { readFileSync, realpathSync } from 'node:fs';
import { extname, isAbsolute, relative, resolve, sep, win32 } from 'node:path';

import { SNIPPET_IMPORTER_CONSTANTS } from './constants/SnippetImporterConstants';

class SnippetImporter {
  resolve(markdown: string, repositoryRoot: string): string {
    const resolvedMarkdown = markdown.replace(
      SNIPPET_IMPORTER_CONSTANTS.DIRECTIVE_PATTERN,
      (_match, relativePath: string, region?: string) => {
        const absolutePath = this.resolveSourcePath(repositoryRoot, relativePath);
        const source = readFileSync(absolutePath, 'utf-8');
        const snippet = region !== undefined
          ? this.extractRegion(source, region, relativePath)
          : source.trim();
        const language = SNIPPET_IMPORTER_CONSTANTS.LANGUAGE_BY_EXTENSION[extname(relativePath).slice(1)] ?? 'text';
        return `\`\`\`${language}\n${snippet}\n\`\`\``;
      }
    );
    return resolvedMarkdown;
  }

  private assertRepositoryDescendant(repositoryRoot: string, sourcePath: string): void {
    const pathFromRoot = relative(repositoryRoot, sourcePath);
    if (
      pathFromRoot.length === 0
      || pathFromRoot === '..'
      || pathFromRoot.startsWith(`..${sep}`)
      || isAbsolute(pathFromRoot)
    ) {
      throw new Error('SnippetImporter: source path must remain inside repository root');
    }
  }

  private dedent(lines: readonly string[]): string[] {
    const minimumIndent = lines.reduce((currentMinimum, line) => {
      if (line.trim().length === 0) {return currentMinimum;}
      const indentationMatch = SNIPPET_IMPORTER_CONSTANTS.INDENTATION_PATTERN.exec(line);
      const indentationLength = indentationMatch?.[0].length ?? 0;
      return Math.min(currentMinimum, indentationLength);
    }, Number.POSITIVE_INFINITY);
    const indentationLength = Number.isFinite(minimumIndent) ? minimumIndent : 0;
    return lines.map((line) => {
      const dedentedLine = line.slice(indentationLength);
      return dedentedLine;
    });
  }

  private extractRegion(source: string, region: string, relativePath: string): string {
    const lines = source.split('\n');
    const startIndex = lines.findIndex((line) => {
      const marker = SNIPPET_IMPORTER_CONSTANTS.REGION_PATTERN.exec(line);
      return marker?.[1] === region;
    });
    const endIndex = lines.findIndex((line) => {
      const marker = SNIPPET_IMPORTER_CONSTANTS.ENDREGION_PATTERN.exec(line);
      return marker?.[1] === region;
    });

    if (startIndex === -1 || endIndex === -1) {
      throw new Error(`SnippetImporter: region "${region}" not found in ${relativePath}`);
    }

    return this.dedent(lines.slice(startIndex + 1, endIndex)).join('\n').trim();
  }

  private resolveSourcePath(repositoryRoot: string, relativePath: string): string {
    let decodedPath: string;
    try {
      decodedPath = decodeURIComponent(relativePath);
    } catch {
      throw new Error('SnippetImporter: source path must be a valid repository-relative path');
    }

    const platformNeutralPath = decodedPath.split('\\').join('/');
    if (
      platformNeutralPath.includes('\0')
      || isAbsolute(platformNeutralPath)
      || win32.isAbsolute(platformNeutralPath)
    ) {
      throw new Error('SnippetImporter: source path must remain inside repository root');
    }

    const absoluteRepositoryRoot = resolve(repositoryRoot);
    const absoluteSourcePath = resolve(absoluteRepositoryRoot, platformNeutralPath);
    this.assertRepositoryDescendant(absoluteRepositoryRoot, absoluteSourcePath);

    const canonicalRepositoryRoot = realpathSync(absoluteRepositoryRoot);
    const canonicalSourcePath = realpathSync(absoluteSourcePath);
    this.assertRepositoryDescendant(canonicalRepositoryRoot, canonicalSourcePath);
    return canonicalSourcePath;
  }
}

export const snippetImporter = new SnippetImporter();
