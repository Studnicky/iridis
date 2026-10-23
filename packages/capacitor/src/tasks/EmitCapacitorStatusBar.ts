import type {
  ColorRecordEntity,
  PaletteStateInterface,
  PipelineContextInterface,
  TaskInterface
} from '@studnicky/iridis';

import { luminance, PaletteMetadataSlot, TaskManifestEntity } from '@studnicky/iridis';
import { LOG_STATUS, LogBody } from '@studnicky/logger/node';

import { CapacitorOutputsEntity } from '../entities/CapacitorOutputsEntity.ts';

class BarStyle {
  static pick(barColor: ColorRecordEntity.Type): 'DARK' | 'LIGHT' {
    // LIGHT style = light icons/text on dark bar. DARK style = dark icons/text on light bar.
    const style = luminance.apply(barColor) < 0.18 ? 'LIGHT' : 'DARK';
    return style;
  }
}

class BarColor {
  static resolve(
    roles: Record<string, ColorRecordEntity.Type>
  ): ColorRecordEntity.Type | undefined {
    // Preference: topBar > surface > base > first role
    const barColor = roles.topBar ?? roles.surface ?? roles.base ?? Object.values(roles)[0];
    return barColor;
  }
}

class TextColor {
  static resolve(
    roles: Record<string, ColorRecordEntity.Type>
  ): ColorRecordEntity.Type | undefined {
    const textColor = roles.text ?? roles.onSurface ?? Object.values(roles)[1];
    return textColor;
  }
}

class EmitCapacitorStatusBar implements TaskInterface {
  readonly 'name' = 'emit:capacitorStatusBar';

  readonly 'manifest': TaskManifestEntity.Type = TaskManifestEntity.create({
    'description': 'Emit Capacitor StatusBar configuration from surface/topBar role.',
    'name':        'emit:capacitorStatusBar',
    'reads':       ['roles'],
    'writes':      ['outputs.capacitor:statusBar']
  });

  run(state: PaletteStateInterface, context: PipelineContextInterface): void {
    const barColor = BarColor.resolve(state.roles);

    if (barColor === undefined) {
      context.logger.warn(
        LogBody.create({
          'component': 'EmitCapacitorStatusBar',
          'context': {},
          'message': 'No suitable role found for status bar background; skipping.',
          'operation': 'run',
          'status': LOG_STATUS.SKIPPED
        })
      );
      return;
    }

    // Resolve consumer overlay preference from metadata
    const capacitorMeta = PaletteMetadataSlot.getOrCreate(state, 'capacitor');
    const overlay = capacitorMeta.statusBarOverlay === true;

    const textColor = TextColor.resolve(state.roles);
    // Prefer text-aware style derivation when text role exists.
    let style: 'DARK' | 'LIGHT';
    if (textColor !== undefined) {
      style = luminance.apply(textColor) > 0.18 ? 'DARK' : 'LIGHT';
    } else {
      style = BarStyle.pick(barColor);
    }

    const output = {
      'backgroundColor': barColor.hex,
      'overlay':         overlay,
      'style':           style
    };
    CapacitorOutputsEntity.intake({ 'statusBar': output });

    state.outputs['capacitor:statusBar'] = output;

    context.logger.debug(
      LogBody.create({
        'component': 'EmitCapacitorStatusBar',
        'context': {
          'backgroundColor': output.backgroundColor,
          'overlay':         output.overlay,
          'style':           output.style
        },
        'message': 'StatusBar emitted',
        'operation': 'run',
        'status': LOG_STATUS.SUCCESS
      })
    );
  }
}

export const emitCapacitorStatusBar = new EmitCapacitorStatusBar();
