/**
 * Maps a role name to a CSS custom property name.
 * CamelCase segments are kebab-cased; a configurable prefix is prepended.
 *
 * @example
 * toCssVarName('primaryText', '--c-') // '--c-primary-text'
 */
export function toCssVarName(role: string, prefix: string): string {
  const kebab = role.replace(/([A-Z])/g, (m) => `-${m.toLowerCase()}`);
  return `${prefix}${kebab}`;
}
