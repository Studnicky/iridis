export const SHADCN_PLUGIN_SCENARIO_PATTERNS = Object.freeze({
  'declaration': /^\s{2}--[a-z-]+: [\d.]+ [\d.]+ [\d.]+;$/m,
  'emitTask': /emit:shadcnTheme/,
  'hexIntake': /intake:hex/,
  'hexValidation': /not a hex color/,
  'taskRegistration': /not registered/
});
