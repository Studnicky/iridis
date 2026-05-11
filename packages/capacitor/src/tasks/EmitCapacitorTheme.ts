import type {
  ColorIntentType,
  ColorRecordInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '@studnicky/iridis';
import type { CapacitorThemeOutputInterface } from '../types/index.ts';

type IntentMap = ReadonlyMap<ColorIntentType, string>;

function buildIntentMap(roles: Record<string, ColorRecordInterface>): IntentMap {
  const map = new Map<ColorIntentType, string>();
  for (const [name, record] of Object.entries(roles)) {
    const intent = record.hints?.intent;
    if (intent && !map.has(intent)) {
      map.set(intent, (record as ColorRecordInterface).hex);
      // Keep the first match per intent; role name takes precedence below.
      void name;
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

export class EmitCapacitorTheme implements TaskInterface {
  readonly name = 'emit:capacitorTheme';

  readonly manifest: TaskManifestInterface = {
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

    const primary     = resolveHex(roles, intentMap, 'primary', 'base',     FALLBACK);
    const primaryDark = variantHex(roles, variants, 'primary', 'dark',  primary);
    const primaryLight = variantHex(roles, variants, 'primary', 'light', primary);
    const accent      = resolveHex(roles, intentMap, 'accent',  'accent',   primary);
    const background  = resolveHex(roles, intentMap, 'background', 'base',  '#ffffff');
    const surface     = resolveHex(roles, intentMap, 'surface', 'surface',  background);
    const error       = resolveHex(roles, intentMap, 'error',   'critical', '#b00020');
    const warning     = resolveHex(roles, intentMap, 'warning', 'muted',    '#f59e0b');
    const success     = resolveHex(roles, intentMap, 'success', 'positive', '#10b981');
    const info        = resolveHex(roles, intentMap, 'info',    'neutral',  '#3b82f6');
    const text        = resolveHex(roles, intentMap, 'text',    'text',     '#1f2937');
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

    const existingCapacitor = (state.outputs['capacitor'] ?? {}) as Record<string, unknown>;
    (state.outputs as Record<string, unknown>)['capacitor'] = {
      ...existingCapacitor,
      'theme': output,
    };

    ctx.logger.debug('EmitCapacitorTheme', 'run', `Theme emitted with ${Object.keys(output).length} keys`);
  }
}

export const emitCapacitorTheme = new EmitCapacitorTheme();
