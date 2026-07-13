import type {
  ColorRecordInterfaceType,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface,
  TaskManifestInterfaceType
} from '@studnicky/iridis';

import { getOrCreateMetadata, luminance } from '@studnicky/iridis';
import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';

import type { StatusBarOutputInterfaceType } from '../types/index.ts';

class BarStyle {
  static pick(barColor: ColorRecordInterfaceType): 'DARK' | 'LIGHT' {
    // LIGHT style = light icons/text on dark bar. DARK style = dark icons/text on light bar.
    return luminance.apply(barColor) < 0.18 ? 'LIGHT' : 'DARK';
  }
}

class BarColor {
  static resolve(
    roles: Record<string, ColorRecordInterfaceType>
  ): ColorRecordInterfaceType | undefined {
    // Preference: topBar > surface > base > first role
    return roles.topBar ?? roles.surface ?? roles.base ?? Object.values(roles)[0];
  }
}

class TextColor {
  static resolve(
    roles: Record<string, ColorRecordInterfaceType>
  ): ColorRecordInterfaceType | undefined {
    return roles.text ?? roles.onSurface ?? Object.values(roles)[1];
  }
}

class EmitCapacitorStatusBar implements TaskInterface {
  readonly 'name' = 'emit:capacitorStatusBar';

  readonly 'manifest': TaskManifestInterfaceType = {
    'description': 'Emit Capacitor StatusBar configuration from surface/topBar role.',
    'name':        'emit:capacitorStatusBar',
    'reads':       ['roles'],
    'writes':      ['outputs.capacitor:statusBar']
  };

  run(state: PaletteStateInterface, ctx: PipelineContextInterface): void {
    const barColor = BarColor.resolve(state.roles);

    if (barColor === undefined) {
      ctx.logger.warn(
        LogBody.create()
          .component('EmitCapacitorStatusBar')
          .operation('run')
          .status(LOG_STATUS.SKIPPED)
          .message('No suitable role found for status bar background; skipping.')
          .context({})
          .build()
      );
      return;
    }

    // Resolve consumer overlay preference from metadata
    const capacitorMeta = getOrCreateMetadata(state, 'capacitor');
    const overlay = capacitorMeta.statusBarOverlay === true;

    const textColor = TextColor.resolve(state.roles);
    // Prefer text-aware style derivation when text role exists.
    let style: 'DARK' | 'LIGHT';
    if (textColor !== undefined) {
      style = luminance.apply(textColor) > 0.18 ? 'DARK' : 'LIGHT';
    } else {
      style = BarStyle.pick(barColor);
    }

    const output: StatusBarOutputInterfaceType = {
      'backgroundColor': barColor.hex,
      'overlay':         overlay,
      'style':           style
    };

    state.outputs['capacitor:statusBar'] = output;

    ctx.logger.debug(
      LogBody.create()
        .component('EmitCapacitorStatusBar')
        .operation('run')
        .status(LOG_STATUS.SUCCESS)
        .message('StatusBar emitted')
        .context({
          'backgroundColor': output.backgroundColor,
          'overlay':         output.overlay,
          'style':           output.style
        })
        .build()
    );
  }
}

export const emitCapacitorStatusBar = new EmitCapacitorStatusBar();
