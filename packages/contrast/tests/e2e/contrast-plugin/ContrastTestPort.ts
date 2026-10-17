import type { ColorRecordInterfaceTypeEntity, PaletteStateInterface } from '@studnicky/iridis';
import type { LoggerInterface } from '@studnicky/logger/interfaces';
import type { JSONSchema7Type } from 'json-schema';

import { InputInterfaceTypeEntity, RuntimeOptionsInterfaceTypeEntity } from '@studnicky/iridis';
import { contrastPlugin, enforceCvdSimulate } from '@studnicky/iridis-contrast';
import { Engine } from '@studnicky/iridis/engine';
import { coreTasks } from '@studnicky/iridis/tasks';

/** Typed test boundary for complete contrast-plugin engine runs and direct CVD probes. */
export class ContrastTestPort {
  static createEngine(): Engine {
    const engine = new Engine();
    for (let index = 0; index < coreTasks.length; index += 1) {
      const task = coreTasks[index];
      if (task !== undefined) {
        engine.tasks.register(task);
      }
    }
    engine.adopt(contrastPlugin);
    return engine;
  }

  static runCorrectedCvd(roles: Readonly<Record<string, ColorRecordInterfaceTypeEntity.Type>>, contrastPairs: readonly JSONSchema7Type[], logger: LoggerInterface): PaletteStateInterface {
    const input = InputInterfaceTypeEntity.intake({
      'colors': [],
      'contrast': { 'cvdCorrect': true },
      'roles': { 'contrastPairs': contrastPairs, 'name': 'cvd-direct-probe', 'roles': [] }
    });
    const state: PaletteStateInterface = {
      'colors': [], 'input': input, 'metadata': {}, 'outputs': {}, 'roles': { ...roles },
      'runtime': RuntimeOptionsInterfaceTypeEntity.intake({ 'colorSpace': 'srgb', 'extra': {}, 'framing': 'dark' }), 'variants': {}
    };
    enforceCvdSimulate.run(state, { 'logger': logger, 'startedAt': Date.now() });
    return state;
  }

  static runObservedCvd(roles: Readonly<Record<string, ColorRecordInterfaceTypeEntity.Type>>, contrastPairs: readonly JSONSchema7Type[], logger: LoggerInterface): PaletteStateInterface {
    const input = InputInterfaceTypeEntity.intake({
      'colors': [],
      'contrast': {},
      'roles': { 'contrastPairs': contrastPairs, 'name': 'cvd-direct-probe', 'roles': [] }
    });
    const state: PaletteStateInterface = {
      'colors': [], 'input': input, 'metadata': {}, 'outputs': {}, 'roles': { ...roles },
      'runtime': RuntimeOptionsInterfaceTypeEntity.intake({ 'colorSpace': 'srgb', 'extra': {}, 'framing': 'dark' }), 'variants': {}
    };
    enforceCvdSimulate.run(state, { 'logger': logger, 'startedAt': Date.now() });
    return state;
  }

  static runCvdCandidate(foreground: ColorRecordInterfaceTypeEntity.Type, background: ColorRecordInterfaceTypeEntity.Type): PaletteStateInterface {
    const engine = ContrastTestPort.createEngine();
    engine.pipeline(['intake:oklch', 'resolve:roles', 'enforce:cvdSimulate']);
    const result = engine.run(InputInterfaceTypeEntity.intake({
      'colors': [foreground.oklch, background.oklch],
      'roles': {
        'contrastPairs': [{ 'algorithm': 'wcag21', 'background': 'background', 'foreground': 'text', 'minimumContrastRatio': 1 }],
        'name': 'cvd-candidate-probe',
        'roles': [
          { 'chromaRange': [Math.max(0, foreground.oklch.c - 0.01), Math.min(0.5, foreground.oklch.c + 0.01)], 'hue': foreground.oklch.h, 'lightnessRange': [Math.max(0, foreground.oklch.l - 0.01), Math.min(1, foreground.oklch.l + 0.01)], 'name': 'text', 'required': true },
          { 'chromaRange': [Math.max(0, background.oklch.c - 0.01), Math.min(0.5, background.oklch.c + 0.01)], 'hue': background.oklch.h, 'lightnessRange': [Math.max(0, background.oklch.l - 0.01), Math.min(1, background.oklch.l + 0.01)], 'name': 'background', 'required': true }
        ]
      }
    }));
    return result;
  }
}
