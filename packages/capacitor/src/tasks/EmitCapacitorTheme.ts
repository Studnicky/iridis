import type {
  ColorHintsEntity,
  ColorRecordEntity,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface
} from '@studnicky/iridis';

import { TaskManifestEntity } from '@studnicky/iridis';
import { LOG_STATUS, LogBody } from '@studnicky/logger/node';

import { CapacitorOutputsEntity } from '../entities/CapacitorOutputsEntity.ts';

class IntentMapBuilder {
  static build(roles: Record<string, ColorRecordEntity.Type>): ReadonlyMap<NonNullable<ColorHintsEntity.Type['intent']>, string> {
    const map = new Map<NonNullable<ColorHintsEntity.Type['intent']>, string>();
    // Keep the first match per intent; role name takes precedence in Hex.resolve below.
    const records = Object.values(roles);
    for (let index = 0; index < records.length; index += 1) {
      const record = records[index];
      if (record === undefined) {
        continue;
      }
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
    roles: Record<string, ColorRecordEntity.Type>,
    primaryName: string,
    fallback: string
  ): string {
    const value = roles[primaryName]?.hex ?? fallback;
    return value;
  }
}

class VariantHex {
  static resolve(
    roles: Record<string, ColorRecordEntity.Type>,
    variants: Record<string, Record<string, ColorRecordEntity.Type>>,
    roleName: string,
    variantName: string,
    fallback: string
  ): string {
    const value = variants[roleName]?.[variantName]?.hex ?? roles[roleName]?.hex ?? fallback;
    return value;
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

  readonly 'manifest': TaskManifestEntity.Type = TaskManifestEntity.create({
    'description': 'Emit flat Capacitor theme map from resolved roles for native preference storage.',
    'name':        'emit:capacitorTheme',
    'reads':       ['roles', 'variants'],
    'writes':      ['outputs.capacitor:theme']
  });

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    const roles    = state.roles;
    const variants = state.variants;
    const intentMap = IntentMapBuilder.build(roles);

    const FALLBACK = '#000000';

    const primaryFallback = intentMap.get('background') ?? FALLBACK;
    const primary     = Hex.resolve(roles, 'primary', primaryFallback);
    const primaryDark = VariantHex.resolve(roles, variants, 'primary', 'dark',  primary);
    const primaryLight = VariantHex.resolve(roles, variants, 'primary', 'light', primary);
    const accent      = Hex.resolve(roles, 'accent', intentMap.get('accent') ?? primary);
    const background  = Hex.resolve(roles, 'background', intentMap.get('background') ?? '#ffffff');
    const surface     = Hex.resolve(roles, 'surface', intentMap.get('background') ?? background);
    const error       = Hex.resolve(roles, 'error', intentMap.get('critical') ?? '#b00020');
    const warning     = Hex.resolve(roles, 'warning', intentMap.get('muted') ?? '#f59e0b');
    const success     = Hex.resolve(roles, 'success', intentMap.get('positive') ?? '#10b981');
    const info        = Hex.resolve(roles, 'info', intentMap.get('accent') ?? '#3b82f6');
    const text        = Hex.resolve(roles, 'text', intentMap.get('text') ?? '#1f2937');
    const textOnPrimary = Hex.resolve(roles, 'textOnPrimary', intentMap.get('text') ?? '#ffffff');
    const textOnAccent  = Hex.resolve(roles, 'textOnAccent', intentMap.get('text') ?? '#ffffff');

    const output = {
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
    CapacitorOutputsEntity.intake({ 'theme': output });

    state.outputs['capacitor:theme'] = output;

    context.logger.debug(
      LogBody.create({
        'component': 'EmitCapacitorTheme',
        'context': {
          'keyCount': Object.keys(output).length
        },
        'message': 'Theme emitted',
        'operation': 'run',
        'status': LOG_STATUS.SUCCESS
      })
    );
  }
}

export const emitCapacitorTheme = new EmitCapacitorTheme();
