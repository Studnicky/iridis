import { EffectInterpreter } from '@studnicky/fsm/browser';
import { LOG_STATUS, LogBody } from '@studnicky/logger/browser';
import * as VueModule from 'vue';

import { useNuxtApp } from '#imports';

import type { IridisUiEffect, IridisUiEvent } from './types/index.ts';

import { IridisUiMachine } from './fsm/IridisUiMachine.ts';
import { logger } from './logger.ts';

interface IridisUiEffectHandlersInterface {
  addSeed(hex: string | undefined): void;
  disableStrictCompliance(): void;
  enableStrictCompliance(): void;
  extractImageFiles(files: File | File[]): void;
  extractSampleImage(): void;
  pinSeedRole(index: number, role: string | undefined): void;
  populatePickerFromImage(hexes: string[]): void;
  removeSeed(index: number): void;
  selectImageCandidate(hexes: string[], label: string): void;
  setContrastStrictness(strictness: number): void;
  setCvdMode(cvdMode: string): void;
  setDarkFraming(): void;
  setDeltaEImageAlgorithm(): void;
  setDisplayP3ColorSpace(): void;
  setImageChromaRange(range: [number, number][]): void;
  setImageDeltaECap(cap: number): void;
  setImageHarmonize(threshold: number): void;
  setImageHistogramBits(bits: number): void;
  setImageK(k: number): void;
  setImageLightnessRange(range: [number, number][]): void;
  setKMeansImageAlgorithm(): void;
  setLightFraming(): void;
  setMedianCutImageAlgorithm(): void;
  setNonMandatoryLevel(nonMandatoryLevel: string): void;
  setSchema(schemaName: string): void;
  setSeed(index: number, hex: string): void;
  setSrgbColorSpace(): void;
  setWuQuantizeImageAlgorithm(): void;
}

/** One interpreter, handler port, and reactive state owner per Nuxt app/request. */
class IridisUiMachineContext {
  #handlers: IridisUiEffectHandlersInterface | undefined;

  readonly #handleEffect = (effect: IridisUiEffect): void => {
    const handlers = this.#handlers;
    if (handlers === undefined) {
      throw new Error(`Cannot execute Iridis UI effect "${effect.type}" before its capability port is registered`);
    }
    try {
      effect.execute(handlers);
    } catch {
      logger.error(
        LogBody.create({
          'component': 'useIridisUiMachine',
          'context': {},
          'message': `Effect handler for "${effect.type}" threw`,
          'operation': 'effect',
          'status': LOG_STATUS.FAILED
        })
      );
    }
  };

  readonly #interpreter = EffectInterpreter.create(new IridisUiMachine(), { 'handler': this.#handleEffect });
  readonly #state = this.#startInterpreter();
  readonly #unsubscribe = this.#interpreter.subscribe((next) => { this.#state.value = next; });

  readonly dispose = (): void => {
    this.#unsubscribe();
    this.#interpreter.stop();
  };

  readonly registerEffectHandlers = (handlers: IridisUiEffectHandlersInterface): void => {
    this.#handlers = handlers;
  };

  readonly send = (event: IridisUiEvent): void => {
    this.#interpreter.send(event).catch(() => {
      logger.error(
        LogBody.create({
          'component': 'useIridisUiMachine',
          'context': {},
          'message': `FSM rejected event "${event.type}"`,
          'operation': 'send',
          'status': LOG_STATUS.FAILED
        })
      );
    });
  };

  use() {
    return {
      'registerEffectHandlers': this.registerEffectHandlers,
      'send': this.send,
      'state': this.#state
    };
  }

  #startInterpreter() {
    this.#interpreter.start();
    const state = VueModule.shallowRef(this.#interpreter.getState());
    return state;
  }
}

class IridisUiMachineRegistry {
  static readonly #contexts = new WeakMap<object, IridisUiMachineContext>();

  static resolve(nuxtApp: object): IridisUiMachineContext {
    const existing = this.#contexts.get(nuxtApp);
    if (existing !== undefined) { return existing; }
    const context = new IridisUiMachineContext();
    this.#contexts.set(nuxtApp, context);
    return context;
  }
}

class UseIridisUiMachineOperation {
  static run() {
    const context = IridisUiMachineRegistry.resolve(useNuxtApp());
    const result = context.use();
    return result;
  }
}

export const useIridisUiMachine = UseIridisUiMachineOperation.run;
