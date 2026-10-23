interface BlockedPairsInterface {
  readonly 'pairs': readonly object[];
}

/** Admits a resolved palette for rendering; the first one is always admitted, later ones only when no pair is blocked. */
export class PaletteAdmission {
  #committed = false;

  public admit(blockers: BlockedPairsInterface): boolean {
    const result = blockers.pairs.length === 0 || !this.#committed;
    this.#committed = this.#committed || result;
    return result;
  }
}
