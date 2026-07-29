import type { ColorIntentType } from '@studnicky/iridis';

const TEXT_FOREGROUND_BY_INTENT: Readonly<Record<ColorIntentType, boolean>> = {
  'accent':     false,
  'background': false,
  'button':     false,
  'critical':   false,
  'link':       true,
  'muted':      true,
  'onAccent':   true,
  'onButton':   true,
  'positive':   false,
  'text':       true
};

export class TextForegroundIntent {
  static matches(intent: ColorIntentType | undefined): boolean {
    if (intent === undefined) {return false;}
    return TEXT_FOREGROUND_BY_INTENT[intent];
  }
}
