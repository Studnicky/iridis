export const SNIPPET_IMPORTER_CONSTANTS = Object.freeze({
  'DIRECTIVE_PATTERN': /^<<<\s*@\/(\S+?)(?:#(\S+))?\s*$/gm,
  /**
   * Captures the name of a `// #endregion <name>` marker. Hardcoded rather
   * than interpolating the requested region into a pattern, so a region name
   * can never contribute regex syntax.
   */
  'ENDREGION_PATTERN': /\/\/\s*#endregion\s+(\S+)/,
  'INDENTATION_PATTERN': /^\s*/,
  'LANGUAGE_BY_EXTENSION': Object.freeze<Record<string, string>>({
    'json': 'json',
    'md': 'md',
    'mjs': 'js',
    'ts': 'ts',
    'vue': 'vue',
    'yaml': 'yaml',
    'yml': 'yaml'
  }),
  /** Captures the name of a `// #region <name>` marker. See ENDREGION_PATTERN. */
  'REGION_PATTERN': /\/\/\s*#region\s+(\S+)/
});
