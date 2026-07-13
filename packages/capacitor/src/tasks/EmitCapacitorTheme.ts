import type {
  ColorIntentType,
  ColorRecordInterfaceType,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterfaceType
} from '@studnicky/iridis';

import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';

import type { CapacitorThemeOutputInterfaceType } from '../types/index.ts';

type IntentMap = ReadonlyMap<ColorIntentType, string>;

class IntentMapBuilder {
  static build(roles: Record<string, ColorRecordInterfaceType>): IntentMap {
    const map = new Map<ColorIntentType, string>();
    // Keep the first match per intent; role name takes precedence in Hex.resolve below.
    for (const record of Object.values(roles)) {
      const intent = record.hints?.intent;
      if (intent !== undefined && !map.has(intent)) {
        map.set(intent, record.hex);
      }
    }
    return map;
  }
}

class Hex {
  static resolve(
    roles: Record<string, ColorRecordInterfaceType>,
    intentMap: IntentMap,
    primaryName: string,
    fallbackIntent: ColorIntentType,
    ultimateFallback: string
  ): string {
    return (
      roles[primaryName]?.hex ??
      intentMap.get(fallbackIntent) ??
      ultimateFallback
    );
  }
}

class VariantHex {
  static resolve(
    roles: Record<string, ColorRecordInterfaceType>,
    variants: Record<string, Record<string, ColorRecordInterfaceType>>,
    roleName: string,
    variantName: string,
    fallback: string
  ): string {
    return variants[roleName]?.[variantName]?.hex ?? roles[roleName]?.hex ?? fallback;
  }
}

/**
 * Emits a flat hex-string theme map for native Capacitor storage.
 *
 * Wide-gamut policy: Native Capacitor APIs (`StatusBar.setStyle`,
 * `SplashScreen` color, Android theme XML `@color/...`) are sRGB-only at
 * the OS surface; iOS UIColor accepts a `displayP3` constructor but the
 * Capacitor plugin layer marshals colours as ARGB hex strings and the
 * Android side has no equivalent at all. The gamut-mapped `record.rgb`
 * slot from
 * {@link import('@studnicky/iridis').ColorRecordFactory.fromOklch}
 * (always sRGB-safe per CSS Color 4 §13.2.2 chroma-reduction) is the
 * correct emission target. Wide-gamut OKLCH inputs are silently clamped
 * to sRGB at the factory layer; this task therefore does NOT (and CANNOT
 * usefully) surface `record.displayP3` even when populated. The
 * stylesheet plugin's `EmitCssVarsScoped` carries the wide-gamut signal
 * for any Capacitor app that drives its theme through CSS variables on
 * the WebView side.
 */
class EmitCapacitorTheme implements TaskInterface {
  readonly 'name' = 'emit:capacitorTheme';

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Emit flat Capacitor theme map from resolved roles for native preference storage.',
    'name':        'emit:capacitorTheme',
    'reads':       ['roles', 'variants'],
    'writes':      ['outputs.capacitor:theme']
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const roles    = state.roles;
    const variants = state.variants;
    const intentMap = IntentMapBuilder.build(roles);

    const FALLBACK = '#000000';

    const primary     = Hex.resolve(roles, intentMap, 'primary', 'background', FALLBACK);
    const primaryDark = VariantHex.resolve(roles, variants, 'primary', 'dark',  primary);
    const primaryLight = VariantHex.resolve(roles, variants, 'primary', 'light', primary);
    const accent      = Hex.resolve(roles, intentMap, 'accent',  'accent',     primary);
    const background  = Hex.resolve(roles, intentMap, 'background', 'background', '#ffffff');
    const surface     = Hex.resolve(roles, intentMap, 'surface', 'background', background);
    const error       = Hex.resolve(roles, intentMap, 'error',   'critical',   '#b00020');
    const warning     = Hex.resolve(roles, intentMap, 'warning', 'muted',      '#f59e0b');
    const success     = Hex.resolve(roles, intentMap, 'success', 'positive',   '#10b981');
    const info        = Hex.resolve(roles, intentMap, 'info',    'accent',     '#3b82f6');
    const text        = Hex.resolve(roles, intentMap, 'text',    'text',       '#1f2937');
    const textOnPrimary = Hex.resolve(roles, intentMap, 'textOnPrimary', 'text', '#ffffff');
    const textOnAccent  = Hex.resolve(roles, intentMap, 'textOnAccent',  'text', '#ffffff');

    const output: CapacitorThemeOutputInterfaceType = {
      'accent':        accent,
      'background':    background,
      'error':         error,
      'info':          info,
      'primary':       primary,
      'primaryDark':   primaryDark,
      'primaryLight':  primaryLight,
      'success':       success,
      'surface':       surface,
      'text':          text,
      'textOnAccent':  textOnAccent,
      'textOnPrimary': textOnPrimary,
      'warning':       warning
    };

    state.outputs['capacitor:theme'] = output;

    ctx.logger.debug(
      LogBody.create()
        .component('EmitCapacitorTheme')
        .operation('run')
        .status(LOG_STATUS.SUCCESS)
        .message('Theme emitted')
        .context({
          'keyCount': Object.keys(output).length
        })
        .build()
    );
  }
}

export const emitCapacitorTheme = new EmitCapacitorTheme();
