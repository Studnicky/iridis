import { TSESLint } from '@typescript-eslint/utils'
import { Options } from './sort-switch-case/types.js'
declare const _default: TSESLint.RuleModule<
  'unexpectedSwitchCaseOrder',
  Options,
  {
    recommended?: boolean
  },
  TSESLint.RuleListener
> & {
  name: string
}
export default _default
