import { getDesignSystemEslintPlugin } from '../index.mjs'

export const createDesignSystemEslintProfile = (policy, context, files) => ({
  files: policy.files ?? files,
  ...getDesignSystemEslintPlugin({
    classNames: policy.classNames,
    dynamicClassExpressionContracts: policy.dynamicClassExpressionContracts,
    designTokens: policy.designTokens,
    frameworks: [context],
    ...(policy.rules === undefined ? {} : {rules: policy.rules})
  })
})
