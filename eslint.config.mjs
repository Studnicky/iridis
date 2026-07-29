import { entitySuite, HexagonalSuite, hygieneSuite, plugin, v8Plugin, v8Suite } from '@studnicky/eslint-config';
import stylistic from '@stylistic/eslint-plugin';
import importX from 'eslint-plugin-import-x';
import perfectionistPlugin from 'eslint-plugin-perfectionist';
import regexp from 'eslint-plugin-regexp';
import unusedImports from 'eslint-plugin-unused-imports';
import vue from 'eslint-plugin-vue';
import fs from 'node:fs';
import path from 'node:path';
import tseslint from 'typescript-eslint';
import vueEslintParser from 'vue-eslint-parser';

import { IRIDIS_DESIGN_TOKENS, IRIDIS_DYNAMIC_CLASS_EXPRESSION_CONTRACTS } from './packages/design-system-contracts/src/contracts.mjs';
import { collectDesignSystemClassNames, collectDesignSystemTokenNames, createDesignSystemPlugin } from './packages/design-system-contracts/src/index.mjs';

const layerImportBoundaryRule = plugin.rules['layer-import-boundary'];
const callableListeners = (listener) => {
  return Array.isArray(listener)
    ? listener.filter((candidate) => {
      return typeof candidate === 'function';
    })
    : typeof listener === 'function'
      ? [listener]
      : [];
};
const iridisPlugin = {
  ...plugin,
  'rules': {
    ...plugin.rules,
    'layer-import-boundary': {
      ...layerImportBoundaryRule,
      'create': (context) => {
        const listeners = layerImportBoundaryRule.create(context);
        const importDeclarationListeners = callableListeners(listeners.ImportDeclaration);
        if (
          importDeclarationListeners.length === 0
          || callableListeners(listeners.ImportExpression).length > 0
        ) {
          return listeners;
        }
        return {
          ...listeners,
          'ImportExpression': (node) => {
            for (const listener of importDeclarationListeners) {
              listener(node);
            }
          }
        };
      }
    }
  }
};

// Real package dependency graph, verified by grepping every cross-package
// `from '@studnicky/iridis*'` import under packages/*/src. Each package is
// its own hexagonal-architecture layer (packages/<name>/src/... resolves to
// layer <name> via sourceRoot: 'packages'); aliasPrefixes maps the published
// bare-specifier each package is imported by to that same layer name so
// layer-import-boundary can see cross-package imports, not just relative
// ones. Prefix keys are ordered longest-first so a hyphenated package name
// (e.g. '@studnicky/iridis-vscode') is never shadowed by the shorter
// '@studnicky/iridis' prefix.
const IRIDIS_LAYERS = [
  'core', 'algebra', 'anima', 'fsm', 'pulse', 'trajectory',
  'stylesheet', 'tailwind', 'vscode', 'contrast', 'capacitor',
  'image', 'rdf', 'shadcn', 'mui', 'chakra', 'panda', 'cli'
];

const IRIDIS_ALIAS_PREFIXES = {
  '@studnicky/iridis-algebra':    'algebra',
  '@studnicky/iridis-anima':      'anima',
  '@studnicky/iridis-capacitor':  'capacitor',
  '@studnicky/iridis-chakra':     'chakra',
  '@studnicky/iridis-cli':        'cli',
  '@studnicky/iridis-contrast':   'contrast',
  '@studnicky/iridis-fsm':        'fsm',
  '@studnicky/iridis-image':      'image',
  '@studnicky/iridis-mui':        'mui',
  '@studnicky/iridis-panda':      'panda',
  '@studnicky/iridis-pulse':      'pulse',
  '@studnicky/iridis-rdf':        'rdf',
  '@studnicky/iridis-shadcn':     'shadcn',
  '@studnicky/iridis-stylesheet': 'stylesheet',
  '@studnicky/iridis-tailwind':   'tailwind',
  '@studnicky/iridis-trajectory': 'trajectory',
  '@studnicky/iridis-vscode':     'vscode',
  // Must come after every hyphenated '@studnicky/iridis-*' entry above —
  // aliasPrefixes checks are startsWith-based, and '@studnicky/iridis-vscode'
  // also starts with '@studnicky/iridis', so the more specific keys have to
  // be inserted (and therefore checked) first.
  '@studnicky/iridis': 'core'
};

