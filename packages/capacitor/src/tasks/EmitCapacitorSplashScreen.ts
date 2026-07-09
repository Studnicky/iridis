import type {
  ColorRecordInterfaceType,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterfaceType
} from '@studnicky/iridis';

import { getOrCreateMetadata } from '@studnicky/iridis';
import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';

import type { SplashScreenOutputInterfaceType } from '../types/index.ts';

class SplashColor {
  static resolve(
    roles: Record<string, ColorRecordInterfaceType>,
    splashRole: string | undefined
  ): ColorRecordInterfaceType | undefined {
    if (splashRole !== undefined) {
      return roles[splashRole];
    }
    return roles.surface ?? roles.background ?? roles.base ?? Object.values(roles)[0];
  }
}

class EmitCapacitorSplashScreen implements TaskInterface {
  readonly 'name' = 'emit:capacitorSplashScreen';

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Emit Capacitor splash screen configuration from surface or input-specified splashRole.',
    'name':        'emit:capacitorSplashScreen',
    'reads':       ['roles', 'metadata.capacitor.splashRole', 'metadata.capacitor.androidSplashResourceName'],
    'writes':      ['outputs.capacitor:splashScreen']
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const capacitorMeta = getOrCreateMetadata(state, 'capacitor');
    const splashRole = typeof capacitorMeta.splashRole === 'string' ? capacitorMeta.splashRole : undefined;

    const splashColor = SplashColor.resolve(state.roles, splashRole);

    if (splashColor === undefined) {
      ctx.logger.warn(
        LogBody.create()
          .component('EmitCapacitorSplashScreen')
          .operation('run')
          .status(LOG_STATUS.SKIPPED)
          .message('No suitable role found for splash screen background; skipping.')
          .context({})
          .build()
      );
      return;
    }

    const androidSplashResourceName = typeof capacitorMeta.androidSplashResourceName === 'string'
      ? capacitorMeta.androidSplashResourceName
      : undefined;

    const output: SplashScreenOutputInterfaceType = androidSplashResourceName !== undefined
      ? {
        'androidSplashResourceName': androidSplashResourceName,
        'backgroundColor':           splashColor.hex
      }
      : {
        'backgroundColor': splashColor.hex
      };

    state.outputs['capacitor:splashScreen'] = output;

    ctx.logger.debug(
      LogBody.create()
        .component('EmitCapacitorSplashScreen')
        .operation('run')
        .status(LOG_STATUS.SUCCESS)
        .message('SplashScreen emitted')
        .context({
          'backgroundColor': output.backgroundColor
        })
        .build()
    );
  }
}

export const emitCapacitorSplashScreen = new EmitCapacitorSplashScreen();
