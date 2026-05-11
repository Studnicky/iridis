import type {
  ColorRecordInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '@studnicky/iridis';
import type { StatusBarOutputInterface } from '../types/index.ts';

function relativeLuminance(rgb: { readonly r: number; readonly g: number; readonly b: number }): number {
  const lin = (v: number): number =>
    v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  return 0.2126 * lin(rgb.r) + 0.7152 * lin(rgb.g) + 0.0722 * lin(rgb.b);
}

function pickBarStyle(barColor: ColorRecordInterface): 'DARK' | 'LIGHT' {
  // LIGHT style = light icons/text on dark bar. DARK style = dark icons/text on light bar.
  const lum = relativeLuminance(barColor.rgb);
  return lum < 0.18 ? 'LIGHT' : 'DARK';
}

function resolveBarColor(
  roles: Record<string, ColorRecordInterface>,
): ColorRecordInterface | undefined {
  // Preference: topBar > surface > base > first role
  return roles['topBar'] ?? roles['surface'] ?? roles['base'] ?? Object.values(roles)[0];
}

function resolveTextColor(
  roles: Record<string, ColorRecordInterface>,
): ColorRecordInterface | undefined {
  return roles['text'] ?? roles['onSurface'] ?? Object.values(roles)[1];
}

export class EmitCapacitorStatusBar implements TaskInterface {
  readonly 'name' = 'emit:capacitorStatusBar';

  readonly 'manifest': TaskManifestInterface = {
    'name':        'emit:capacitorStatusBar',
    'reads':       ['roles'],
    'writes':      ['outputs.capacitor.statusBar'],
    'description': 'Emit Capacitor StatusBar configuration from surface/topBar role.',
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const barColor = resolveBarColor(state.roles);

    if (!barColor) {
      ctx.logger.warn('EmitCapacitorStatusBar', 'run', 'No suitable role found for status bar background; skipping.');
      return;
    }

    // Resolve consumer overlay preference from metadata
    const capacitorMeta = (state.metadata['capacitor'] ?? {}) as Record<string, unknown>;
    const overlay = capacitorMeta['statusBarOverlay'] === true;

    const textColor = resolveTextColor(state.roles);
    // Prefer text-aware style derivation when text role exists.
    const style: 'DARK' | 'LIGHT' = textColor
      ? (relativeLuminance(textColor.rgb) > 0.18 ? 'DARK' : 'LIGHT')
      : pickBarStyle(barColor);

    const output: StatusBarOutputInterface = {
      'backgroundColor': barColor.hex,
      'style':           style,
      'overlay':         overlay,
    };

    const existingCapacitor = (state.outputs['capacitor'] ?? {}) as Record<string, unknown>;
    state.outputs['capacitor'] = {
      ...existingCapacitor,
      'statusBar': output,
    };

    ctx.logger.debug('EmitCapacitorStatusBar', 'run', `StatusBar: bg=${output.backgroundColor} style=${output.style} overlay=${output.overlay}`);
  }
}

export const emitCapacitorStatusBar = new EmitCapacitorStatusBar();
