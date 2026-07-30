import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import typescriptParser from '@typescript-eslint/parser'
import { ESLint } from 'eslint'
import vueParser from 'vue-eslint-parser'

import { IRIDIS_DESIGN_TOKENS, IRIDIS_DYNAMIC_CLASS_EXPRESSION_CONTRACTS, isKnownConditionalDynamicClassExpression, isKnownDynamicClassExpression } from './contracts.mjs'
import {
  collectDesignSystemClassNames,
  collectDesignSystemTokenNames,
  createPositioner,
  extractDesignSystemClassNames,
  extractDesignSystemTokenNames,
  getDesignSystemContexts,
  getDesignSystemEslintPlugin,
  validateDesignSystemUsage,
  validateDesignTokenUsage,
  validateDynamicClassUsage,
  validateStaticClassUsage
} from './index.mjs'
import { createVueDesignSystemLintConfig } from './profiles/vue.mjs'

const contract = new Map([
  ['statusClass', /^ui-code-block--(?:default|source|error)$/u],
  ['statusClasses', /^ui-code-block--(?:default|source|error)$/u],
  ['vm.statusClass', /^ui-code-block--(?:default|source|error)$/u],
  ['resolveStatusClass', /^ui-code-block--(?:default|source|error)$/u]
])

const classNames = new Set([
  'ui-code-block',
  'ui-code-block--default',
  'ui-code-block--source',
  'ui-code-block--error',
  'ui-tabs__button',
  'ui-tabs__button--active',
  'button-primary'
])

const assertSingleIssue = (issues, expectedMessage, expectedValue) => {
  assert.equal(issues.length, 1)
  assert.equal(issues[0].message, expectedMessage)
  assert.equal(issues[0].value, expectedValue)
}

const lintVueSource = async (code) => {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: [
      {
        languageOptions: {
          parser: vueParser,
          parserOptions: {parser: typescriptParser}
        },
        ...createVueDesignSystemLintConfig({classNames, dynamicClassExpressionContracts: contract})
      }
    ]
  })
  const [result] = await eslint.lintText(code, {filePath: 'src/Component.vue'})
  return result.messages
}

