export const ComplianceReportFixture = Object.freeze({
  'ACCENT_ON_SURFACE': Object.freeze({ 'actual': 2.5, 'adjustedRoles': [], 'background': 'surface', 'constraints': [], 'foreground': 'accent', 'passed': false, 'required': 3, 'shortfall': 0.5 }),
  'ACCENT_ON_SURFACE_PROVEN': Object.freeze({
    'actual': 2.5,
    'adjustedRoles': [],
    'background': 'surface',
    'constraints': ['range'],
    'foreground': 'accent',
    'passed': false,
    'proof': Object.freeze({
      'bestActual': 2.75,
      'limitingBounds': [Object.freeze({ 'channel': 'lightness', 'edge': 'maximum', 'role': 'accent', 'value': 0.58 })],
      'missingLuminance': 0.02,
      'required': 3,
      'shortfall': 0.25
    }),
    'required': 3,
    'shortfall': 0.5
  }),
  'TEXT_ON_SURFACE': Object.freeze({ 'actual': 1.0912, 'adjustedRoles': [], 'background': 'surface', 'constraints': ['pin'], 'foreground': 'text', 'passed': false, 'required': 4.5, 'shortfall': 3.4088 })
});
