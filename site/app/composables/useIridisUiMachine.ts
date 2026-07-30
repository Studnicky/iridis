import { EffectInterpreter } from '@studnicky/fsm';
import { LogBody } from '@studnicky/logger/builders';
import { LOG_STATUS } from '@studnicky/logger/constants';
import * as VueModule from 'vue';

import { useNuxtApp } from '#imports';

import { IridisUiMachine } from './fsm/IridisUiMachine.ts';
import { logger } from './logger.ts';
import { type IridisUiEffectType, IridisUiEffectVariant, type IridisUiEventType } from './types/index.ts';

declare namespace IridisUiMachineTypes {
  type MutateSeedsHandler = (effect: Extract<IridisUiEffectType.Type, { 'variant': IridisUiEffectVariant.MUTATE_SEEDS }>) => void;
  type SetPaletteParamHandler = (effect: Extract<IridisUiEffectType.Type, { 'variant': IridisUiEffectVariant.SET_PALETTE_PARAM }>) => void;
  type ExtractImageHandler = (effect: Extract<IridisUiEffectType.Type, { 'variant': IridisUiEffectVariant.EXTRACT_IMAGE }>) => void;
  type PinSeedRoleHandler = (effect: Extract<IridisUiEffectType.Type, { 'variant': IridisUiEffectVariant.PIN_SEED_ROLE }>) => void;
  type UpdateDiagramViewHandler = (effect: Extract<IridisUiEffectType.Type, { 'variant': IridisUiEffectVariant.UPDATE_DIAGRAM_VIEW }>) => void;
  type UpdateCvdPreviewHandler = (effect: Extract<IridisUiEffectType.Type, { 'variant': IridisUiEffectVariant.UPDATE_CVD_PREVIEW }>) => void;
  type PopulatePickerFromImageHandler = (effect: Extract<IridisUiEffectType.Type, { 'variant': IridisUiEffectVariant.POPULATE_PICKER_FROM_IMAGE }>) => void;
  type NavigateToTargetHandler = (effect: Extract<IridisUiEffectType.Type, { 'variant': IridisUiEffectVariant.NAVIGATE_TO_TARGET }>) => void;
  type SelectImageCandidateHandler = (effect: Extract<IridisUiEffectType.Type, { 'variant': IridisUiEffectVariant.SELECT_IMAGE_CANDIDATE }>) => void;
}

/** Prevents an effect-handler failure from leaving EffectInterpreter's drain loop stuck. */
class Handler {
  static wrap<TEffect extends IridisUiEffectType.Type>(
    variant: IridisUiEffectVariant, handler: (effect: TEffect) => void
  ): (effect: TEffect) => void {
    return (effect: TEffect): void => {
      try {
        handler(effect);
      } catch (error: unknown) {
        logger.error(
          LogBody.create()
            .component('useIridisUiMachine')
            .operation('effect')
            .status(LOG_STATUS.FAILED)
            .message(`Effect handler for "${variant}" threw`)
            .context({ 'error': error instanceof Error ? error.message : String(error) })
            .build()
        );
      }
    };
  }
}

