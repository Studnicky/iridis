// Lifted from vscode-arcade-blaster/dev/themes/tools/semanticTokens.ts:66-968

/**
 * SCOPE_MAPPINGS maps every semantic palette key to its TextMate grammar scopes.
 * Comprehensive coverage for all VS Code-supported languages plus fallbacks.
 *
 * The keys here are the SemanticPaletteInterface keys used by the arcade-blaster
 * SemanticPaletteInterface.  The emit:vscodeSemanticRules task projects the 23
 * derived base-token colours onto these scopes to produce tokenColors[].
 */
export const SCOPE_MAPPINGS: Readonly<Record<string, readonly string[]>> = {

  'attribute': [
    // Generic attributes
    'entity.other.attribute',
    'meta.attribute',

    /*
     * HTML/XML attributes handled by tagAttribute
     * Python decorators
     */
    'entity.name.function.decorator.python',
    // Rust attributes
    'meta.attribute.rust',
    'punctuation.definition.attribute.rust',
    // C# attributes
    'meta.attribute.csharp',
    // Java annotations
    'storage.type.annotation.java',
    // Go struct tags
    'entity.other.attribute-name.go',
  ],

  'boolean': [
    'constant.language.boolean',
    'constant.language.true',
    'constant.language.false',
    // YAML booleans
    'constant.language.boolean.yaml',
    // TOML booleans
    'constant.language.boolean.toml',
    // JSON booleans
    'constant.language.json',
    // Shell
    'constant.language.boolean.shell',
  ],

  'bracket': [
    'punctuation.definition.block',
    'punctuation.definition.parameters',
    'punctuation.section',
    'meta.brace',
    'punctuation.brackets',
    // Specific brackets
    'punctuation.definition.arguments',
    'punctuation.parenthesis',
    'punctuation.squarebracket',
    'punctuation.curlybrace',
    // Language-specific
    'punctuation.section.block.begin',
    'punctuation.section.block.end',
    'punctuation.section.parens',
    'meta.brace.curly',
    'meta.brace.round',
    'meta.brace.square',
  ],

  'builtin': [
    'support.function.builtin',
    'support.type.builtin',
    'entity.name.function.builtin',
    // Python builtins
    'support.function.builtin.python',
    'support.type.python',
    // JavaScript/TypeScript
    'support.function.console',
    'support.class.builtin',
    'support.type.builtin.ts',
    // Shell builtins
    'support.function.builtin.shell',
    // Go builtins
    'support.function.builtin.go',
    // Rust std
    'entity.name.function.std.rust',
    // PHP builtins
    'support.function.construct.php',
    // Ruby builtins
    'support.function.kernel.ruby',
  ],

  'class': [
    'entity.name.type.class',
    'entity.name.class',
    'entity.other.inherited-class',
    'support.class',
    // Language-specific
    'entity.name.type.class.python',
    'entity.name.type.class.java',
    'entity.name.type.class.php',
    'entity.name.type.class.ruby',
    'entity.name.type.class.csharp',
    'entity.name.type.class.cpp',
    'meta.class entity.name.type',
    // Struct (C/Go/Rust)
    'entity.name.type.struct',
    'entity.name.struct',
  ],

  'comment': [
    'comment',
    'comment.line',
    'comment.block',
    'punctuation.definition.comment',
    // Language-specific
    'comment.line.double-slash',
    'comment.line.number-sign',
    'comment.line.percentage',
    'comment.line.shebang',
    'comment.block.c',
    'comment.block.html',
    // Shell comments
    'comment.line.number-sign.shell',
    // SQL comments
    'comment.line.double-dash.sql',
    'comment.block.sql',
  ],

  'comparison': [
    'keyword.operator.comparison',
    'keyword.operator.relational',
    // Language-specific
    'keyword.operator.comparison.ts',
    'keyword.operator.comparison.python',
    'keyword.operator.comparison.go',
    'keyword.operator.comparison.rust',
  ],

  'constant': [
    'constant.language',
    'constant.other',
    'variable.other.constant',
    'entity.name.constant',
    'support.constant',
    // Language-specific constants
    'constant.language.null',
    'constant.language.undefined',
    'constant.language.nil',
    'constant.language.none',
    // YAML
    'constant.language.yaml',
    // Shell
    'constant.other.shell',
    // Rust
    'constant.other.caps.rust',
    // Go
    'constant.other.go',
    // PHP
    'constant.other.php',
    'support.constant.core.php',
  ],

  'control': [
    'keyword.control.flow',
    'keyword.control.return',
    'keyword.control.conditional',
    'keyword.control.loop',
    'keyword.control.exception',
    'keyword.control.import',
    // Language-specific
    'keyword.control.if',
    'keyword.control.else',
    'keyword.control.switch',
    'keyword.control.case',
    'keyword.control.for',
    'keyword.control.while',
    'keyword.control.do',
    'keyword.control.try',
    'keyword.control.catch',
    'keyword.control.finally',
    'keyword.control.throw',
    'keyword.control.break',
    'keyword.control.continue',
    'keyword.control.yield',
    // Shell
    'keyword.control.shell',
    // SQL
    'keyword.control.sql',
    // Rust
    'keyword.control.rust',
  ],

  'cssProperty': [
    'support.type.property-name.css',
    'meta.property-name.css',
    'support.type.vendored.property-name.css',
    // SCSS/SASS/LESS
    'support.type.property-name.scss',
    'support.type.property-name.sass',
    'support.type.property-name.less',
    'meta.property-name.scss',
    'support.type.property-name.media.css',
  ],

  'cssPseudo': [
    'entity.other.attribute-name.pseudo-class.css',
    'entity.other.attribute-name.pseudo-element.css',
    // SCSS
    'entity.other.attribute-name.pseudo-class.scss',
    'entity.other.attribute-name.pseudo-element.scss',
  ],

  'cssSelector': [
    'entity.other.attribute-name.class.css',
    'entity.other.attribute-name.id.css',
    'entity.name.tag.css',
    // SCSS/SASS
    'entity.other.attribute-name.class.scss',
    'entity.other.attribute-name.id.scss',
    'entity.name.tag.scss',
    // LESS
    'entity.other.attribute-name.class.less',
    // Variables
    'variable.css',
    'variable.scss',
    // At-rules
    'keyword.control.at-rule.css',
    'keyword.control.at-rule.scss',
  ],

  'cssUnit': [
    'keyword.other.unit.css',
    'constant.numeric.css',
    // SCSS
    'keyword.other.unit.scss',
    'constant.numeric.scss',
  ],

  'cssValue': [
    'support.constant.property-value.css',
    'meta.property-value.css',
    'support.constant.color.css',
    // Functions
    'support.function.misc.css',
    'support.function.transform.css',
    'support.function.calc.css',
    // SCSS
    'support.constant.property-value.scss',
    'support.function.misc.scss',
  ],

  'decorator': [
    'meta.decorator',
    'entity.name.function.decorator',
    'punctuation.decorator',
    'meta.annotation',
    // Python decorators
    'entity.name.function.decorator.python',
    'meta.function.decorator.python',
    // TypeScript/JavaScript decorators
    'meta.decorator.ts',
    'meta.decorator.js',
    // Java annotations
    'meta.declaration.annotation.java',
    'punctuation.definition.annotation.java',
    // C# attributes
    'punctuation.squarebracket.open.cs',
    // Rust attributes
    'meta.attribute.rust',
  ],

  'deprecated': [
    'invalid.deprecated',
    'entity.name.function.deprecated',
    'entity.name.type.deprecated',
  ],

  'docComment': [
    'comment.block.documentation',
    'comment.line.documentation',
    'string.quoted.docstring',
    // Python docstrings
    'string.quoted.docstring.multi.python',
    // JSDoc/TSDoc
    'comment.block.documentation.js',
    'comment.block.documentation.ts',
    // Rust doc comments
    'comment.block.documentation.rust',
    'comment.line.documentation.rust',
    // Java/Kotlin doc
    'comment.block.javadoc',
    // Go doc
    'comment.line.documentation.go',
    // PHP doc
    'comment.block.documentation.phpdoc',
  ],

  'docKeyword': [
    'storage.type.class.jsdoc',
    'keyword.other.documentation',
    'variable.other.jsdoc',
    // JSDoc/TSDoc tags
    'punctuation.definition.block.tag.jsdoc',
    'entity.name.tag.inline.jsdoc',
    // PHPDoc tags
    'keyword.other.phpdoc.php',
    // Rust doc
    'entity.name.tag.documentation.rust',
    // Java doc
    'keyword.other.documentation.javadoc',
  ],

  'enum': [
    'entity.name.type.enum',
    'support.type.enum',
    // Language-specific
    'entity.name.type.enum.ts',
    'entity.name.type.enum.rust',
    'entity.name.type.enum.go',
    'entity.name.type.enum.java',
    'entity.name.type.enum.csharp',
  ],

  'enumMember': [
    'variable.other.enummember',
    'constant.other.enum',
    'entity.name.variable.enum-member',
    // Language-specific
    'variable.other.enummember.ts',
    'constant.other.enum.rust',
    'constant.other.enum.go',
  ],

  'escape': [
    'constant.character.escape',
    'punctuation.definition.template-expression',
    'punctuation.section.embedded',
    'meta.embedded.expression',
    // Template literals
    'punctuation.definition.template-expression.begin',
    'punctuation.definition.template-expression.end',
    // String interpolation
    'meta.string-contents.quoted.double',
    'punctuation.section.interpolation',
    // Shell
    'punctuation.definition.variable.shell',
    // Regex escapes
    'constant.character.escape.regexp',
  ],

  'function': [
    'entity.name.function',
    'meta.function-call entity.name.function',
    'support.function',
    'meta.function-call',
    // Language-specific
    'entity.name.function.python',
    'entity.name.function.go',
    'entity.name.function.rust',
    'entity.name.function.java',
    'entity.name.function.php',
    'entity.name.function.ruby',
    'entity.name.function.swift',
    'entity.name.function.kotlin',
    'entity.name.function.scala',
    'entity.name.function.c',
    'entity.name.function.cpp',
    // Shell functions
    'entity.name.function.shell',
    // SQL functions
    'support.function.sql',
    'entity.name.function.sql',
    // GraphQL
    'entity.name.function.graphql',
  ],

  'import': [
    'keyword.control.import',
    'keyword.control.from',
    'keyword.control.export',
    'keyword.other.import',
    'meta.import',
    // Language-specific
    'keyword.control.import.python',
    'keyword.control.from.python',
    'keyword.control.import.go',
    'keyword.control.import.java',
    'keyword.control.import.rust',
    'keyword.other.use.rust',
    'keyword.control.use.php',
    'keyword.control.require',
    // Module paths
    'entity.name.import',
    'entity.name.package.go',
  ],

  'interface': [
    'entity.name.type.interface',
    'entity.name.type.trait',
    'entity.name.type.protocol',
    // Language-specific
    'entity.name.type.interface.ts',
    'entity.name.type.interface.go',
    'entity.name.type.interface.java',
    'entity.name.type.interface.csharp',
    'entity.name.type.trait.rust',
    'entity.name.type.trait.php',
    'entity.name.type.protocol.swift',
  ],

  'invalid': [
    'invalid',
    'invalid.illegal',
    'invalid.broken',
    'invalid.unimplemented',
  ],

  'jsonKey': [
    'support.type.property-name.json',
    'meta.structure.dictionary.key.json',
    'string.json support.type.property-name',
    // JSONC (JSON with comments)
    'support.type.property-name.jsonc',
    // JSON5
    'support.type.property-name.json5',
  ],

  'jsonValue': [
    'string.quoted.double.json',
    'meta.structure.dictionary.value.json string',
    // JSONC
    'string.quoted.double.jsonc',
  ],

  'keyword': [
    'keyword',
    'keyword.control',
    'keyword.other',
    // Language-specific
    'keyword.operator.expression',
    'keyword.operator.typeof',
    'keyword.operator.instanceof',
    'keyword.operator.new',
    'keyword.operator.delete',
    'keyword.operator.in',
    'keyword.operator.of',
    // Rust
    'keyword.other.rust',
    // Go
    'keyword.go',
    // SQL
    'keyword.other.sql',
    // Shell
    'keyword.other.shell',
    // GraphQL
    'keyword.graphql',
  ],

  'library': [
    'support.type',
    'support.class',
    'support.function',
    'support.constant',
    // Language-specific libraries
    'support.class.component',
    'support.type.primitive',
    'support.type.object',
    // Browser APIs
    'support.class.dom',
    'support.type.dom',
    // Node.js
    'support.class.node',
    'support.module.node',
  ],

  'logical': [
    'keyword.operator.logical',
    'keyword.operator.ternary',
    // Language-specific
    'keyword.operator.logical.python',
    'keyword.operator.logical.go',
    'keyword.operator.or',
    'keyword.operator.and',
    'keyword.operator.not',
  ],

  'macro': [
    'entity.name.function.macro',
    'meta.preprocessor',
    'keyword.control.directive',
    // C/C++ preprocessor
    'keyword.control.directive.define',
    'keyword.control.directive.include',
    'keyword.control.directive.ifdef',
    'keyword.control.directive.ifndef',
    'keyword.control.directive.endif',
    'meta.preprocessor.include',
    'meta.preprocessor.macro',
    // Rust macros
    'entity.name.function.macro.rust',
    'entity.name.function.macro.rules.rust',
    'meta.macro.rust',
    // Make
    'keyword.control.makefile',
    'entity.name.function.target.makefile',
  ],

  'markdownBold': [
    'markup.bold',
    'punctuation.definition.bold.markdown',
    'markup.bold.markdown',
  ],

  'markdownCode': [
    'markup.inline.raw',
    'markup.fenced_code.block',
    'fenced_code.block.language',
    'markup.raw.block',
    'markup.inline.raw.string.markdown',
    'markup.raw.inline.markdown',
  ],

  'markdownHeading': [
    'markup.heading',
    'entity.name.section.markdown',
    'punctuation.definition.heading.markdown',
    'markup.heading.setext',
    'markup.heading.markdown',
  ],

  'markdownItalic': [
    'markup.italic',
    'punctuation.definition.italic.markdown',
    'markup.italic.markdown',
  ],

  'markdownLink': [
    'markup.underline.link',
    'string.other.link',
    'meta.link',
    'meta.link.inline.markdown',
    'meta.link.reference.markdown',
    'string.other.link.title.markdown',
  ],

  'markdownQuote': [
    'markup.quote',
    'punctuation.definition.quote.begin.markdown',
    'markup.quote.markdown',
  ],

  'method': [
    'entity.name.function.member',
    'meta.method-call entity.name.function',
    'support.function.method',
    // Language-specific
    'entity.name.function.method',
    'meta.method.declaration entity.name.function',
    'entity.name.function.method.python',
    'entity.name.function.method.go',
    'entity.name.function.method.rust',
    'entity.name.function.method.java',
  ],

  'modifier': [
    'storage.modifier',
    'storage.modifier.async',
    'keyword.other.await',
    'storage.type.modifier',
    // Access modifiers
    'storage.modifier.public',
    'storage.modifier.private',
    'storage.modifier.protected',
    'storage.modifier.static',
    'storage.modifier.final',
    'storage.modifier.abstract',
    'storage.modifier.readonly',
    'storage.modifier.volatile',
    // Language-specific
    'storage.modifier.ts',
    'storage.modifier.java',
    'storage.modifier.rust',
    'storage.modifier.go',
  ],

  'namespace': [
    'entity.name.namespace',
    'entity.name.module',
    'entity.name.package',
    'storage.modifier.package',
    // Language-specific
    'entity.name.namespace.cpp',
    'entity.name.namespace.csharp',
    'entity.name.namespace.php',
    'entity.name.module.rust',
    'entity.name.module.go',
    'entity.name.module.python',
    // XML namespace
    'entity.other.attribute-name.namespace.xml',
    // RDF namespace prefix
    'entity.name.namespace.prefix.turtle',
    'entity.name.namespace.prefix.sparql',
  ],

  'number': [
    'constant.numeric',
    'constant.numeric.integer',
    'constant.numeric.float',
    'constant.numeric.hex',
    'constant.numeric.octal',
    'constant.numeric.binary',
    // Language-specific
    'constant.numeric.decimal',
    'constant.numeric.integer.decimal',
    'constant.numeric.float.decimal',
    'constant.numeric.integer.hexadecimal',
    'constant.numeric.integer.octal',
    'constant.numeric.integer.binary',

    /*
     * CSS numbers handled by cssUnit
     * YAML
     */
    'constant.numeric.yaml',
    // TOML
    'constant.numeric.toml',
    // SQL
    'constant.numeric.sql',
  ],

  'operator': [
    'keyword.operator',
    'keyword.operator.assignment',
    'keyword.operator.arithmetic',
    'punctuation.accessor',
    // More operators
    'keyword.operator.increment',
    'keyword.operator.decrement',
    'keyword.operator.bitwise',
    'keyword.operator.spread',
    'keyword.operator.rest',
    'keyword.operator.nullish',
    'keyword.operator.optional',
    'keyword.operator.pipe',
    // Language-specific
    'keyword.operator.arrow',
    'keyword.operator.fat-arrow',
    'keyword.operator.type.annotation',
    'keyword.operator.rust',
    'keyword.operator.go',
  ],

  'parameter': [
    'variable.parameter',
    'meta.parameter',
    'entity.name.variable.parameter',
    // Language-specific
    'variable.parameter.function',
    'variable.parameter.ts',
    'variable.parameter.python',
    'variable.parameter.rust',
    'variable.parameter.go',
    'variable.parameter.java',
  ],

  'property': [
    'variable.other.property',
    'variable.other.object.property',
    'support.variable.property',
    'meta.object-literal.key',
    // Language-specific
    'variable.other.property.ts',
    'variable.other.property.python',
    'variable.other.member',
    'entity.name.variable.field',
    // YAML keys
    'entity.name.tag.yaml',
    // TOML keys
    'support.type.property-name.toml',
    // INI keys
    'keyword.other.definition.ini',
  ],

  'propertyReadonly': [
    'variable.other.property.readonly',
    'variable.other.constant.property',
    'variable.other.object.property.readonly',
  ],

  'punctuation': [
    'punctuation.definition',
    'punctuation.separator',
    'punctuation.terminator',
    'punctuation.accessor',
    // Specific punctuation
    'punctuation.separator.comma',
    'punctuation.terminator.statement',
    'punctuation.separator.colon',
    'punctuation.separator.period',
    'punctuation.accessor.optional',
    // Language-specific
    'punctuation.semi',
    'punctuation.separator.key-value',
    'punctuation.definition.generic',
    'punctuation.separator.namespace',
  ],

  'regexp': [
    'string.regexp',
    'keyword.operator.regexp',
    'punctuation.definition.group.regexp',
    // Regexp parts
    'constant.character.escape.regexp',
    'keyword.operator.quantifier.regexp',
    'keyword.operator.or.regexp',
    'punctuation.definition.character-class.regexp',
    'constant.other.character-class.regexp',
    'punctuation.definition.group.assertion.regexp',
  ],

  'storage': [
    'storage.type',
    'storage.type.function',
    'storage.type.class',
    'storage.type.interface',
    'storage.type.type',
    'keyword.operator.new',
    // Language-specific
    'storage.type.var',
    'storage.type.let',
    'storage.type.const',
    'storage.type.ts',
    'storage.type.rust',
    'storage.type.go',
    'storage.type.java',
    'storage.type.php',
    // Primitive types
    'storage.type.primitive',
    'storage.type.built-in',
    'storage.type.string',
    'storage.type.number',
    'storage.type.boolean',
  ],

  'string': [
    'string',
    'string.quoted',
    'string.template',
    'string.interpolated',
    'punctuation.definition.string',
    // Specific string types
    'string.quoted.single',
    'string.quoted.double',
    'string.quoted.triple',
    'string.quoted.backtick',
    // Language-specific
    'string.quoted.single.python',
    'string.quoted.double.python',
    'string.quoted.raw.python',
    'string.quoted.other.rust',
    'string.quoted.double.go',
    'string.quoted.raw.go',
    // YAML
    'string.unquoted.plain.out.yaml',
    'string.unquoted.plain.in.yaml',
    'string.quoted.single.yaml',
    'string.quoted.double.yaml',
    // TOML
    'string.quoted.single.basic.toml',
    'string.quoted.double.basic.toml',
    // Shell
    'string.quoted.single.shell',
    'string.quoted.double.shell',
    // SQL
    'string.quoted.single.sql',
    // XML/HTML CDATA
    'string.unquoted.cdata.xml',
  ],

  'tag': [
    'entity.name.tag',
    'punctuation.definition.tag',
    'meta.tag',
    // HTML/XML
    'entity.name.tag.html',
    'entity.name.tag.xml',
    'entity.name.tag.localname.xml',
    // JSX/TSX
    'entity.name.tag.jsx',
    'entity.name.tag.tsx',
    'support.class.component.jsx',
    'support.class.component.tsx',
    // Vue
    'entity.name.tag.vue',
    // Svelte
    'entity.name.tag.svelte',
    // RDF/XML
    'entity.name.tag.rdf',
    // XSLT
    'entity.name.tag.xsl',
  ],

  'tagAttribute': [
    'entity.other.attribute-name',
    'meta.attribute',
    // HTML/XML attributes
    'entity.other.attribute-name.html',
    'entity.other.attribute-name.xml',
    'entity.other.attribute-name.localname.xml',
    // JSX/TSX
    'entity.other.attribute-name.jsx',
    'entity.other.attribute-name.tsx',
    // Vue
    'entity.other.attribute-name.vue',
    // RDF attributes
    'entity.other.attribute-name.rdf',
  ],

  'tagPunctuation': [
    'punctuation.definition.tag.begin',
    'punctuation.definition.tag.end',
    'punctuation.definition.tag.html',
    'punctuation.definition.tag.xml',
    'meta.tag.punctuation.tag-close',
  ],

  'this': [
    'variable.language.this',
    'variable.language.self',
    'variable.language.super',
    // Language-specific
    'variable.language.this.ts',
    'variable.language.this.java',
    'variable.language.self.python',
    'variable.language.self.rust',
    'variable.language.self.ruby',
    'variable.language.this.php',
    'variable.language.special.self',
  ],

  'type': [
    'entity.name.type',
    'support.type',
    'entity.name.type.alias',
    'meta.type.annotation',
    // Language-specific
    'entity.name.type.ts',
    'entity.name.type.rust',
    'entity.name.type.go',
    'entity.name.type.java',
    'entity.name.type.swift',
    'entity.name.type.kotlin',
    // Primitive types
    'support.type.primitive',
    'storage.type.built-in.primitive',
    // RDF types
    'support.type.rdf',
    'entity.name.class.rdf',
    // GraphQL types
    'entity.name.type.graphql',
    'support.type.graphql',
  ],

  'typeParameter': [
    'entity.name.type.parameter',
    'meta.type.parameters',
    'storage.type.generic',
    // Language-specific
    'entity.name.type.parameter.ts',
    'entity.name.type.parameter.rust',
    'entity.name.type.parameter.java',
    'entity.name.type.parameter.go',
    'punctuation.definition.typeparameters',
  ],

  'variable': [
    'variable',
    'variable.other',
    'variable.other.readwrite',
    'meta.definition.variable',
    // Language-specific
    'variable.other.ts',
    'variable.other.python',
    'variable.other.rust',
    'variable.other.go',
    'variable.other.java',
    'variable.other.php',
    'variable.other.ruby',
    // Shell variables
    'variable.other.shell',
    'punctuation.definition.variable.shell',
    // SQL variables
    'variable.other.sql',
    // Makefile variables
    'variable.other.makefile',
    // SPARQL variables
    'variable.other.sparql',
    // GraphQL variables
    'variable.graphql',
    // Environment variables
    'variable.other.environment',
  ],

  'variableReadonly': [
    'variable.other.constant',
    'variable.other.readonly',
    'entity.name.constant',
    // Language-specific
    'variable.other.constant.ts',
    'variable.other.constant.rust',
    'variable.other.constant.go',
    'variable.other.constant.java',
    'variable.other.constant.ruby',
  ],

} as const;
