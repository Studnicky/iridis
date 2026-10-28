import type { ViteHotContext } from 'vite/types/hot.d.ts';

import { LOG_STATUS, LogBody } from '@studnicky/logger/browser';
import * as VueModule from 'vue';

import type { ExtractionSettingsEntity } from '../entities/ExtractionSettingsEntity.ts';
import type { PaletteResolutionClientProviderInterface } from './interfaces/PaletteResolutionClientProviderInterface.ts';
import type { PaletteSessionSnapshotHandoffInterface } from './interfaces/PaletteSessionSnapshotHandoffInterface.ts';
import type { PaletteSessionStore } from './PaletteSessionStore.ts';

import { logger } from '../logger.ts';
import { PaletteSessionComposition } from './PaletteSessionComposition.ts';
import { PaletteSessionImage } from './PaletteSessionImage.ts';
import { PaletteSessionImageIntake } from './PaletteSessionImageIntake.ts';
import { PaletteSessionInput } from './PaletteSessionInput.ts';
import { PaletteSessionModeGuard } from './PaletteSessionModeGuard.ts';
import { PaletteSessionReadModel } from './PaletteSessionReadModel.ts';
import { PaletteSessionRelationshipGraph } from './PaletteSessionRelationshipGraph.ts';
import { PaletteSessionShell } from './PaletteSessionShell.ts';
import { PaletteSessionStatusView } from './PaletteSessionStatusView.ts';

class ViteModule {
  static readonly metadata: ImportMeta & { readonly 'hot'?: ViteHotContext } = import.meta;
}

/** One reactive palette session per Nuxt app or SSR request, resolved from a WeakMap keyed by the app. */
export class PaletteSessionVueComposition {
  static readonly #instances = new WeakMap<object, PaletteSessionVueComposition>();

  public readonly readModel = VueModule.shallowRef(PaletteSessionReadModel.initial(PaletteSessionInput.initial(), PaletteSessionImage.initial()));
  readonly #intakeFailure = VueModule.shallowRef<string | null>(null);
  public readonly status = VueModule.computed(() => {
    const result = PaletteSessionStatusView.from(this.readModel.value);
    return result;
  });

  public readonly error = VueModule.computed(() => {
    const result = this.#intakeFailure.value ?? this.status.value.error;
    return result;
  });

  public readonly paletteRevision = VueModule.computed(() => {
    const result = this.readModel.value.resolved?.revision ?? 0;
    return result;
  });

  public readonly relationshipGraph = VueModule.computed(() => {
    const result = PaletteSessionRelationshipGraph.from(this.readModel.value.input);
    return result;
  });

  public readonly resolving = VueModule.computed(() => {
    const result = this.status.value.resolving;
    return result;
  });

  public readonly running = VueModule.computed(() => {
    const result = this.status.value.running;
    return result;
  });

  public readonly schemaFeasibilityChecking = VueModule.computed(() => {
    const result = this.readModel.value.feasibility.status === 'checking';
    return result;
  });

  public readonly schemaFeasibilityReport = VueModule.computed(() => {
    const result = this.readModel.value.feasibility.report;
    return result;
  });

  readonly #intake: PaletteSessionImageIntake;
  readonly #scope: object;
  #sampleImageUrl: string | undefined;
  #shell: PaletteSessionShell | undefined;
  readonly #unsubscribe: () => void;
  public readonly store: PaletteSessionStore;

  private constructor(scope: object, store: PaletteSessionStore) {
    this.#scope = scope;
    this.store = store;
    this.readModel.value = store.readModel();
    this.#unsubscribe = store.subscribe((model) => { this.readModel.value = model; });
    this.#intake = new PaletteSessionImageIntake(
      store,
      this.dispatch,
      (message) => { this.#intakeFailure.value = message; }
    );
  }

  /** The browser opens the engine worker and the server resolves in-process, as `PaletteSessionComposition` decides. */
  public static resolve(scope: object, provider?: PaletteResolutionClientProviderInterface): PaletteSessionVueComposition {
    const existing = PaletteSessionVueComposition.#instances.get(scope);
    const result = existing ?? new PaletteSessionVueComposition(scope, PaletteSessionComposition.resolve(scope, provider));
    PaletteSessionVueComposition.#instances.set(scope, result);
    return result;
  }

