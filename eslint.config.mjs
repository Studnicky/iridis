import { plugin, v8Plugin } from '@studnicky/eslint-config';
import stylistic from '@stylistic/eslint-plugin';
import importX from 'eslint-plugin-import-x';
import perfectionistPlugin from 'eslint-plugin-perfectionist';
import regexp from 'eslint-plugin-regexp';
import unusedImports from 'eslint-plugin-unused-imports';
import vue from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';
import vueEslintParser from 'vue-eslint-parser';

export default [
  { ignores: ['**/dist/**', '**/node_modules/**', '**/*.d.ts', 'site/.nuxt/**', 'site/.output/**'] },
  ...tseslint.config(
    {
      'files': ['packages/*/src/**/*.ts', 'site/app/**/*.ts'],
      'languageOptions': {
        'parser': tseslint.parser,
        'parserOptions': {
          'projectService': true,
          'tsconfigRootDir': import.meta.dirname
        }
      },
      'linterOptions': {
        'reportUnusedDisableDirectives': 'error'
      },
      'plugins': {
        '@studnicky': plugin,
        '@studnicky/v8': v8Plugin,
        '@stylistic': stylistic,
        'import-x': importX,
        'perfectionist': perfectionistPlugin,
        'regexp': regexp,
        'unused-imports': unusedImports,
        '@typescript-eslint': tseslint.plugin
      },
      'rules': {
        // @studnicky custom rules
        '@studnicky/entity-namespace': 'error',
        '@studnicky/interface-must-be-contract': 'error',
        '@studnicky/no-bind-apply-call': 'error',
        '@studnicky/no-export-alias': 'error',
        '@studnicky/no-freestanding-verb-noun': 'error',
        '@studnicky/no-prefer-existing-type': 'error',
        '@studnicky/no-readonly-in-data-type': 'error',
        '@studnicky/no-suppression-comments': 'error',
        '@studnicky/no-this-alias': 'error',
        '@studnicky/no-trivial-shim': 'error',
        '@studnicky/no-type-aliasing': 'error',
        '@studnicky/prefer-collection-types': 'warn',
        '@studnicky/require-options-object': 'error',
        '@studnicky/single-export': 'error',
        '@studnicky/type-alias-must-end-type': 'error',
        // @studnicky/v8 optimisation rules
        '@studnicky/v8/arguments-object': 'error',
        '@studnicky/v8/array-from-iterators': 'error',
        '@studnicky/v8/computed-class-properties': 'error',
        '@studnicky/v8/computed-object-properties': 'error',
        '@studnicky/v8/define-property': 'error',
        '@studnicky/v8/delete-property': 'error',
        '@studnicky/v8/eval-function': 'error',
        '@studnicky/v8/for-in-loops': 'error',
        '@studnicky/v8/for-of-arrays': 'error',
        '@studnicky/v8/no-concat-in-loops': 'error',
        '@studnicky/v8/no-spread-in-loops': 'error',
        '@studnicky/v8/prototype-modification': 'error',
        '@studnicky/v8/regexp-in-loops': 'error',
        '@studnicky/v8/switch-statements': 'error',
        '@studnicky/v8/try-catch-in-loops': 'error',
        '@studnicky/v8/with-statement': 'error',
        // @stylistic
        '@stylistic/comma-dangle': ['error', 'never'],
        '@stylistic/eol-last': ['error', 'always'],
        '@stylistic/indent': ['error', 2],
        '@stylistic/no-trailing-spaces': 'error',
        '@stylistic/quote-props': ['error', 'always'],
        '@stylistic/quotes': ['error', 'single', { 'avoidEscape': true }],
        '@stylistic/semi': ['error', 'always'],
        // @typescript-eslint — auto-fixable set
        '@typescript-eslint/array-type': ['error', { 'default': 'array' }],
        '@typescript-eslint/await-thenable': 'error',
        '@typescript-eslint/consistent-type-exports': 'error',
        '@typescript-eslint/consistent-type-imports': ['error', { 'fixStyle': 'separate-type-imports' }],
        '@typescript-eslint/dot-notation': 'error',
        '@typescript-eslint/naming-convention': [
          'error',
          {
            'custom': { 'match': true, 'regex': 'Interface$' },
            'format': ['PascalCase'],
            'selector': 'interface'
          },
          {
            'format': ['PascalCase'],
            'selector': 'typeAlias'
          }
        ],
        '@typescript-eslint/no-duplicate-type-constituents': 'error',
        '@typescript-eslint/no-explicit-any': ['error', { 'fixToUnknown': true }],
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/no-inferrable-types': 'error',
        '@typescript-eslint/no-meaningless-void-operator': 'error',
        '@typescript-eslint/no-misused-promises': 'error',
        '@typescript-eslint/no-redundant-type-constituents': 'error',
        '@typescript-eslint/no-unnecessary-type-assertion': 'error',
        '@typescript-eslint/no-unnecessary-type-constraint': 'error',
        '@typescript-eslint/no-unsafe-assignment': 'error',
        '@typescript-eslint/no-unused-vars': ['error', {
          'argsIgnorePattern': '^_',
          'varsIgnorePattern': '^(_|[A-Z][A-Za-z]*Schema$|[A-Za-z]*Interface$|[A-Za-z]*Type$)'
        }],
        '@typescript-eslint/no-useless-empty-export': 'error',
        '@typescript-eslint/non-nullable-type-assertion-style': 'error',
        '@typescript-eslint/prefer-as-const': 'error',
        '@typescript-eslint/prefer-function-type': 'error',
        '@typescript-eslint/prefer-nullish-coalescing': 'error',
        '@typescript-eslint/prefer-optional-chain': 'error',
        '@typescript-eslint/require-await': 'error',
        '@typescript-eslint/return-await': ['error', 'always'],
        '@typescript-eslint/strict-boolean-expressions': ['error', {
          'allowNullableObject': false,
          'allowNumber': false,
          'allowString': false
        }],
        // Core
        'arrow-body-style': ['error', 'always'],
        'consistent-return': 'error',
        'curly': ['error', 'all'],
        'eqeqeq': ['error', 'always'],
        // import-x
        'import-x/newline-after-import': 'error',
        'import-x/no-default-export': 'error',
        'no-array-constructor': 'error',
        'no-case-declarations': 'error',
        'no-class-assign': 'error',
        'no-cond-assign': ['error', 'always'],
        'no-console': 'error',
        'no-const-assign': 'error',
        'no-constant-condition': 'error',
        'no-debugger': 'error',
        'no-duplicate-case': 'error',
        'no-duplicate-imports': ['error', { 'allowSeparateTypeImports': true }],
        'no-else-return': ['error', { 'allowElseIf': false }],
        'no-eq-null': 'error',
        'no-eval': 'error',
        'no-extra-bind': 'error',
        'no-func-assign': 'error',
        'no-global-assign': 'error',
        'no-implicit-coercion': 'error',
        'no-implicit-globals': 'error',
        'no-invalid-regexp': 'error',
        'no-lonely-if': 'error',
        'no-multi-assign': 'error',
        'no-nested-ternary': 'error',
        'no-new-func': 'error',
        'no-new-wrappers': 'error',
        'no-object-constructor': 'error',
        'no-prototype-builtins': 'error',
        'no-template-curly-in-string': 'error',
        'no-throw-literal': 'error',
        'no-unexpected-multiline': 'error',
        'no-unreachable': 'error',
        'no-unsafe-negation': 'error',
        'no-unused-expressions': 'error',
        'no-var': 'error',
        'object-shorthand': ['error', 'never'],
        'one-var': ['error', 'never'],
        'perfectionist/sort-array-includes': ['error', { 'order': 'asc', 'type': 'natural' }],
        'perfectionist/sort-classes': 'off',
        'perfectionist/sort-decorators': ['error', { 'order': 'asc', 'type': 'natural' }],
        'perfectionist/sort-enums': 'error',
        'perfectionist/sort-exports': 'error',
        'perfectionist/sort-heritage-clauses': ['error', { 'order': 'asc', 'type': 'natural' }],
        'perfectionist/sort-imports': 'error',
        'perfectionist/sort-interfaces': 'error',
        'perfectionist/sort-intersection-types': ['error', { 'order': 'asc', 'type': 'natural' }],
        'perfectionist/sort-maps': ['error', { 'order': 'asc', 'type': 'natural' }],
        'perfectionist/sort-modules': 'off',
        'perfectionist/sort-named-exports': 'error',
        'perfectionist/sort-named-imports': 'error',
        'perfectionist/sort-object-types': 'error',
        'perfectionist/sort-objects': 'error',
        'perfectionist/sort-sets': ['error', { 'order': 'asc', 'type': 'natural' }],
        'perfectionist/sort-switch-case': ['error', { 'order': 'asc', 'type': 'natural' }],
        'perfectionist/sort-union-types': 'off',
        'perfectionist/sort-variable-declarations': ['error', { 'order': 'asc', 'type': 'natural' }],
        'prefer-const': 'error',
        'prefer-rest-params': 'error',
        'prefer-spread': 'error',
        'prefer-template': 'error',
        // regexp
        'regexp/no-unused-capturing-group': 'error',
        'regexp/no-useless-flag': 'error',
        'regexp/prefer-regexp-exec': 'error',
        'require-yield': 'error',
        // unused-imports
        'unused-imports/no-unused-imports': 'error'
      }
    },
    // Test files — parse with TS parser (no type-checking) and relax rules
    {
      'files': ['packages/*/tests/**/*.ts', 'site/test/**/*.ts'],
      'languageOptions': {
        'parser': tseslint.parser,
        'parserOptions': {
          'project': false
        }
      },
      'rules': {
        '@studnicky/no-trivial-shim': 'off',
        '@studnicky/single-export': 'off',
        '@studnicky/v8/for-of-arrays': 'off',
        '@typescript-eslint/consistent-type-exports': 'off',
        '@typescript-eslint/consistent-type-imports': 'off',
        '@typescript-eslint/dot-notation': 'off',
        '@typescript-eslint/no-meaningless-void-operator': 'off',
        '@typescript-eslint/no-unnecessary-type-assertion': 'off',
        '@typescript-eslint/non-nullable-type-assertion-style': 'off',
        '@typescript-eslint/prefer-nullish-coalescing': 'off',
        '@typescript-eslint/prefer-optional-chain': 'off',
        '@typescript-eslint/return-await': 'off'
      }
    },
    // Config-file overrides — allow default exports in JS/TS config files.
    // Restricted to executable config extensions so JSON/YAML data files named
    // `*.config.json` are not pulled in and parsed as JavaScript.
    {
      'files': ['**/*.config.{js,cjs,mjs,ts,cts,mts}'],
      'rules': {
        '@studnicky/single-export': 'off',
        'import-x/no-default-export': 'off'
      }
    },
    // Vue SFC script blocks (Nuxt site) — default exports are the framework
    // contract (defineNuxtConfig, page/layout/component options).
    ...vue.configs['flat/recommended'],
    {
      'files': ['site/**/*.vue'],
      'languageOptions': {
        'parser': vueEslintParser,
        'parserOptions': {
          'extraFileExtensions': ['.vue'],
          'parser': tseslint.parser,
          'projectService': true,
          'tsconfigRootDir': import.meta.dirname
        }
      },
      'rules': {
        '@studnicky/single-export': 'off',
        'import-x/no-default-export': 'off',
        // 'index' is Nuxt's file-based-routing convention for a page's own
        // route (site/app/pages/index.vue); 'Histogram' is an established
        // single-word component name in this codebase.
        'vue/multi-word-component-names': ['error', { 'ignores': ['Histogram', 'index'] }]
      }
    }
  )
];
