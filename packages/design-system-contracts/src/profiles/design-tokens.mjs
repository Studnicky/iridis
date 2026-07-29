import { createDesignSystemEslintProfile } from './create-eslint-profile.mjs'

export const createDesignTokenDesignSystemLintConfig = (policy) => createDesignSystemEslintProfile(
  {...policy, rules: ['known-design-tokens']},
  'html',
  ['**/*.css']
)
