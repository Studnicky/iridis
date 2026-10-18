import type {
  ColorRecordInterfaceTypeEntity,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface
} from '@studnicky/iridis';

import { PaletteMetadataSlot, TaskManifestInterfaceTypeEntity } from '@studnicky/iridis';
import { LOG_STATUS, LogBody } from '@studnicky/logger/node';

import { CapacitorOutputsEntity } from '../entities/CapacitorOutputsEntity.ts';

class SplashColor {
  static resolve(
    roles: Record<string, ColorRecordInterfaceTypeEntity.Type>,
    splashRole: string | undefined
  ): ColorRecordInterfaceTypeEntity.Type | undefined {
    if (splashRole !== undefined) {
      return roles[splashRole];
    }
    const fallback = roles.surface ?? roles.background ?? roles.base ?? Object.values(roles)[0];
    return fallback;
  }
}

class EmitCapacitorSplashScreen implements TaskInterface {
  readonly 'name' = 'emit:capacitorSplashScreen';

  readonly 'manifest': TaskManifestInterfaceTypeEntity.Type = TaskManifestInterfaceTypeEntity.create({
    'description': 'Emit Capacitor splash screen configuration from surface or input-specified splashRole.',
    'name':        'emit:capacitorSplashScreen',
    'reads':       ['roles', 'metadata.capacitor.splashRole', 'metadata.capacitor.androidSplashResourceName'],
    'writes':      ['outputs.capacitor:splashScreen']
  });

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    const capacitorMeta = PaletteMetadataSlot.getOrCreate(state, 'capacitor');
    const splashRole = typeof capacitorMeta.splashRole === 'string' ? capacitorMeta.splashRole : undefined;

    const splashColor = SplashColor.resolve(state.roles, splashRole);

    if (splashColor === undefined) {
      context.logger.warn(
        LogBody.create({
          'component': 'EmitCapacitorSplashScreen',
          'context': {},
          'message': 'No suitable role found for splash screen background; skipping.',
          'operation': 'run',
          'status': LOG_STATUS.SKIPPED
        })
      );
      return;
    }

    const androidSplashResourceName = typeof capacitorMeta.androidSplashResourceName === 'string'
      ? capacitorMeta.androidSplashResourceName
      : undefined;

    const splashScreen = androidSplashResourceName !== undefined
      ? {
        'androidSplashResourceName': androidSplashResourceName,
        'backgroundColor':           splashColor.hex
      }
      : {
        'backgroundColor': splashColor.hex
      };
    CapacitorOutputsEntity.intake({ 'splashScreen': splashScreen });

    state.outputs['capacitor:splashScreen'] = splashScreen;

    context.logger.debug(
      LogBody.create({
        'component': 'EmitCapacitorSplashScreen',
        'context': {
          'backgroundColor': splashScreen.backgroundColor
        },
        'message': 'SplashScreen emitted',
        'operation': 'run',
        'status': LOG_STATUS.SUCCESS
      })
    );
  }
}

export const emitCapacitorSplashScreen = new EmitCapacitorSplashScreen();