const run = async () => {
  const testDir = path.dirname(fileURLToPath(import.meta.url))
  const fixtureCss = path.join(testDir, '..', '..', '..', 'site', 'app', 'assets', 'css', 'main.css')

  const extracted = extractDesignSystemClassNames('.button-primary { color: red } .ui-code-block--source {}')
  assert.ok(extracted.has('button-primary'))
  assert.ok(extracted.has('ui-code-block--source'))

  const siteClassNames = await collectDesignSystemClassNames([fixtureCss])
  assert.ok(siteClassNames.has('glass'))
  assert.ok(siteClassNames.has('iridis-card'))

  const extractedTokens = extractDesignSystemTokenNames('.card { color: var(--ui-text); --ui-bg: #fff; }')
  assert.ok(extractedTokens.has('--ui-bg'))

  const siteTokens = await collectDesignSystemTokenNames([fixtureCss])
  assert.ok(siteTokens.has('--iridis-radius-md'))

  const staticText = '<div class="ui-code-block ui-code-block--source"></div>'
  assert.equal(validateStaticClassUsage(staticText, classNames).length, 0)

  const staticUnknownText = '<div class="ui-code-block typo-class"></div>'
  const staticIssues = validateStaticClassUsage(staticUnknownText, classNames)
  assertSingleIssue(staticIssues, 'Unknown design-system class: typo-class', 'typo-class')

  const dynamicText = 'status.className = statusClass(snapshot)'
  const dynamicUnknownText = 'status.className = status(snapshot)'
  const dynamicIssuesKnown = validateDynamicClassUsage(dynamicText, contract, classNames)
  assert.equal(dynamicIssuesKnown.length, 0)
  const dynamicVmText = 'status.className = vm.statusClass'
  const dynamicVmIssues = validateDynamicClassUsage(dynamicVmText, contract, classNames)
  assert.equal(dynamicVmIssues.length, 0)
  const dynamicIssuesUnknown = validateDynamicClassUsage(dynamicUnknownText, contract, classNames)
  assertSingleIssue(dynamicIssuesUnknown, 'Unknown dynamic class expression: status(snapshot)', 'status(snapshot)')

  const dynamicNestedText = "status.className = status ? 'ok' : 'fail'"
  assert.equal(validateDynamicClassUsage(dynamicNestedText, contract, classNames).length, 1)

  const vueDynamicText = "{class: statusClasses}"
  assert.equal(validateDynamicClassUsage(vueDynamicText, contract, classNames, {
    frameworks: ['runtime']
  }).length, 0)

  const runtimeDynamicText = 'status.className = statusClass(snapshot)'
  assert.equal(validateDynamicClassUsage(runtimeDynamicText, contract, classNames, {
    frameworks: ['runtime']
  }).length, 0)
  assert.throws(
    () => {
      validateDynamicClassUsage(runtimeDynamicText, contract, classNames, {
        frameworks: ['unsupported-framework']
      })
    },
    {
      name: 'Error',
      message: 'Unsupported design-system validation context(s): unsupported-framework'
    }
  )

  const conditional = 'snapshot.canSubmit ? "ui-code-block ui-code-block--source" : "ui-code-block"'
  assert.equal(isKnownConditionalDynamicClassExpression(conditional, classNames), true)
  assert.equal(isKnownDynamicClassExpression(conditional, contract, classNames), true)

  const classListText = 'el.classList.add("button-primary typo-class", "ui-code-block")'
  const classListIssues = validateDynamicClassUsage(classListText, contract, classNames)
  assertSingleIssue(classListIssues, 'Unknown dynamic class expression: typo-class', 'typo-class')

  const contexts = getDesignSystemContexts()
  assert.deepEqual(contexts.frameworks, ['vue'])
  assert.deepEqual(contexts.runtimeContexts, ['runtime'])
  assert.deepEqual(contexts.templateFormats, ['html'])

  const htmlUsage = validateDesignSystemUsage({
    text: '<div class="typo-class"></div>',
    designSystemClassNames: classNames,
    dynamicClassExpressionContracts: contract,
    frameworks: ['html']
  })
  assertSingleIssue(htmlUsage.staticIssues, 'Unknown design-system class: typo-class', 'typo-class')

  const positionSource = '<div>\n  <span class="typo-class"></span>'
  const locate = createPositioner(positionSource)
  assert.equal(locate(6).line, 2)
  assert.equal(locate(6).column, 1)

  const packageUsage = validateDesignSystemUsage({
    text: '<div class="ui-code-block"></div><script>status.className = vm.statusClass;</script>',
    designSystemClassNames: classNames,
    dynamicClassExpressionContracts: contract
  })
  assert.equal(packageUsage.staticIssues.length, 0)
  assert.equal(packageUsage.dynamicIssues.length, 0)
  assert.equal(packageUsage.isValid, true)

  const plugin = getDesignSystemEslintPlugin({classNames, dynamicClassExpressionContracts: contract})
  assert.equal(plugin.plugins['design-system-contracts'].rules['known-class-names'] !== undefined, true)
  assert.equal(plugin.plugins['design-system-contracts'].rules['known-design-tokens'] !== undefined, true)
  assert.equal(plugin.rules['design-system-contracts/known-class-names'], 'error')
  assert.equal(plugin.rules['design-system-contracts/known-dynamic-class-expr'], 'error')
  assert.equal(plugin.rules['design-system-contracts/known-design-tokens'], 'error')

  // --- known-design-tokens: pure-function coverage ---

  const literalColorIssues = validateDesignTokenUsage('.card { color: #ff00aa; }', IRIDIS_DESIGN_TOKENS)
  assertSingleIssue(literalColorIssues, 'Literal color value; use a design-system token: #ff00aa', '#ff00aa')

  const rgbColorIssues = validateDesignTokenUsage('.card { background: rgb(10, 20, 30); }', IRIDIS_DESIGN_TOKENS)
  assert.equal(rgbColorIssues.some((issue) => issue.message.startsWith('Literal color value')), true)

  const undefinedTokenIssues = validateDesignTokenUsage('.card { color: var(--dagonizer-fg); }', IRIDIS_DESIGN_TOKENS)
  assertSingleIssue(undefinedTokenIssues, 'Unknown design-system token: --dagonizer-fg', '--dagonizer-fg')

  const definedTokenUsage = validateDesignTokenUsage('.card { color: var(--ui-text); }', IRIDIS_DESIGN_TOKENS)
  assert.equal(definedTokenUsage.length, 0)

  const fallbackIssues = validateDesignTokenUsage('.card { color: var(--ui-text, #000); }', IRIDIS_DESIGN_TOKENS)
  assert.equal(fallbackIssues.some((issue) => issue.message.startsWith('Design-system token fallback')), true)

  const borderStyleIssues = validateDesignTokenUsage('.card { border: 1px solid #000; }', IRIDIS_DESIGN_TOKENS)
  assert.equal(borderStyleIssues.some((issue) => issue.message.startsWith('Hardcoded border style')), true)

  const radiusIssues = validateDesignTokenUsage('.card { border-radius: 12px; }', IRIDIS_DESIGN_TOKENS)
  assert.equal(radiusIssues.some((issue) => issue.message.startsWith('Hardcoded border-radius')), true)

  const cleanTokenUsage = validateDesignTokenUsage(
    '.card { border: var(--iridis-border-style) var(--ui-border); border-radius: var(--iridis-radius-md); color: var(--ui-text); }',
    IRIDIS_DESIGN_TOKENS
  )
  assert.equal(cleanTokenUsage.length, 0)

  // --- known-design-tokens: ESLint rule, catches a literal hex color ---

  const tokenEslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: [
      {
        files: ['**/*.vue'],
        languageOptions: {
          parser: vueParser,
          parserOptions: {parser: typescriptParser}
        },
        ...getDesignSystemEslintPlugin({designTokens: IRIDIS_DESIGN_TOKENS, rules: ['known-design-tokens']})
      }
    ]
  })
  const [tokenResult] = await tokenEslint.lintText(
    '<template><div class="card" /></template>\n<style>\n.card { color: #ff00aa; border-radius: 8px; }\n</style>\n',
    {filePath: 'src/Card.vue'}
  )
  assert.ok(tokenResult.messages.some((message) => message.message.includes('#ff00aa')))
  assert.ok(tokenResult.messages.some((message) => message.message.includes('Hardcoded border-radius')))

  // --- known-class-names / known-dynamic-class-expr: Vue AST, native parser ---

  const vueClassMessages = await lintVueSource('<template><div :class="unapprovedClass"></div></template>')
  assert.equal(vueClassMessages.some(({message}) => message.includes('unapprovedClass')), true)

  const vueKnownMessages = await lintVueSource('<template><div class="ui-code-block ui-code-block--source"></div></template>')
  assert.equal(vueKnownMessages.length, 0)

  const vueTemplateLiteralMessages = await lintVueSource(
    '<template><div :class="`ui-code-block--${statusClass}`"></div></template>'
  )
  assert.equal(vueTemplateLiteralMessages.every(({message}) => !message.includes('statusClass')), true)

  // --- iridis contracts fixture sanity ---

  assert.ok(IRIDIS_DYNAMIC_CLASS_EXPRESSION_CONTRACTS.get('tone').test('source'))
  assert.equal(IRIDIS_DYNAMIC_CLASS_EXPRESSION_CONTRACTS.get('tone').test('unknown-tone'), false)
}

await run()
