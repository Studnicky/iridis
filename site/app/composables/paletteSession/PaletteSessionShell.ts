import type { PaletteSessionReadModelEntity } from './entities/PaletteSessionReadModelEntity.ts';
import type { PaletteSessionSnapshotHandoffInterface } from './interfaces/PaletteSessionSnapshotHandoffInterface.ts';
import type { PaletteSessionStore } from './PaletteSessionStore.ts';

import { Tokens } from '../../theme/Tokens.ts';
import { PALETTE_SESSION_CONSTANTS } from '../constants/PALETTE_SESSION_CONSTANTS.ts';

/** Applies each newly admitted palette to the page shell: tokens and framing class on the document, the colour-transition window, and the server-to-client snapshot handoff. */
export class PaletteSessionShell {
  #applied = -1;
  readonly #handoff: PaletteSessionSnapshotHandoffInterface;
  readonly #store: PaletteSessionStore;
  #transitionTimer: ReturnType<typeof setTimeout> | undefined;
  #unsubscribe: (() => void) | undefined;

  public constructor(store: PaletteSessionStore, handoff: PaletteSessionSnapshotHandoffInterface) {
    this.#handoff = handoff;
    this.#store = store;
  }

  /** The server publishes the admitted snapshot into the handoff; the client seeds the read model from it, repaints, and then follows the read model. */
  public start(): void {
    this.#unsubscribe = this.#store.subscribe((model) => { this.#follow(model); });
    const snapshot = this.#handoff.read();
    if (typeof window !== 'undefined' && snapshot !== null) {
      this.#handoff.write(null);
      this.#store.hydrate(snapshot);
    }
    this.#follow(this.#store.readModel());
  }

  public stop(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
    this.#endTransition();
  }

  /** The newest window closes the class. */
  #beginTransition(): void {
    clearTimeout(this.#transitionTimer);
    document.documentElement.classList.add('is-switching-theme');
    this.#transitionTimer = setTimeout(() => { this.#endTransition(); }, PALETTE_SESSION_CONSTANTS.THEME_TRANSITION_MS);
  }

  #endTransition(): void {
    clearTimeout(this.#transitionTimer);
    this.#transitionTimer = undefined;
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('is-switching-theme');
    }
  }

  #follow(model: PaletteSessionReadModelEntity.Type): void {
    const resolved = model.resolved;
    if (resolved !== undefined && resolved.revision > this.#applied) {
      if (typeof window === 'undefined') {
        this.#handoff.write(resolved.snapshot);
      } else {
        this.#paint(resolved);
      }
      this.#applied = resolved.revision;
    }
  }

  /** Repaints the document; every palette after the first runs inside the colour-transition window. */
  #paint(resolved: NonNullable<PaletteSessionReadModelEntity.Type['resolved']>): void {
    if (typeof document !== 'undefined') {
      if (this.#applied >= 0) {
        this.#beginTransition();
      }
      const tokens = Tokens.mapFromEngine(Tokens.hexRecord(resolved.snapshot.roles), resolved.snapshot.scales);
      if (resolved.framing === 'dark') {
        Tokens.applyDark(tokens);
      } else {
        Tokens.applyLight(tokens);
      }
    }
  }
}
