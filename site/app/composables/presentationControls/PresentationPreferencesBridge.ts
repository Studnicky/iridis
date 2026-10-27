import type { PresentationControlsReadModelEntity } from './entities/PresentationControlsReadModelEntity.ts';
import type { PresentationPreferencesTargetInterface } from './interfaces/PresentationPreferencesTargetInterface.ts';
import type { PresentationControlsStore } from './PresentationControlsStore.ts';

import { THEMES } from '../../theme/presets/index.ts';
import { THEME_PRESET_CONSTANTS } from '../constants/ThemePresetConstants.ts';

/** Browser-only theme persistence: hydrates the stored theme into the store, then mirrors selections to storage and the document. */
export class PresentationPreferencesBridge {
  readonly #store: PresentationControlsStore;

  readonly #target: PresentationPreferencesTargetInterface;

  #unsubscribe: (() => void) | undefined;

  private constructor(store: PresentationControlsStore, target: PresentationPreferencesTargetInterface) {
    this.#store = store;
    this.#target = target;
  }

  public static async attachAfterMount(
    store: PresentationControlsStore,
    target: PresentationPreferencesTargetInterface
  ): Promise<PresentationPreferencesBridge> {
    const bridge = new PresentationPreferencesBridge(store, target);

    await bridge.#hydrate();
    bridge.#applyDocument(store.readModel());
    bridge.#unsubscribe = store.subscribe((model) => {
      bridge.#persist(model);
    });

    return bridge;
  }

  /** Applies the stored theme to the document before the Vue tree mounts; the store is untouched. */
  public static applyStoredTheme(target: PresentationPreferencesTargetInterface): void {
    const stored = target.storage.getItem(THEME_PRESET_CONSTANTS.STORAGE_KEY);

    if (stored !== null && THEMES.has(stored)) {
      target.element.dataset.iridisTheme = stored;
    }
  }

  public dispose(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
  }

  #applyDocument(model: PresentationControlsReadModelEntity.Type): void {
    this.#target.element.dataset.iridisTheme = model.themeKey;
  }

  async #hydrate(): Promise<void> {
    const stored = this.#target.storage.getItem(THEME_PRESET_CONSTANTS.STORAGE_KEY);

    if (stored !== null && THEMES.has(stored)) {
      const intent = this.#store.createIntent({
        'interaction': 'theme.select',
        'themeKey': stored
      });

      await this.#store.publishIntent(intent);
    }
  }

  #persist(model: PresentationControlsReadModelEntity.Type): void {
    this.#applyDocument(model);
    if (this.#target.storage.getItem(THEME_PRESET_CONSTANTS.STORAGE_KEY) !== model.themeKey) {
      this.#target.storage.setItem(THEME_PRESET_CONSTANTS.STORAGE_KEY, model.themeKey);
    }
  }
}
