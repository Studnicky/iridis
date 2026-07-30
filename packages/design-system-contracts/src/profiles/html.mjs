import { validateDesignSystemUsage } from '../index.mjs'

export const validateHtmlDesignSystemUsage = (policy) => validateDesignSystemUsage({
  ...policy,
  frameworks: ['html']
})