  /** Decodes the files and adds each as an image entry, switching to image mode first. */
  public readonly addImages = async (files: File | File[]): Promise<void> => {
    const sources = Array.isArray(files) ? files : [files];
    await this.#intake.addImages(sources, { 'dispatch': this.dispatchImage });
  };

  /** Admits the command, stamps it, and applies it; a rejected command is logged and dropped. Settles once every subscriber holds the resulting read model. */
  public readonly dispatch = async (command: unknown): Promise<void> => {
    await this.dispatchSequence([command]);
  };

  /** Dispatches an image-only command after selecting image mode when another mode is active. */
  public readonly dispatchImage = async (command: unknown): Promise<void> => {
    await this.dispatchSequence(PaletteSessionModeGuard.image(this.readModel.value.input, command));
  };

  /** Dispatches a picker-only command after selecting picker mode when another mode is active. */
  public readonly dispatchPicker = async (command: unknown): Promise<void> => {
    await this.dispatchSequence(PaletteSessionModeGuard.picker(this.readModel.value.input, command));
  };

  /** Applies the commands in order, then settles once. */
  public readonly dispatchSequence = async (commands: readonly unknown[]): Promise<void> => {
    for (let index = 0; index < commands.length; index += 1) {
      this.#publish(commands[index]);
    }
    await this.store.settled();
  };

  /** Adds the bundled sample image, switching to image mode first. */
  public readonly extractSample = async (): Promise<void> => {
    await this.#intake.extractSample(this.#sampleUrl(), this.dispatchImage);
  };

  public readonly removeImage = async (imageId: string): Promise<void> => {
    await this.#intake.removeImage(imageId);
  };

  public readonly selectRelationshipMode = async (groupId: string, modeId: string): Promise<void> => {
    await this.dispatch({ 'interaction': 'palette.relationship.mode.select', 'payload': { 'groupId': groupId, 'modeId': modeId } });
  };

  public readonly updateImageSetting = (imageId: string, settings: ExtractionSettingsEntity.Type): void => {
    this.#intake.updateImageSetting(imageId, settings);
  };

  /** Starts the page-shell effects once; the browser also loads the sample image when the first consumer mounts. */
  public boot(handoff: PaletteSessionSnapshotHandoffInterface, sampleImageUrl: string): void {
    if (this.#shell === undefined) {
      this.#sampleImageUrl = sampleImageUrl;
      this.#shell = new PaletteSessionShell(this.store, handoff);
      this.#shell.start();
      this.readModel.value = this.store.readModel();
      if (typeof window !== 'undefined') {
        ViteModule.metadata.hot?.dispose(() => { void this.dispose(); });
        this.#loadSampleWhenMounted();
      }
    }
  }

  public async dispose(): Promise<void> {
    this.#unsubscribe();
    this.#shell?.stop();
    this.#intake.dispose();
    PaletteSessionVueComposition.#instances.delete(this.#scope);
    await PaletteSessionComposition.release(this.#scope);
  }

  #sampleUrl(): string {
    if (this.#sampleImageUrl === undefined) {
      throw new RangeError('The palette session has no sample image until it boots');
    }
    return this.#sampleImageUrl;
  }

  #loadSampleWhenMounted(): void {
    const load = (): void => {
      this.#intake.extractSample(this.#sampleUrl(), this.dispatch).catch(() => { /* the failure is on `error` */ });
    };
    if (VueModule.getCurrentInstance() === null) {
      load();
    } else {
      VueModule.onMounted(load);
    }
  }

  #publish(command: unknown): void {
    try {
      this.store.publishIntent(this.store.createIntent(command));
    } catch {
      logger.error(
        LogBody.create({
          'component': 'PaletteSessionVueComposition',
          'context': {},
          'message': 'Palette session command was rejected',
          'operation': 'dispatch',
          'status': LOG_STATUS.FAILED
        })
      );
    }
  }
}
