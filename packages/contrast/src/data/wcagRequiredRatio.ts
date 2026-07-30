import type { ColorRecordInterfaceType, ContrastPairInterfaceType } from '@studnicky/iridis';

import { TextForegroundIntent } from './TextForegroundIntent.ts';

class WcagRequiredRatio {
  readonly 'name' = 'wcagRequiredRatio';

  private isTextPair(
    pair: ContrastPairInterfaceType,
    roles: Record<string, ColorRecordInterfaceType>
  ): boolean {
    const foregroundRecord = roles[pair.foreground];
    const backgroundRecord = roles[pair.background];
    if (foregroundRecord === undefined || backgroundRecord === undefined) {return false;}
    return TextForegroundIntent.matches(foregroundRecord.hints?.intent);
  }

  apply(
    level: 'aa' | 'aaa',
    pair: ContrastPairInterfaceType,
    roles: Record<string, ColorRecordInterfaceType>
  ): number {
    if (pair.minRatio > 0) {
      return pair.minRatio;
    }

    if (level === 'aa') {
      if (this.isTextPair(pair, roles)) {
        return 4.5;
      }
      return 3.0;
    }

    // AAA level: roles must exist; default to 7.0 when absent.
    if (roles[pair.foreground] === undefined || roles[pair.background] === undefined) {
      return 7.0;
    }
    if (this.isTextPair(pair, roles)) {
      return 7.0;
    }
    return 4.5;
  }
}

export const wcagRequiredRatio = new WcagRequiredRatio();
