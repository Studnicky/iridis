import type {
  ColorRecordInterface,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterface,
} from '@studnicky/iridis';
import type { SplashScreenOutputInterface } from '../types/index.ts';

function resolveSplashColor(
  roles: Record<string, ColorRecordInterface>,
  splashRole: string | undefined,
): ColorRecordInterface | undefined {
  if (splashRole !== undefined) {
    return roles[splashRole];
  }
  return roles['surface'] ?? roles['background'] ?? roles['base'] ?? Object.values(roles)[0];
}

export class EmitCapacitorSplashScreen implements TaskInterface {
  readonly name = 'emit:capacitorSplashScreen';

  readonly manifest: TaskManifestInterface = {
    'name':        'emit:capacitorSplashScreen',
    'reads':       ['roles', 'metadata.capacitor.splashRole', 'metadata.capacitor.androidSplashResourceName'],
    'writes':      ['outputs.capacitor.splashScreen'],
    'description': 'Emit Capacitor splash screen configuration from surface or input-specified splashRole.',
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const capacitorMeta = (state.metadata['capacitor'] ?? {}) as Record<string, unknown>;
    const splashRole = typeof capacitorMeta['splashRole'] === 'string'
      ? capacitorMeta['splashRole']
      : undefined;

    const splashColor = resolveSplashColor(state.roles, splashRole);

    if (!splashColor) {
      ctx.logger.warn('EmitCapacitorSplashScreen', 'run', 'No suitable role found for splash screen background; skipping.');
      return;
    }

    const androidSplashResourceName = typeof capacitorMeta['androidSplashResourceName'] === 'string'
      ? capacitorMeta['androidSplashResourceName']
      : undefined;

    const output: SplashScreenOutputInterface = androidSplashResourceName !== undefined
      ? {
          'backgroundColor':           splashColor.hex,
          'androidSplashResourceName': androidSplashResourceName,
        }
      : {
          'backgroundColor': splashColor.hex,
        };

    const existingCapacitor = (state.outputs['capacitor'] ?? {}) as Record<string, unknown>;
    (state.outputs as Record<string, unknown>)['capacitor'] = {
      ...existingCapacitor,
      'splashScreen': output,
    };

    ctx.logger.debug('EmitCapacitorSplashScreen', 'run', `SplashScreen: bg=${output.backgroundColor}`);
  }
}

export const emitCapacitorSplashScreen = new EmitCapacitorSplashScreen();