/** One interpreter, handler registry, and reactive state owner per Nuxt app/request. */
class IridisUiMachineContext {
  readonly #handlers: {
    'EXTRACT_IMAGE'?: IridisUiMachineTypes.ExtractImageHandler;
    'MUTATE_SEEDS'?: IridisUiMachineTypes.MutateSeedsHandler;
    'NAVIGATE_TO_TARGET'?: IridisUiMachineTypes.NavigateToTargetHandler;
    'PIN_SEED_ROLE'?: IridisUiMachineTypes.PinSeedRoleHandler;
    'POPULATE_PICKER_FROM_IMAGE'?: IridisUiMachineTypes.PopulatePickerFromImageHandler;
    'SELECT_IMAGE_CANDIDATE'?: IridisUiMachineTypes.SelectImageCandidateHandler;
    'SET_PALETTE_PARAM'?: IridisUiMachineTypes.SetPaletteParamHandler;
    'UPDATE_CVD_PREVIEW'?: IridisUiMachineTypes.UpdateCvdPreviewHandler;
    'UPDATE_DIAGRAM_VIEW'?: IridisUiMachineTypes.UpdateDiagramViewHandler;
  } = {};

  readonly #interpreter = EffectInterpreter.create({ 'handlers': this.#handlers, 'machine': new IridisUiMachine() });
  readonly #state = this.#startInterpreter();
  readonly #unsubscribe = this.#interpreter.subscribe((next) => { this.#state.value = next; });

  readonly dispose = (): void => {
    this.#unsubscribe();
    this.#interpreter.stop();
  };

  readonly registerExtractImageHandler = (handler: IridisUiMachineTypes.ExtractImageHandler): void => {
    this.#handlers.EXTRACT_IMAGE = Handler.wrap(IridisUiEffectVariant.EXTRACT_IMAGE, handler);
  };

  readonly registerMutateSeedsHandler = (handler: IridisUiMachineTypes.MutateSeedsHandler): void => {
    this.#handlers.MUTATE_SEEDS = Handler.wrap(IridisUiEffectVariant.MUTATE_SEEDS, handler);
  };

  readonly registerNavigateToTargetHandler = (handler: IridisUiMachineTypes.NavigateToTargetHandler): void => {
    this.#handlers.NAVIGATE_TO_TARGET = Handler.wrap(IridisUiEffectVariant.NAVIGATE_TO_TARGET, handler);
  };

  readonly registerPinSeedRoleHandler = (handler: IridisUiMachineTypes.PinSeedRoleHandler): void => {
    this.#handlers.PIN_SEED_ROLE = Handler.wrap(IridisUiEffectVariant.PIN_SEED_ROLE, handler);
  };

  readonly registerPopulatePickerFromImageHandler = (handler: IridisUiMachineTypes.PopulatePickerFromImageHandler): void => {
    this.#handlers.POPULATE_PICKER_FROM_IMAGE = Handler.wrap(IridisUiEffectVariant.POPULATE_PICKER_FROM_IMAGE, handler);
  };

  readonly registerSelectImageCandidateHandler = (handler: IridisUiMachineTypes.SelectImageCandidateHandler): void => {
    this.#handlers.SELECT_IMAGE_CANDIDATE = Handler.wrap(IridisUiEffectVariant.SELECT_IMAGE_CANDIDATE, handler);
  };

  readonly registerSetPaletteParamHandler = (handler: IridisUiMachineTypes.SetPaletteParamHandler): void => {
    this.#handlers.SET_PALETTE_PARAM = Handler.wrap(IridisUiEffectVariant.SET_PALETTE_PARAM, handler);
  };

  readonly registerUpdateCvdPreviewHandler = (handler: IridisUiMachineTypes.UpdateCvdPreviewHandler): void => {
    this.#handlers.UPDATE_CVD_PREVIEW = Handler.wrap(IridisUiEffectVariant.UPDATE_CVD_PREVIEW, handler);
  };

  readonly registerUpdateDiagramViewHandler = (handler: IridisUiMachineTypes.UpdateDiagramViewHandler): void => {
    this.#handlers.UPDATE_DIAGRAM_VIEW = Handler.wrap(IridisUiEffectVariant.UPDATE_DIAGRAM_VIEW, handler);
  };

  readonly send = (event: IridisUiEventType.Type): void => {
    this.#interpreter.send(event).catch((error: unknown) => {
      logger.error(
        LogBody.create()
          .component('useIridisUiMachine')
          .operation('send')
          .status(LOG_STATUS.FAILED)
          .message(`FSM rejected event "${event.type}"`)
          .context({ 'error': error instanceof Error ? error.message : String(error) })
          .build()
      );
    });
  };

  use() {
    return {
      'registerExtractImageHandler': this.registerExtractImageHandler,
      'registerMutateSeedsHandler': this.registerMutateSeedsHandler,
      'registerNavigateToTargetHandler': this.registerNavigateToTargetHandler,
      'registerPinSeedRoleHandler': this.registerPinSeedRoleHandler,
      'registerPopulatePickerFromImageHandler': this.registerPopulatePickerFromImageHandler,
      'registerSelectImageCandidateHandler': this.registerSelectImageCandidateHandler,
      'registerSetPaletteParamHandler': this.registerSetPaletteParamHandler,
      'registerUpdateCvdPreviewHandler': this.registerUpdateCvdPreviewHandler,
      'registerUpdateDiagramViewHandler': this.registerUpdateDiagramViewHandler,
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
    return context.use();
  }
}

export const useIridisUiMachine = UseIridisUiMachineOperation.run;
