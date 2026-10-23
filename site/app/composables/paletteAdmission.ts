import type { AccessibilityBlockers } from './accessibilityBlockers.ts';

/** Admits a resolved palette for rendering unless the engine withheld it. */
export class PaletteAdmission {
  public static admit(blockers: ReturnType<typeof AccessibilityBlockers.fromReport>): boolean {
    const result = !blockers.withheld;
    return result;
  }
}
