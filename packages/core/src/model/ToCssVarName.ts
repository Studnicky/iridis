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
 *
 * @example
 * toCssVarName('primaryText', '--c-') // '--c-primary-text'
 * toCssVarName('Background', '--c-') // '--c-background'
 * toCssVarName('brand/500', '--c-') // '--c-brand-500'
 */
export function toCssVarName(role: string, prefix: string): string {
  const kebab = role.replace(/[A-Z]/g, (m) => { const result = `-${m.toLowerCase()}`; return result; });
  const body = kebab
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '');
  const safeBody = /^[0-9]/.test(body) ? `-${body}` : body;
  return `${prefix}${safeBody}`;
}
