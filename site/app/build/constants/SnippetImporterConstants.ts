export const SNIPPET_IMPORTER_CONSTANTS = Object.freeze({
  'DIRECTIVE_PATTERN': /^<<<\s*@\/(\S+?)(?:#(\S+))?\s*$/gm,
  'INDENTATION_PATTERN': /^\s*/,
  'LANGUAGE_BY_EXTENSION': Object.freeze<Record<string, string>>({
    'json': 'json',
    'md': 'md',
    'mjs': 'js',
    'ts': 'ts',
    'vue': 'vue',
    'yaml': 'yaml',
    'yml': 'yaml'
  })
});
