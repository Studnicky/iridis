import fs from 'node:fs/promises'

// `_` is deliberately in the character class alongside `-`: BEM
// `block__element` class names (iridis's own naming convention — see the
// README's layer-policy note) are common, and `_` is a \w character. Without
// it here, the trailing `\b` can still anchor on the non-word/word boundary
// at a `-`/letter transition *before* the first `_`, silently truncating
// `ui-tabs__button` down to `ui-`.
const CLASS_NAME_PATTERN = /\b[a-zA-Z][a-zA-Z0-9_-]*\b/gu

const DESIGN_SYSTEM_SUPPORTED_FRAMEWORKS = new Set(['vue'])
const DESIGN_SYSTEM_RUNTIME_CONTEXTS = new Set(['runtime'])
const DESIGN_SYSTEM_SUPPORTED_TEMPLATE_FORMATS = new Set(['html'])
const DESIGN_SYSTEM_CONTEXTS = new Set([
  ...DESIGN_SYSTEM_SUPPORTED_FRAMEWORKS,
  ...DESIGN_SYSTEM_RUNTIME_CONTEXTS,
  ...DESIGN_SYSTEM_SUPPORTED_TEMPLATE_FORMATS
])
const NORMALIZED_DESIGN_SYSTEM_CONTEXTS = Object.freeze({
  frameworks: Object.freeze([...DESIGN_SYSTEM_SUPPORTED_FRAMEWORKS]),
  runtimeContexts: Object.freeze([...DESIGN_SYSTEM_RUNTIME_CONTEXTS]),
  templateFormats: Object.freeze([...DESIGN_SYSTEM_SUPPORTED_TEMPLATE_FORMATS])
})

export const getDesignSystemContexts = () => NORMALIZED_DESIGN_SYSTEM_CONTEXTS

const getContextCandidate = (value) => {
  if (typeof value !== 'string') {
    return null
  }
  const key = value.trim().toLowerCase()
  return key === '' ? null : key
}

