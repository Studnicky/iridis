import assert from 'node:assert/strict';
import { test } from 'node:test';

import { VscodeThemeRequestEntity } from '../app/composables/entities/VscodeThemeRequestEntity.ts';

class VscodeThemeRequestFixture {
  static withoutContrast() {
    const result = {
      'framing': 'dark',
      'roles': {
        'background': '#101820',
        'error': '#ef4444',
        'foreground': '#f5f7fa',
        'keyword': '#7c3aed'
      },
      'tier': 4
    };
    return result;
  }

  static value() {
    return {
      'contrast': {
        'algorithm': 'wcag21',
        'cvdMode': 'enforce',
        'enableStrictCompliance': true,
        'level': 'AAA',
        'nonMandatoryLevel': 'AAA'
      },
      'framing': 'dark',
      'roles': {
        'background': '#101820',
        'error': '#ef4444',
        'foreground': '#f5f7fa',
        'keyword': '#7c3aed'
      },
      'tier': 4
    };
  }
}

await test('VS Code theme requests preserve every contrast option at admission', () => {
  const request = VscodeThemeRequestEntity.intake(VscodeThemeRequestFixture.value());

  assert.deepEqual(request.contrast, VscodeThemeRequestFixture.value().contrast);
});

await test('VS Code theme requests require contrast options', () => {
  const withoutContrast = VscodeThemeRequestFixture.withoutContrast();

  assert.throws(() => {
    VscodeThemeRequestEntity.intake(withoutContrast);
  });
});