// Adapter/output packages depend only on core; core and algebra are
// dependency-free foundations; the living-color chain (contrast -> anima ->
// {fsm, trajectory, pulse}) and cli's compositional role are captured
// explicitly. pulse's own src/ has no internal imports, but its
// package.json depends on algebra+anima and its integration tests exercise
// that dependency directly.
const IRIDIS_ALLOWED_IMPORTS = {
  'algebra':     ['algebra'],
  'anima':       ['algebra', 'anima', 'contrast', 'core'],
  'capacitor':   ['capacitor', 'core'],
  'chakra':      ['chakra', 'core'],
  'cli':         ['capacitor', 'cli', 'contrast', 'core', 'image', 'rdf', 'stylesheet', 'tailwind', 'vscode'],
  'contrast':    ['contrast', 'core'],
  'core':        ['core'],
  'fsm':         ['algebra', 'anima', 'fsm'],
  'image':       ['core', 'image'],
  'mui':         ['core', 'mui'],
  'panda':       ['core', 'panda'],
  'pulse':       ['algebra', 'anima', 'pulse'],
  'rdf':         ['core', 'rdf'],
  'shadcn':      ['core', 'shadcn'],
  'stylesheet':  ['core', 'stylesheet'],
  'tailwind':    ['core', 'tailwind'],
  'trajectory':  ['algebra', 'anima', 'trajectory'],
  'vscode':      ['core', 'vscode']
};

// design-system-contracts wiring — the design system's own CSS is the
// allowlist (see packages/design-system-contracts/README.md). Two distinct
// scopes, because they answer different questions:
//
// - known-class-names / known-dynamic-class-expr need a *literal* class
//   allowlist harvested from hand-authored CSS. Nuxt UI/Tailwind utility
//   classes (used across most of site/app/**/*.vue) are never declared as
//   `.foo { }` selectors anywhere in this repo — they're generated — so
//   checking them against an authored-CSS allowlist would flag every
//   utility class as "unknown". These two rules therefore only run on the
//   Vue components that actually author their own custom CSS (an explicit
//   file list, not a directory glob, so it stays honest about what's
//   covered as new components are added).
// - known-design-tokens (CSS custom-property purity — the actual WCAG-gate
//   invariant) has no such conflict: `var(--x)`, literal colors, and
//   hardcoded border/radius are unambiguous regardless of which class
//   system authored the surrounding markup, so it runs broadly across
//   site/app/**/*.vue and site/app/**/*.css.
const SITE_ROOT = path.join(import.meta.dirname, 'site');
const sitePath = (relative) => path.join(SITE_ROOT, relative);

// Directories deliberately excluded from "authors its own custom CSS"
// discovery below, and why — checked, not assumed:
// - app/components/content/logoBackgrounds: per-theme decorative art with
//   Vue `scoped` styles that are single-use by construction (never part of
//   a reusable design-system vocabulary).
// - app/theme/presets: font/decoration/animation-intensity token overrides
//   only — verified zero color values and zero class selectors in any of
//   the 12 preset files. Also excluded from known-design-tokens' own file
//   scope below (their legitimate `var(--iridis-ambient-speed)`-style
//   consumption is an animation multiplier, not a WCAG-relevant token).
// - app/examples: documents the pipeline's own INPUT boundary (a recipe
//   feeding a literal seed hex into Engine.run) — not rendered site chrome.
const CHROME_EXCLUDED_DIRS = [
  sitePath('app/components/content/logoBackgrounds'),
  sitePath('app/theme/presets'),
  sitePath('app/examples')
].map((dir) => `${dir}${path.sep}`)

const isChromeExcluded = (absolutePath) => CHROME_EXCLUDED_DIRS.some((dir) => absolutePath.startsWith(dir))

const toRepoRelativePosix = (absolutePath) => path.relative(import.meta.dirname, absolutePath).split(path.sep).join('/')

// Walks `dir` for every file matching `predicate`, skipping
// CHROME_EXCLUDED_DIRS — the programmatic alternative to a hand-maintained
// file list. A new component under site/app that authors its own <style>
// block (inline or `src`-referenced) is picked up automatically the next
// time ESLint loads this config; nothing needs to be added here by hand.
const findFiles = (dir, predicate) => {
  const found = []
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const absolutePath = path.join(dir, entry.name)
    if (isChromeExcluded(absolutePath)) {
      continue
    }
    if (entry.isDirectory()) {
      found.push(...findFiles(absolutePath, predicate))
      continue
    }
    if (entry.isFile() && predicate(entry.name, absolutePath)) {
      found.push(absolutePath)
    }
  }
  return found
}

const hasStyleTag = (absolutePath) => fs.readFileSync(absolutePath, 'utf8').includes('<style')