const CLASS_EXTRACTOR_PATTERNS = [
  {pattern: /\b(?:class|className)\s*=\s*["'`]([^"'`]+)["'`]/gu, frameworks: null},
  {pattern: /\b(?:class|className)\s*:\s*["']([^"']+)["']/gu, frameworks: null},
  {pattern: /\b(?:class|className)\s*=\s*`([^`]+)`/gu, frameworks: null},
  {pattern: /\b(?:\[class\]|\[className\]|:class|v-bind:class)\s*=\s*["'`]([^"'`]+)["'`]/gu, frameworks: ['vue']}
]
const INTERPOLATED_CLASS_EXTRACTORS = [
  {pattern: /\b(?:class|className)\s*=\s*\{\s*`([^`]+)`\s*\}/gu, frameworks: ['runtime']},
  {pattern: /\b(?:class|className)\s*=\s*`([^`]+)`/gu, frameworks: ['runtime']},
  {pattern: /\b(?:class|className)\s*=\s*["'`]([^"'`]*\$\{[^"'`]+\}[^"'`]*)["'`]/gu, frameworks: ['vue']},
  {pattern: /\b(?:\[class\]|\[className\]|:class|v-bind:class)\s*=\s*(?!["'`])([^\s>]+?)(?=\s|>|$)/gu, frameworks: ['vue']},
  {pattern: /\b(?:class|className)\s*:\s*(?!["'`])([^,}]+)/gu, frameworks: ['runtime']},
  {pattern: /\b(?:\w+\.)?(?:className|class)\s*=(?!=)\s*(?!["'`])([^;\n]+)/gu, frameworks: ['runtime']}
]
const CLASS_LIST_PATTERN = /\bclassList\.(?:add|remove|toggle)\(([^)]*)\)/gu
const QUOTED_CLASS_PATTERN = /["'`]([^"'`]+)["'`]/gu
const TEMPLATE_EXPRESSION_PATTERN = /\$\{([^}]+)\}/gu

// `["'\`]?` before the colon: a JS object literal defining a custom
// property inline (`'--bubble-drift': ...`, common for per-instance
// `:style` bindings) closes its key with a quote that sits *between* the
// token name and the colon — plain `\s*` never reaches past it.
const CSS_TOKEN_DEFINITION_PATTERN = /(--[-a-zA-Z0-9]+)["'`]?\s*:/gu
// Captures everything up to the next `,`/`)` rather than just the leading
// run of valid name characters — a `var(--ui-color-${role}-500)` computed
// token name needs to be recognized (and skipped, see validateDesignTokenUsage)
// rather than silently truncated to `--ui-color-`.
const CSS_TOKEN_REFERENCE_PATTERN = /var\((--[^,)]+)/gu
const CSS_TOKEN_FALLBACK_PATTERN = /var\(--[-a-zA-Z0-9]+\s*,/gu
const CSS_LITERAL_COLOR_PATTERN = /#[\da-f]{3,8}\b|(?:rgb|hsl)a?\(/giu
// `(?<!-)` guards both patterns against matching inside a *custom property
// name* that happens to contain the word (e.g. `--iridis-border-style` is a
// token *definition*, not a hardcoded `border-style:` declaration — without
// the guard, `\b` alone is satisfied by the `-`/`b` boundary inside
// `iridis-border-style`).
const CSS_HARDCODED_BORDER_STYLE_PATTERN = /(?<!-)\b(?:border(?:-[a-z]+)?|outline):[^;]*\b(?:dashed|dotted|solid)\b/giu
const CSS_HARDCODED_RADIUS_PATTERN = /(?<!-)\bborder(?:-[a-z-]+)?-radius:\s*[1-9][\d.]*(?:em|px|rem)\b/giu
const CSS_BLOCK_COMMENT_PATTERN = /\/\*[\s\S]*?\*\//gu

// Blanks out /* ... */ comment bodies (preserving length and line breaks, so
// reported offsets/positions still land correctly) before token validation
// runs — a CSS variable mentioned in a doc comment (e.g. explaining the
// general `var(--x, fallback)` pattern) is not a real usage.
const stripCssComments = (text) => text.replace(
  CSS_BLOCK_COMMENT_PATTERN,
  (comment) => comment.replaceAll(/[^\n]/gu, ' ')
)

const normalizeFrameworks = (frameworks) => {
  if (frameworks == null) {
    return null
  }
  const configured = new Set()
  if (typeof frameworks === 'string') {
    const context = getContextCandidate(frameworks)
    if (context === null) {
      return null
    }
    if (!DESIGN_SYSTEM_CONTEXTS.has(context)) {
      throw new Error(`Unsupported design-system validation context: ${context}`)
    }
    configured.add(context)
  } else if (typeof frameworks[Symbol.iterator] === 'function') {
    const unknown = new Set()
    for (const framework of frameworks) {
      if (typeof framework === 'string') {
        const key = getContextCandidate(framework)
        if (key === null) {
          continue
        }
        if (!DESIGN_SYSTEM_CONTEXTS.has(key)) {
          unknown.add(key)
        } else {
          configured.add(key)
        }
      }
    }
    if (unknown.size > 0) {
      throw new Error(`Unsupported design-system validation context(s): ${[...unknown].join(', ')}`)
    }
  } else {
    return null
  }
  return configured.size === 0 ? null : configured
}

const shouldApplyPattern = (patternFrameworks, configuredFrameworks) => {
  if (patternFrameworks === null) {
    return true
  }
  if (configuredFrameworks === null || configuredFrameworks.size === 0) {
    return true
  }
  return patternFrameworks.some((framework) => configuredFrameworks.has(framework))
}

const toSet = (value) => {
  if (value instanceof Set) {
    return value
  }
  if (Array.isArray(value)) {
    return new Set(value)
  }
  if (value && typeof value === 'object') {
    return new Set(Object.values(value).flatMap((entry) => [...entry]))
  }
  return new Set()
}

const STYLE_BLOCK_PATTERN = /<style\b[^>]*>([\s\S]*?)<\/style>/gu

// Vue SFCs mix <style> CSS with <script>/<template> JS and markup in one
// file; scanning the whole file for `.identifier` would also match property
// access (`.forEach`, `.value`) and numeric CSS-value fragments (`.5rem`) as
// if they were class selectors. When the source contains <style> tags, only
// their contents are scanned; plain .css files (no <style> tags) are scanned
// in full, unchanged.
const cssRegionsOf = (source) => {
  const blocks = [...source.matchAll(STYLE_BLOCK_PATTERN)]
  if (blocks.length === 0) {
    return source
  }
  return blocks.map((block) => block[1]).join('\n')
}

export const extractDesignSystemClassNames = (cssText) => {
  const classNames = new Set()
  for (const match of cssRegionsOf(cssText).matchAll(/\.([a-zA-Z0-9_-]+)/gu)) {
    classNames.add(match[1])
  }
  return classNames
}

export const collectDesignSystemClassNames = async (paths) => {
  const classNames = new Set()
  for (const source of paths) {
    const content = await fs.readFile(source, 'utf8')
    for (const candidate of extractDesignSystemClassNames(content)) {
      classNames.add(candidate)
    }
  }
  return classNames
}

export const extractDesignSystemTokenNames = (cssText) => {
  const tokenNames = new Set()
  for (const match of cssText.matchAll(CSS_TOKEN_DEFINITION_PATTERN)) {
    tokenNames.add(match[1])
  }
  return tokenNames
}

export const collectDesignSystemTokenNames = async (paths) => {
  const tokenNames = new Set()
  for (const source of paths) {
    const content = await fs.readFile(source, 'utf8')
    for (const candidate of extractDesignSystemTokenNames(content)) {
      tokenNames.add(candidate)
    }
  }
  return tokenNames
}

const toDynamicContracts = (dynamicContractsInput) => {
  if (dynamicContractsInput instanceof Map) {
    return new Map(dynamicContractsInput)
  }
  return new Map(Object.entries(dynamicContractsInput ?? {}))
}

export const normalizeDynamicClassExpression = (expression) => expression.trim().replaceAll(/\s+/gu, '')

export const extractDynamicExpressionBase = (expression) => {
  const normalized = normalizeDynamicClassExpression(expression)
  const functionCallMatch = normalized.match(/^([a-zA-Z_$][\w$.]*)\(/u)
  if (functionCallMatch?.[1] !== undefined) {
    return functionCallMatch[1]
  }
  // `prop ?? 'default'` is a standard nullish-fallback default for a prop —
  // the base being validated is the identifier/property path, not the
  // string literal fallback tacked onto it.
  const nullishFallbackMatch = normalized.match(/^([a-zA-Z_$][\w$.]*)\?\?["'`]/u)
  if (nullishFallbackMatch?.[1] !== undefined) {
    return nullishFallbackMatch[1]
  }
  return normalized
}

export const isKnownConditionalDynamicClassExpression = (expression, allClassNames) => {
  const matches = [...expression.matchAll(/["'`]([^"'`]+)["'`]/gu)]
  if (matches.length === 0) {
    return false
  }
  return matches.every((match) => {
    const raw = match?.[1] ?? ''
    const tokens = raw.split(/\s+/).filter(Boolean)
    return tokens.length > 0 && tokens.every((token) => allClassNames.has(token))
  })
}

export const isKnownDynamicClassExpression = (expression, dynamicExpressionContracts, allClassNames) => {
  if (expression.includes('?') && expression.includes(':')) {
    return isKnownConditionalDynamicClassExpression(expression, allClassNames)
  }

  const base = extractDynamicExpressionBase(expression)
  return dynamicExpressionContracts.has(base)
}

const createIssueFromMatch = (label, value, sourceIndex, options) => {
  const lineColumn = options.positionFromOffset?.(sourceIndex) ?? null
  const labelText = {
    class: 'Unknown design-system class',
    dynamicClassExpression: 'Unknown dynamic class expression',
    undefinedToken: 'Unknown design-system token',
    literalColor: 'Literal color value; use a design-system token',
    tokenFallback: 'Design-system token fallback is not permitted',
    hardcodedBorderStyle: 'Hardcoded border style; use a design-system token',
    hardcodedRadius: 'Hardcoded border-radius; use a design-system token'
  }[label]
  return {
    message: `${labelText}: ${value}`,
    value,
    index: sourceIndex,
    ...(lineColumn === null ? {} : {loc: lineColumn})
  }
}

const deduplicateIssues = (issues) => [...new Map(
  issues.map((issue) => [`${issue.index}:${issue.message}`, issue])
).values()]

export const validateStaticClassUsage = (text, classNames, options = {}) => {
  const issues = []
  const configuredFrameworks = normalizeFrameworks(options.frameworks)
  for (const {pattern} of CLASS_EXTRACTOR_PATTERNS.filter(({frameworks}) => shouldApplyPattern(
    frameworks,
    configuredFrameworks
  ))) {
    for (const match of text.matchAll(pattern)) {
      const raw = match[1] ?? ''
      for (const tokenMatch of raw.matchAll(CLASS_NAME_PATTERN)) {
        const token = tokenMatch[0] ?? ''
        if (
          token.includes('${') ||
          token.includes('{{') ||
          token.includes('?') ||
          token.includes(':') ||
          token.startsWith('http')
        ) {
          continue
        }
        if (!token.includes('-')) {
          continue
        }
        if (!classNames.has(token)) {
          issues.push(createIssueFromMatch('class', token, match.index ?? 0, options))
        }
      }
    }
  }
  return deduplicateIssues(issues)
}

export const validateDynamicClassUsage = (
  text,
  dynamicExpressionContracts,
  knownClassNames,
  options = {}
) => {
  const issues = []
  const contracts = toDynamicContracts(dynamicExpressionContracts)
  const configuredFrameworks = normalizeFrameworks(options.frameworks)
  const addIssue = (expression, sourceIndex) => {
    issues.push(createIssueFromMatch('dynamicClassExpression', expression, sourceIndex, options))
  }

  for (const {pattern} of INTERPOLATED_CLASS_EXTRACTORS.filter(({frameworks}) => shouldApplyPattern(
    frameworks,
    configuredFrameworks
  ))) {
    for (const match of text.matchAll(pattern)) {
      const expression = match[1]?.trim() ?? ''
      if (expression === '') {
        continue
      }

      if (expression.includes('${')) {
        for (const exprMatch of expression.matchAll(TEMPLATE_EXPRESSION_PATTERN)) {
          const nested = exprMatch[1]?.trim() ?? ''
          if (nested === '') {
            continue
          }
          if (!isKnownDynamicClassExpression(nested, contracts, knownClassNames)) {
            addIssue(nested, match.index ?? 0)
          }
        }
        continue
      }

      if (!isKnownDynamicClassExpression(expression, contracts, knownClassNames)) {
        addIssue(expression, match.index ?? 0)
      }
    }
  }

  if (shouldApplyPattern(['runtime'], configuredFrameworks)) {
    for (const match of text.matchAll(CLASS_LIST_PATTERN)) {
      for (const argMatch of match[1]?.matchAll(QUOTED_CLASS_PATTERN) ?? []) {
        const raw = argMatch[1] ?? ''
        const rawTokens = raw.split(/\s+/).filter(Boolean)
        for (const token of rawTokens) {
          if (!token.includes('-')) {
            continue
          }
          if (!knownClassNames.has(token)) {
            addIssue(token, argMatch.index ?? 0)
          }
        }
      }
    }
  }

  return deduplicateIssues(issues)
}

export const validateDesignSystemUsage = ({
  text,
  designSystemClassNames,
  dynamicClassExpressionContracts = new Map(),
  frameworks
}) => {
  const staticIssues = validateStaticClassUsage(text, designSystemClassNames, {
    positionFromOffset: null,
    frameworks
  })
  const dynamicIssues = validateDynamicClassUsage(
    text,
    dynamicClassExpressionContracts,
    designSystemClassNames,
    {frameworks}
  )
  return {
    staticIssues,
    dynamicIssues,
    isValid: staticIssues.length === 0 && dynamicIssues.length === 0
  }
}

export const validateDesignTokenUsage = (text, definedTokens, options = {}) => {
  const issues = []
  const configuredTokens = toSet(definedTokens)
  const strippedText = stripCssComments(text)

  if (configuredTokens.size > 0) {
    // A token counts as known if it's globally configured OR defined
    // somewhere in this same file — a component-local custom property
    // (e.g. `--bubble-drift`, set via an inline `:style` binding and only
    // ever consumed by that same component's own scoped styles) is never
    // going to appear in a global design-token allowlist, and shouldn't
    // need to.
    const knownTokens = new Set([...configuredTokens, ...extractDesignSystemTokenNames(strippedText)])
    for (const match of strippedText.matchAll(CSS_TOKEN_REFERENCE_PATTERN)) {
      const token = match[1]
      if (token.includes('${')) {
        continue // computed token name (e.g. `--ui-color-${role}-500`) — not statically verifiable
      }
      if (!knownTokens.has(token)) {
        issues.push(createIssueFromMatch('undefinedToken', token, match.index ?? 0, options))
      }
    }
  }
  for (const match of strippedText.matchAll(CSS_TOKEN_FALLBACK_PATTERN)) {
    issues.push(createIssueFromMatch('tokenFallback', match[0], match.index ?? 0, options))
  }
  for (const match of strippedText.matchAll(CSS_LITERAL_COLOR_PATTERN)) {
    issues.push(createIssueFromMatch('literalColor', match[0], match.index ?? 0, options))
  }
  for (const match of strippedText.matchAll(CSS_HARDCODED_BORDER_STYLE_PATTERN)) {
    issues.push(createIssueFromMatch('hardcodedBorderStyle', match[0], match.index ?? 0, options))
  }
  for (const match of strippedText.matchAll(CSS_HARDCODED_RADIUS_PATTERN)) {
    issues.push(createIssueFromMatch('hardcodedRadius', match[0], match.index ?? 0, options))
  }

  return deduplicateIssues(issues)
}

export const createPositioner = (text) => {
  const lineBreaks = [0]
  for (let index = 0; index < text.length; index += 1) {
    if (text.charAt(index) === '\n') {
      lineBreaks.push(index + 1)
    }
  }
  return (offset) => {
    let line = 1
    for (let i = 0; i < lineBreaks.length; i += 1) {
      if (offset < (lineBreaks[i] ?? 0)) {
        break
      }
      line = i + 1
    }
    const lineStart = lineBreaks[line - 1] ?? 0
    return {line, column: offset - lineStart + 1}
  }
}

const getSourceCodeFromContext = (context) => {
  if (typeof context.getSourceCode === 'function') {
    return context.getSourceCode()
  }
  return context.sourceCode ?? null
}

const resolveSourceText = (sourceCode) => {
  if (sourceCode == null) {
    return ''
  }
  return sourceCode.text ?? ''
}

const getPositionFromOffset = (sourceCode) => {
  if (typeof sourceCode?.getLocFromIndex !== 'function') {
    return undefined
  }
  return (offset) => {
    try {
      return sourceCode.getLocFromIndex(offset)
    } catch {
      return null
    }
  }
}

const createIssueReporter = (context, sourceCodeText) => {
  const sourceCode = getSourceCodeFromContext(context)
  const resolveFromOffset = sourceCode?.getLocFromIndex
  const fallbackPositioner = sourceCodeText == null || sourceCodeText === '' ? null : createPositioner(sourceCodeText)

  return (issue) => {
    const fallbackLoc = fallbackPositioner === null
      ? null
      : {
        start: fallbackPositioner(issue.index),
        end: fallbackPositioner(issue.index)
      }

    const loc = issue.loc === undefined
      ? resolveFromOffset === undefined
        ? fallbackLoc
        : {
          start: resolveFromOffset(issue.index),
          end: resolveFromOffset(issue.index)
        }
      : issue.loc.start === undefined
        ? {start: issue.loc, end: issue.loc}
        : issue.loc
    const reportConfig = {
      message: issue.message,
      ...(loc === null ? {} : {loc})
    }

    if (loc === null && sourceCode?.ast === undefined && context.ast !== undefined) {
      reportConfig.node = context.ast
    } else if (sourceCode?.ast !== undefined) {
      reportConfig.node = sourceCode.ast
    }

    context.report(reportConfig)
  }
}

const getStaticClassIssues = (value, classNames) => validateStaticClassUsage(
  `<div class="${value}"></div>`,
  classNames,
  {frameworks: ['html']}
)

const getNodeStringValue = (node) => {
  if (typeof node?.value === 'string') {
    return node.value
  }
  if (typeof node?.data === 'string') {
    return node.data
  }
  if (typeof node?.raw === 'string') {
    return node.raw
  }
  return null
}

const createAstReporter = (context, sourceCode, classNames, dynamicContracts, kind) => {
  const reportIssues = (node, issues) => {
    for (const issue of issues) {
      context.report({node, message: issue.message})
    }
  }
  const reportStatic = (node, value) => {
    if (kind === 'dynamic') {
      return
    }
    reportIssues(node, getStaticClassIssues(value, classNames))
  }
  const reportDynamic = (node, expression) => {
    if (kind === 'static' || expression === '' || isKnownDynamicClassExpression(expression, dynamicContracts, classNames)) {
      return
    }
    reportIssues(node, [createIssueFromMatch('dynamicClassExpression', expression, 0, {})])
  }
  const sourceText = (node) => {
    if (typeof node?.source === 'string') {
      return node.source
    }
    if (typeof node?.name === 'string' && node.type === 'Identifier') {
      return node.name
    }
    if (Array.isArray(node?.range) && typeof sourceCode.text === 'string') {
      return sourceCode.getText(node)
    }
    return ''
  }

  const reportExpression = (node) => {
    if (node == null) {
      return
    }
    const stringValue = getNodeStringValue(node)
    if (stringValue !== null) {
      reportStatic(node, stringValue)
      return
    }
    if (node.type === 'TemplateLiteral') {
      for (const quasi of node.quasis) {
        reportStatic(node, quasi.value.cooked ?? quasi.value.raw)
      }
      for (const expression of node.expressions) {
        reportExpression(expression)
      }
      return
    }
    if (node.type === 'ArrayExpression') {
      for (const element of node.elements) {
        reportExpression(element)
      }
      return
    }
    if (node.type === 'ObjectExpression') {
      for (const property of node.properties) {
        if (property.type === 'Property' && property.computed === false) {
          reportExpression(property.key)
          continue
        }
        reportDynamic(property, sourceText(property))
      }
      return
    }
    reportDynamic(node, sourceText(node))
  }

  return {reportDynamic, reportExpression, reportStatic, sourceText}
}

const isClassBinding = (name) => name === 'class' || name === 'className'

const getVueAttributeName = (node) => {
  if (node.directive === true && node.key?.name?.name === 'bind') {
    return node.key.argument?.name ?? null
  }
  // A directive key's name is itself a VIdentifier node (`key.name.name`).
  // A plain (non-directive) attribute's key IS the VIdentifier — its name
  // is the string directly (`key.name`). Without this branch, a plain
  // `class="..."` attribute's name resolves to `undefined` (`"class".name`
  // on a string is `undefined`, not a further nested `.name`), so it's
  // silently never recognized as a class binding at all — and once some
  // *other* element's `:class` sets `state.handled`, the regex fallback
  // that would otherwise have caught it is suppressed too.
  if (node.directive === false) {
    return node.key?.name ?? null
  }
  return null
}

const createVueTemplateVisitors = (state, reporter) => ({
  VAttribute: (node) => {
    if (!isClassBinding(getVueAttributeName(node))) {
      return
    }
    state.handled = true
    reporter.reportExpression(node.value?.expression ?? node.value)
  }
})

const NATIVE_DESIGN_SYSTEM_VISITORS = {
  vue: createVueTemplateVisitors
}

const getParserServices = (context, sourceCode) => context.parserServices ?? sourceCode.parserServices ?? null

const createNativeRuleVisitors = (context, sourceCode, framework, classNames, dynamicContracts, kind, validate) => {
  const state = {classNames, handled: false}
  const reporter = createAstReporter(context, sourceCode, classNames, dynamicContracts, kind)
  const nativeFactory = NATIVE_DESIGN_SYSTEM_VISITORS[framework]
  if (nativeFactory === undefined) {
    return {
      'Program:exit': () => {
        validate()
      }
    }
  }
  const nativeVisitors = nativeFactory(state, reporter)
  const fallbackVisitors = {
    'Program:exit': () => {
      if (!state.handled) {
        validate()
      }
    }
  }
  const parserServices = getParserServices(context, sourceCode)
  if (framework === 'vue' && typeof parserServices?.defineTemplateBodyVisitor === 'function') {
    return parserServices.defineTemplateBodyVisitor(nativeVisitors, fallbackVisitors)
  }
  return {...nativeVisitors, ...fallbackVisitors}
}

export const createDesignSystemPlugin = ({
  classNames,
  dynamicClassExpressionContracts = new Map(),
  frameworks,
  designTokens
}) => {
  const classSet = toSet(classNames)
  const dynamicContracts = toDynamicContracts(dynamicClassExpressionContracts)
  const resolvedFrameworks = normalizeFrameworks(frameworks)
  const tokenSet = toSet(designTokens)

  return {
    rules: {
      'known-class-names': {
        meta: {
          type: 'problem',
          docs: {
            description: 'Verify that class usage is covered by design-system tokens.'
          },
          schema: []
        },
        create: (context) => {
          const sourceCode = getSourceCodeFromContext(context)
          const sourceText = resolveSourceText(sourceCode)
          const positionFromOffset = getPositionFromOffset(sourceCode)
          const createStaticIssues = (text) => validateStaticClassUsage(text, classSet, {
            ...(positionFromOffset === undefined ? {} : {positionFromOffset}),
            frameworks: resolvedFrameworks
          })
          const validate = () => {
            const text = sourceText === '' ? context.sourceCodeText ?? '' : sourceText
            const reportIssue = createIssueReporter(context, text)
            for (const issue of createStaticIssues(text)) {
              reportIssue(issue)
            }
          }
          const [framework] = resolvedFrameworks ?? []
          return createNativeRuleVisitors(
            context,
            sourceCode,
            framework,
            classSet,
            dynamicContracts,
            'static',
            validate
          )
        }
      },
      'known-dynamic-class-expr': {
        meta: {
          type: 'problem',
          docs: {
            description: 'Verify that dynamic class expressions are covered by contracts.'
          },
          schema: []
        },
        create: (context) => {
          const sourceCode = getSourceCodeFromContext(context)
          const sourceText = resolveSourceText(sourceCode)
          const positionFromOffset = getPositionFromOffset(sourceCode)
          const createDynamicIssues = (text) => validateDynamicClassUsage(
            text,
            dynamicContracts,
            classSet,
            {
              ...(positionFromOffset === undefined ? {} : {positionFromOffset}),
              frameworks: resolvedFrameworks
            }
          )
          const validate = () => {
            const text = sourceText === '' ? context.sourceCodeText ?? '' : sourceText
            const reportIssue = createIssueReporter(context, text)
            for (const issue of createDynamicIssues(text)) {
              reportIssue(issue)
            }
          }
          const [framework] = resolvedFrameworks ?? []
          return createNativeRuleVisitors(
            context,
            sourceCode,
            framework,
            classSet,
            dynamicContracts,
            'dynamic',
            validate
          )
        }
      },
      'known-design-tokens': {
        meta: {
          type: 'problem',
          docs: {
            description: 'Verify CSS custom-property usage matches the design-system token contract (no literal colors, fallbacks, or hardcoded border/radius chrome).'
          },
          schema: []
        },
        create: (context) => {
          const sourceCode = getSourceCodeFromContext(context)
          const sourceText = resolveSourceText(sourceCode)
          const positionFromOffset = getPositionFromOffset(sourceCode)
          return {
            'Program:exit': () => {
              const text = sourceText === '' ? context.sourceCodeText ?? '' : sourceText
              const reportIssue = createIssueReporter(context, text)
              const issues = validateDesignTokenUsage(text, tokenSet, {
                ...(positionFromOffset === undefined ? {} : {positionFromOffset})
              })
              for (const issue of issues) {
                reportIssue(issue)
              }
            }
          }
        }
      }
    }
  }
}

const DESIGN_SYSTEM_RULE_IDS = ['known-class-names', 'known-dynamic-class-expr', 'known-design-tokens']

export const getDesignSystemEslintPlugin = ({
  classNames,
  dynamicClassExpressionContracts = new Map(),
  frameworks,
  designTokens,
  rules = DESIGN_SYSTEM_RULE_IDS
}) => {
  const enabledRules = {}
  for (const ruleId of rules) {
    enabledRules[`design-system-contracts/${ruleId}`] = 'error'
  }
  return {
    plugins: {
      'design-system-contracts': createDesignSystemPlugin({
        classNames,
        dynamicClassExpressionContracts,
        frameworks,
        designTokens
      })
    },
    rules: enabledRules
  }
}

export const createDesignSystemESLintRules = getDesignSystemEslintPlugin

export default createDesignSystemPlugin
