import { CSS_ATTRIBUTE_SELECTOR_CODE_POINTS } from '../constants/CssAttributeSelectorCodePoints.ts';
import { CSS_ATTRIBUTE_SELECTOR_PATTERNS } from '../constants/CssAttributeSelectorPatterns.ts';

export class CssAttributeSelector {
  static from(attributeName: string, value: string): string {
    if (!CSS_ATTRIBUTE_SELECTOR_PATTERNS.NAME.test(attributeName)) {
      throw new Error('CssAttributeSelector.from: attributeName must be a CSS-safe identifier');
    }
    if (value.length === 0) {
      throw new Error('CssAttributeSelector.from: value must not be empty');
    }

    let escapedValue = '';
    for (const character of value) {
      const codePoint = character.codePointAt(0);
      if (
        codePoint === undefined
        || codePoint === CSS_ATTRIBUTE_SELECTOR_CODE_POINTS.NULL
        || (
          codePoint >= CSS_ATTRIBUTE_SELECTOR_CODE_POINTS.SURROGATE_FIRST
          && codePoint <= CSS_ATTRIBUTE_SELECTOR_CODE_POINTS.SURROGATE_LAST
        )
      ) {
        throw new Error('CssAttributeSelector.from: value must contain only non-NUL Unicode scalar values');
      }
      escapedValue += CSS_ATTRIBUTE_SELECTOR_PATTERNS.VALUE_TOKEN.test(character)
        ? character
        : `\\${codePoint.toString(16).toUpperCase()} `;
    }

    return `[${attributeName}='${escapedValue}']`;
  }
}
