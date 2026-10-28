import type { PaletteSessionInputEntity } from './entities/PaletteSessionInputEntity.ts';

/** Prefixes an image-only or picker-only command with the mode switch that makes it take effect. */
export class PaletteSessionModeGuard {
  /** The commands to dispatch in order for an image action: the image-mode selection when picker mode is active, then `command`. */
  public static image(input: PaletteSessionInputEntity.Type, command: unknown): unknown[] {
    const select = { 'interaction': 'palette.mode.select', 'payload': { 'mode': 'image' } };
    const result = input.mode === 'image' ? [command] : [select, command];
    return result;
  }

  /** The commands to dispatch in order for a picker action: the picker-mode selection when image mode is active, then `command`. */
  public static picker(input: PaletteSessionInputEntity.Type, command: unknown): unknown[] {
    const select = { 'interaction': 'palette.mode.select', 'payload': { 'mode': 'picker' } };
    const result = input.mode === 'picker' ? [command] : [select, command];
    return result;
  }
}
