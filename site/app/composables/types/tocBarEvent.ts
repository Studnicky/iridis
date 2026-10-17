import { TocBarState } from './tocBarState.ts';

/** A resolved TableOfContentsBar transition. */
export abstract class TocBarEvent {
  abstract readonly type: string;

  static pastHero(): TocBarEvent {
    const result = new PastHeroTocBarEvent();
    return result;
  }

  static returnTop(): TocBarEvent {
    const result = new ReturnTopTocBarEvent();
    return result;
  }

  static scrollDown(): TocBarEvent {
    const result = new ScrollDownTocBarEvent();
    return result;
  }

  static scrollUp(): TocBarEvent {
    const result = new ScrollUpTocBarEvent();
    return result;
  }

  abstract transition(state: TocBarState): TocBarState;
}

class PastHeroTocBarEvent extends TocBarEvent {
  readonly type: string = 'PAST_HERO';

  transition(state: TocBarState): TocBarState {
    const result = state.isPastHero() ? state : TocBarState.expanded();
    return result;
  }
}

class ReturnTopTocBarEvent extends TocBarEvent {
  readonly type: string = 'RETURN_TOP';

  transition(state: TocBarState): TocBarState {
    const result = state.isPastHero() ? TocBarState.top() : state;
    return result;
  }
}

class ScrollDownTocBarEvent extends TocBarEvent {
  readonly type: string = 'SCROLL_DOWN';

  transition(state: TocBarState): TocBarState {
    const result = state.isPastHero() && !state.isCompact() ? TocBarState.compact() : state;
    return result;
  }
}

class ScrollUpTocBarEvent extends TocBarEvent {
  readonly type: string = 'SCROLL_UP';

  transition(state: TocBarState): TocBarState {
    const result = state.isCompact() ? TocBarState.expanded() : state;
    return result;
  }
}
