import type { ModeType } from '~/composables/types/index.ts';

export const buildModeSwitchModel = class ModeSwitchModel {
  public static readonly tabItems = [
    { 'icon': 'i-material-symbols-palette-outline', 'label': 'Build a palette', 'value': '0' },
    { 'icon': 'i-material-symbols-image-outline-rounded', 'label': 'Extract from image', 'value': '1' }
  ] as const;

  public static mode(value: number | string): ModeType.Type {
    return Number(value) === 0 ? 'picker' : 'image';
  }

  public static tabValue(mode: ModeType.Type): '0' | '1' {
    return mode === 'picker' ? '0' : '1';
  }
};