// app/components/content/graph/** is the one directory where "has its own
// <style tag" under-covers: GraphDpad.vue/ViewerActions.vue/ViewerOverlay.vue
// use dagonizer-* classes styled by Dpad.css/ViewerActions.css/
// ViewerOverlay.css under app/components/content/viz/, wired in globally via
// app.vue's `<style src>` block rather than each component's own tag. Small
// (4 files total, GraphLegend.vue included), fully reviewed, entirely
// hand-authored custom classes — safe as a whole-directory rule, unlike
// app/components/layout/ (mixed: AccordionPanel.vue/InfoPanel.vue/
// RoleSortControls.vue are pure Tailwind with no <style> tag either, and
// must stay excluded).
const isGraphComponentDir = (absolutePath) => absolutePath.startsWith(sitePath(`app/components/content/graph${path.sep}`))

// Every Vue component under site/app that authors its own CSS (an inline
// <style> block, or a <style src="..."> reference to a sibling stylesheet
// like app.vue's), plus the graph/ carve-out above — i.e. exactly the set
// known-class-names/known-dynamic-class-expr can meaningfully check,
// computed instead of hand-listed.
const CHROME_VUE_FILE_PATHS = findFiles(
  sitePath('app'),
  (name, absolutePath) => name.endsWith('.vue') && (hasStyleTag(absolutePath) || isGraphComponentDir(absolutePath))
)
const CHROME_VUE_FILES = CHROME_VUE_FILE_PATHS.map(toRepoRelativePosix)

// Every standalone stylesheet under site/app (main.css plus the mermaid/viz
// component CSS) — presets/logoBackgrounds/examples excluded above.
const CHROME_CSS_FILE_PATHS = findFiles(sitePath('app'), (name) => name.endsWith('.css'))

const designSystemClassNames = await collectDesignSystemClassNames([
  ...CHROME_CSS_FILE_PATHS,
  ...CHROME_VUE_FILE_PATHS
]);

// site/app/theme/presets/*.css redefine only font/radius/border-style/
// animation-intensity custom properties per [data-iridis-theme] — never a
// color. The palette is framing-derived and gated in Tokens.ts; presets are
// deliberately excluded from the token allowlist (nothing to harvest) and
// from known-design-tokens' own file scope below (their legitimate
// `var(--iridis-ambient-speed, 1)` defensive fallback is an animation-speed
// multiplier, not a WCAG-relevant color/contrast token, so the fallback ban
// — which exists to stop a color token silently degrading to an unlisted
// hex — doesn't apply to it the way it would for chrome text/background).
const designSystemTokenNames = new Set([
  ...IRIDIS_DESIGN_TOKENS,
  ...(await collectDesignSystemTokenNames(CHROME_CSS_FILE_PATHS))
]);

// One plugin instance, reused by every config block below — ESLint flat
// config requires the same plugin name to resolve to the same object
// across every config that matches a given file, and CHROME_VUE_FILES is a
// subset of the broader site/app/**/*.vue glob the token rule runs on.
const designSystemPlugin = createDesignSystemPlugin({
  classNames: designSystemClassNames,
  designTokens: designSystemTokenNames,
  dynamicClassExpressionContracts: IRIDIS_DYNAMIC_CLASS_EXPRESSION_CONTRACTS,
  frameworks: ['vue']
});

// known-design-tokens runs via Program:exit on raw source text — it never
// needs a real AST. Plain .css files have no JS/Vue parser to produce one,
// so this parser hands back a minimal, valid, empty Program every time.
const plainTextParser = {
  parse: (code) => ({
    body: [],
    comments: [],
    loc: {
      end: { column: 0, line: Math.max(1, code.split('\n').length) },
      start: { column: 0, line: 1 }
    },
    range: [0, code.length],
    sourceType: 'module',
    tokens: [],
    type: 'Program'
  })
};

