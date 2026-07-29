import { createDesignSystemEslintProfile } from './create-eslint-profile.mjs'

export const createVueDesignSystemLintConfig = (policy) => createDesignSystemEslintProfile(
  policy,
  'vue',
  ['**/*.vue']
)
