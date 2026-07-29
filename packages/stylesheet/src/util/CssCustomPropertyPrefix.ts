import { CSS_CUSTOM_PROPERTY_PREFIX_PATTERNS } from '../constants/CssCustomPropertyPrefixPatterns.ts';

export class CssCustomPropertyPrefix {
  static from(value: string | undefined): string {
    const prefix = value ?? '--c-';
    if (!CSS_CUSTOM_PROPERTY_PREFIX_PATTERNS.VALID.test(prefix)) {
      throw new Error('CssCustomPropertyPrefix.from: value must be a CSS custom-property prefix');
    }
    return prefix;
  }
}
