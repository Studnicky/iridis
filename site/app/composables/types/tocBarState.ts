/** Resolved TableOfContentsBar presentation state. */
export abstract class TocBarState {
  abstract readonly variant: string;

  static compact(): TocBarState {
    const result = new CompactTocBarState();
    return result;
  }

  static expanded(): TocBarState {
    const result = new ExpandedTocBarState();
    return result;
  }

  static top(): TocBarState {
    const result = new TopTocBarState();
    return result;
  }

  abstract isCompact(): boolean;
  abstract isPastHero(): boolean;
}

class CompactTocBarState extends TocBarState {
  readonly variant: string = 'compact';

  isCompact(): boolean {
    return true;
  }

  isPastHero(): boolean {
    return true;
  }
}

class ExpandedTocBarState extends TocBarState {
  readonly variant: string = 'expanded';

  isCompact(): boolean {
    return false;
  }

  isPastHero(): boolean {
    return true;
  }
}

class TopTocBarState extends TocBarState {
  readonly variant: string = 'top';

  isCompact(): boolean {
    return false;
  }

  isPastHero(): boolean {
    return false;
  }
}
