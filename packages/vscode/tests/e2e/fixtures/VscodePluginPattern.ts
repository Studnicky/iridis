/** Regular expressions shared by VS Code plugin scenario assertions. */
export const VscodePluginPattern = Object.freeze({
  'hexadecimalColor': /^#[0-9a-f]{6,8}$/,
  'hexadecimalColorWithAlpha': /^#[0-9a-f]{8}$/,
  'themeRequiresSemanticRules': /emit:vscodeThemeJson.*emit:vscodeSemanticRules|requires.*emit:vscodeSemanticRules/
});
