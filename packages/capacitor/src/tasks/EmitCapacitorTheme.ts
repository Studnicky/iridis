import type {
  ColorIntentType,
  ColorRecordInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '@studnicky/iridis';
import { getOrCreateOutput } from '@studnicky/iridis';
import type { CapacitorThemeOutputInterface } from '../types/index.ts';

type IntentMap = ReadonlyMap<ColorIntentType, string>;

function buildIntentMap(roles: Record<string, ColorRecordInterface>): IntentMap {
  const map = new Map<ColorIntentType, string>();
  // Keep the first match per intent; role name takes precedence in resolveHex below.
  for (const record of Object.values(roles)) {
    const intent = record.hints?.intent;
    if (intent && !map.has(intent)) {
      map.set(intent, record.hex);
    }
  }
  return map;
}

function resolveHex(
  roles: Record<string, ColorRecordInterface>,
  intentMap: IntentMap,
  primaryName: string,
  fallbackIntent: ColorIntentType,
  ultimateFallback: string,
): string {
  return (
    roles[primaryName]?.hex ??
    intentMap.get(fallbackIntent) ??
    ultimateFallback
  );
}

function variantHex(
  roles: Record<string, ColorRecordInterface>,
  variants: Record<string, Record<string, ColorRecordInterface>>,
  roleName: string,
  variantName: string,
  fallback: string,
): string {
  return variants[roleName]?.[variantName]?.hex ?? roles[roleName]?.hex ?? fallback;
}

/**
 * Emits a flat hex-string theme map for native Capacitor storage.
 *
 * Wide-gamut policy — Native Capacitor APIs (`StatusBar.setStyle`,
 * `SplashScreen` color, Android theme XML `@color/...`) are sRGB-only at
 * the OS surface; iOS UIColor accepts a `displayP3` constructor but the
 * Capacitor plugin layer marshals colours as ARGB hex strings and the
 * Android side has no equivalent at all. The gamut-mapped `record.rgb`
 * slot from
 * {@link import('@studnicky/iridis').ColorRecordFactory.fromOklch} —
 * always sRGB-safe per CSS Color 4 §13.2.2 chroma-reduction — is the
 * correct emission target. Wide-gamut OKLCH inputs are silently clamped
 * to sRGB at the factory layer; this task therefore does NOT (and CANNOT
 * usefully) surface `record.displayP3` even when populated. The
 * stylesheet plugin's `EmitCssVarsScoped` carries the wide-gamut signal
 * for any Capacitor app that drives its theme through CSS variables on
 * the WebView side.
 */
export class EmitCapacitorTheme implements TaskInterface {
  readonly 'name' = 'emit:capacitorTheme';

  readonly 'manifest': TaskManifestInterface = {
    'name':        'emit:capacitorTheme',
    'reads':       ['roles', 'variants'],
    'writes':      ['outputs.capacitor.theme'],
    'description': 'Emit flat Capacitor theme map from resolved roles for native preference storage.',
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const roles    = state.roles;
    const variants = state.variants;
    const intentMap = buildIntentMap(roles);

    const FALLBACK = '#000000';

    const primary     = resolveHex(roles, intentMap, 'primary', 'background', FALLBACK);
    const primaryDark = variantHex(roles, variants, 'primary', 'dark',  primary);
    const primaryLight = variantHex(roles, variants, 'primary', 'light', primary);
    const accent      = resolveHex(roles, intentMap, 'accent',  'accent',     primary);
    const background  = resolveHex(roles, intentMap, 'background', 'background', '#ffffff');
    const surface     = resolveHex(roles, intentMap, 'surface', 'background', background);
    const error       = resolveHex(roles, intentMap, 'error',   'critical',   '#b00020');
    const warning     = resolveHex(roles, intentMap, 'warning', 'muted',      '#f59e0b');
    const success     = resolveHex(roles, intentMap, 'success', 'positive',   '#10b981');
    const info        = resolveHex(roles, intentMap, 'info',    'accent',     '#3b82f6');
    const text        = resolveHex(roles, intentMap, 'text',    'text',       '#1f2937');
    const textOnPrimary = resolveHex(roles, intentMap, 'textOnPrimary', 'text', '#ffffff');
    const textOnAccent  = resolveHex(roles, intentMap, 'textOnAccent',  'text', '#ffffff');

    const output: CapacitorThemeOutputInterface = {
      'primary':       primary,
      'primaryDark':   primaryDark,
      'primaryLight':  primaryLight,
      'accent':        accent,
      'background':    background,
      'surface':       surface,
      'error':         error,
      'warning':       warning,
      'success':       success,
      'info':          info,
      'text':          text,
      'textOnPrimary': textOnPrimary,
      'textOnAccent':  textOnAccent,
    };

    const capacitorOut = getOrCreateOutput(state, 'capacitor');
    capacitorOut['theme'] = output;

    ctx.logger.debug('EmitCapacitorTheme', 'run', 'Theme emitted', {
      'keyCount': Object.keys(output).length,
    });
  }
}

export const emitCapacitorTheme = new EmitCapacitorTheme();