export default [
  { ignores: ['**/dist/**', '**/node_modules/**', '**/*.d.ts', 'site/.nuxt/**', 'site/.output/**'] },
  ...tseslint.config(
    {
      'files': [
        'packages/*/src/**/*.ts', 'packages/*/tests/**/*.ts',
        'site/app/**/*.ts', 'site/test/**/*.ts'
      ],
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
        '@studnicky': iridisPlugin,
        '@studnicky/v8': v8Plugin,
        '@stylistic': stylistic,
        'import-x': importX,
        'perfectionist': perfectionistPlugin,
        'regexp': regexp,
        'unused-imports': unusedImports,
        '@typescript-eslint': tseslint.plugin
      },
      'rules': {
        // @studnicky — full rule surface at maximum: entity/hygiene/v8 suites
        // plus the hexagonal-architecture rules (adapter-only-import,
        // domain-purity, known-types-outside-adapters, layer-import-boundary)
        // configured against this monorepo's real package dependency graph
        // (verified via grep of every packages/*/src cross-package import;
        // see IRIDIS_LAYERS below). No rule is disabled, weakened, or exempted.
        ...entitySuite.rules,
        ...hygieneSuite.rules,
        ...v8Suite.rules,
        ...HexagonalSuite.create({
          'layers':      IRIDIS_LAYERS,
          'sourceRoot':  'packages',
          'aliasPrefixes': IRIDIS_ALIAS_PREFIXES,
          'allowedImports': IRIDIS_ALLOWED_IMPORTS,
          'domainPurity': {
            'domainLayerName':  'core',
            'forbiddenImports': ['fs', 'node:fs', 'node:http', 'node:net', 'node:child_process']
          }
        }).rules,
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
    },
    // design-system-contracts — see the block above `export default` for
    // the classNames/tokens/plugin construction and the scope rationale.
    //
    // known-class-names/known-dynamic-class-expr additionally exclude the
    // files below: each mixes real custom classes (already enforced and
    // clean) with Nuxt UI/Tailwind utility classes, which are generated —
    // never declared as `.foo {}` anywhere in this repo — so no authored-CSS
    // harvest, however complete, can ever contain them. Verified individually
    // per file, not assumed from one spot-check: every remaining report
    // across these 9 files was checked against Nuxt UI's own generated
    // static CSS or Tailwind's utility grammar and confirmed genuine
    // framework vocabulary, not a typo of a real class (three that looked
    // the same shape — TableOfContentsBar.vue's `toc-row-1`, PaletteCarousel
    // .vue's `palette-table` — turned out to be real, undefined custom
    // classes and were fixed, not excluded). GraphLegend.vue defines most
    // of its `legend-*` family in its own scoped <style> block, and the
    // harvest reads those correctly; the two genuine gaps are
    // `legend-label` (applied at line 49, never styled) and the
    // `legend-swatch--solid` arm of the `legend-swatch--${...}` template
    // literal. Both render unstyled today. They are left as a tracked gap
    // rather than fixed here, because supplying the missing rules means
    // authoring visual design, not satisfying a linter.
    // known-design-tokens is unaffected — it has no such conflict (a
    // literal color or a `var()` reference is unambiguous regardless of
    // which class system authored the surrounding markup) and already runs
    // clean, site-wide, with zero exclusions.
    {
      'files': CHROME_VUE_FILES,
      'ignores': [
        'site/app/components/content/CodeBlock.vue',
        'site/app/components/content/ModeSwitch.vue',
        'site/app/components/content/RoleMathGrid.vue',
        'site/app/components/content/SegmentedSlider.vue',
        'site/app/components/content/graph/GraphLegend.vue',
        'site/app/components/layout/BalancedWrap.vue',
        'site/app/components/layout/CylinderCarousel.vue',
        'site/app/components/layout/PaletteCarousel.vue',
        'site/app/components/layout/TableOfContentsBar.vue'
      ],
      'plugins': { 'design-system-contracts': designSystemPlugin },
      'rules': {
        'design-system-contracts/known-class-names': 'error',
        'design-system-contracts/known-dynamic-class-expr': 'error'
      }
    },
    {
      'files': CHROME_VUE_FILES,
      'plugins': { 'design-system-contracts': designSystemPlugin },
      'rules': {
        'design-system-contracts/known-design-tokens': 'error'
      }
    },
    {
      'files': ['site/app/**/*.vue'],
      // site/app/examples/** documents the iridis pipeline's own INPUT
      // boundary (a recipe showing a third-party app feeding a literal seed
      // hex into Engine.run) — not iridis's own rendered UI chrome. Literal
      // hex there is the pipeline's documented contract, not a bypass of it
      // (DefaultThemeCss.ts's own seed hexes are the same category, and
      // were never covered by the pre-existing CHROME_STYLESHEETS test
      // either).
      'ignores': ['site/app/examples/**'],
      'plugins': { 'design-system-contracts': designSystemPlugin },
      'rules': {
        'design-system-contracts/known-design-tokens': 'error'
      }
    },
    {
      'files': ['site/app/**/*.css'],
      'ignores': ['site/app/theme/presets/**'],
      'languageOptions': { 'parser': plainTextParser },
      'plugins': { 'design-system-contracts': designSystemPlugin },
      'rules': {
        'design-system-contracts/known-design-tokens': 'error'
      }
    },
    // CSS import ban — no package under packages/*/src may import a
    // stylesheet. layer-import-boundary (HexagonalSuite, above) already
    // bans cross-layer/adapter imports; this closes the one gap it doesn't
    // cover, adapted from schema-forms' core/ports/projections CSS ban
    // (its adapter half is redundant here — layer-import-boundary already
    // owns that).
    {
      'files': ['packages/*/src/**/*.ts'],
      'rules': {
        'no-restricted-imports': ['error', {
          'patterns': [{
            'group': ['*.css'],
            'message': 'Packages cannot import stylesheets.'
          }]
        }]
      }
    }
  )
];
