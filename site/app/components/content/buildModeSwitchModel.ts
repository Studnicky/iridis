import { ModeInterfaceTypeEntity } from '~/composables/entities/ModeInterfaceTypeEntity.ts';

export const buildModeSwitchModel = class ModeSwitchModel {
  public static readonly tabItems = [
    { 'icon': 'i-material-symbols-palette-outline', 'label': 'Build a palette', 'value': '0' },
    { 'icon': 'i-material-symbols-image-outline-rounded', 'label': 'Extract from image', 'value': '1' }
  ] as const;

  public static mode(value: number | string): ModeInterfaceTypeEntity.Type {
    const result = ModeInterfaceTypeEntity.intake(Number(value) === 0 ? 'picker' : 'image');
    return result;
  }

  public static tabValue(mode: string): '0' | '1' {
    const result = mode === 'picker' ? '0' : '1';
    return result;
  }
};
