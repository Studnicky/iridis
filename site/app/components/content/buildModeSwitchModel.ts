import type { ModeType } from '~/composables/types/index.ts';

export const MODE_SWITCH_TAB_ITEMS = [
  { label: 'Build a palette', icon: 'i-material-symbols-palette-outline', value: '0' },
  { label: 'Extract from image', icon: 'i-material-symbols-image-outline-rounded', value: '1' }
] as const;

export function tabValueFromMode(mode: ModeType): '0' | '1' {
  return mode === 'picker' ? '0' : '1';
}

export function modeFromTabValue(value: number | string): ModeType {
  return Number(value) === 0 ? 'picker' : 'image';
}
