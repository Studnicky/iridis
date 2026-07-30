import { createDesignSystemEslintProfile } from './create-eslint-profile.mjs'

export const createRuntimeDesignSystemLintConfig = (policy) => createDesignSystemEslintProfile(
  policy,
  'runtime',
  ['**/*.{js,mjs,cjs,ts,mts,cts}']
)
