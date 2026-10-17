/** Regular expressions shared by VS Code plugin scenario assertions. */
export const VscodePluginPattern = Object.freeze({
  'expandTokensRoles': /ExpandTokens.*roles.*background|requires roles/,
  'hexadecimalColor': /^#[0-9a-f]{6,8}$/,
  'hexadecimalColorWithAlpha': /^#[0-9a-f]{8}$/,
  'semanticRequiresModifiers': /emit:vscodeSemanticRules.*vscode:applyModifiers|requires.*vscode:applyModifiers/,
  'themeRequiresPalette': /emit:vscodeThemeJson.*emit:vscodeUiPalette|requires.*emit:vscodeUiPalette/,
  'themeRequiresSemanticRules': /emit:vscodeThemeJson.*emit:vscodeSemanticRules|requires.*emit:vscodeSemanticRules/,
  'tokensRequireExpanded': /vscode:applyModifiers.*vscode:expandTokens|requires.*vscode:expandTokens/
});
