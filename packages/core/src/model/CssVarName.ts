import { CSS_VAR_NAME_PATTERNS } from './constants/CssVarNamePatterns.ts';

/**
 * Maps a role name to a CSS custom property name.
 * CamelCase segments are kebab-cased; a configurable prefix is prepended.
 * Role names are unconstrained strings, so any run of characters outside
 * `[a-z0-9-]` is collapsed to a single `-` and leading/trailing dashes are
 * trimmed (this also removes the leading dash a capitalised first letter
 * produces, e.g. 'Background' -> 'background' rather than '-background');
 * a result starting with a digit is guarded with a leading `-`, since a
 * bare digit cannot open a CSS identifier segment. The result is always a
 * valid custom-property token.
 */
class CssVarName {
  /**
   * @example
   * CssVarName.from('primaryText', '--c-') // '--c-primary-text'
   * CssVarName.from('Background', '--c-') // '--c-background'
   * CssVarName.from('brand/500', '--c-') // '--c-brand-500'
   */
  static from(role: string, prefix: string): string {
    const kebab = role.replace(CSS_VAR_NAME_PATTERNS.uppercaseLetter, (match) => { const result = `-${match.toLowerCase()}`; return result; });
    const body = kebab
      .replace(CSS_VAR_NAME_PATTERNS.nonToken, '-')
      .replace(CSS_VAR_NAME_PATTERNS.repeatedDash, '-')
      .replace(CSS_VAR_NAME_PATTERNS.edgeDash, '');
    const safeBody = CSS_VAR_NAME_PATTERNS.leadingDigit.test(body) ? `-${body}` : body;
    return `${prefix}${safeBody}`;
  }
}

export { CssVarName };
