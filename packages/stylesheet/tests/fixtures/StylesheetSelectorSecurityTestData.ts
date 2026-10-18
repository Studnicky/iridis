export const StylesheetSelectorSecurityTestData = Object.freeze({
  'ATTRIBUTE_CATEGORY_SELECTOR_PATTERN': /^\[data-category='(?:[A-Za-z0-9_-]|\\[0-9A-F]+ )+'\] \{/u,
  'BRAND_BLUE_SELECTOR_PATTERN': /^\[data-app-theme='brand-blue'\] \{/u,
  'CLOSE_BRACE_PATTERN': /\}/gu,
  'CSS_SAFE_IDENTIFIER_PATTERN': /attributeName must be a CSS-safe identifier/u,
  'CUSTOM_PROPERTY_PREFIX_PATTERN': /value must be a CSS custom-property prefix/u,
  'HOSTILE_VARIANT': "music'] } body { color: red } [data-owned='true",
  'OPEN_BRACE_PATTERN': /\{/gu,
  'RAW_ROLE_SCHEMA': {
    'name': 'selector-security',
    'roles': [{
      'name': 'primary',
      'required': true
    }]
  },
  'THEME_SELECTOR_PATTERN': /\[data-theme='(?:[A-Za-z0-9_-]|\\[0-9A-F]+ )+'\] \{/u
});
