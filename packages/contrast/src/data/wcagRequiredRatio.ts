import type { ColorRecordInterfaceTypeEntity, ContrastPairInterfaceTypeEntity } from '@studnicky/iridis';

import { TextForegroundIntent } from './TextForegroundIntent.ts';

class WcagRequiredRatio {
  readonly 'name' = 'wcagRequiredRatio';

  private isTextPair(
    pair: ContrastPairInterfaceTypeEntity.Type,
    roles: Record<string, ColorRecordInterfaceTypeEntity.Type>
  ): boolean {
    const foregroundRecord = roles[pair.foreground];
    const backgroundRecord = roles[pair.background];
    if (foregroundRecord === undefined || backgroundRecord === undefined) {
      return false;
    }
    const result = TextForegroundIntent.matches(foregroundRecord.hints);
    return result;
  }

  forAa(
    pair: ContrastPairInterfaceTypeEntity.Type,
    roles: Record<string, ColorRecordInterfaceTypeEntity.Type>
  ): number {
    const minimumContrastRatio = pair.minimumContrastRatio;
    if (minimumContrastRatio !== undefined) {
      return minimumContrastRatio;
    }
    const result = this.isTextPair(pair, roles) ? 4.5 : 3.0;
    return result;
  }

  forAaa(
    pair: ContrastPairInterfaceTypeEntity.Type,
    roles: Record<string, ColorRecordInterfaceTypeEntity.Type>
  ): number {
    const minimumContrastRatio = pair.minimumContrastRatio;
    if (minimumContrastRatio !== undefined) {
      return minimumContrastRatio;
    }
    const result = this.isTextPair(pair, roles) ? 7.0 : 4.5;
    return result;
  }
}

export const wcagRequiredRatio = new WcagRequiredRatio();
