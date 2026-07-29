import type { HueDirectionType } from '@studnicky/iridis-algebra';

/** Maps a normalized progress value (t in [0, 1]) to an eased progress value. */
export type EasingFunctionType = (t: number) => number;

export abstract class SpringOptionsInterfaceType {
  abstract 'damping':   number | undefined;
  abstract 'mass':      number | undefined;
  abstract 'stiffness': number | undefined;
}

export abstract class CurveOptionsInterfaceType {
  /** Roles whose hue interpolation should route through the green detour when it would otherwise cross the brown/gray dead zone. */
  abstract 'chromaticDetourRoles': string[] | undefined;
  abstract 'easing':               EasingFunctionType | undefined;
  abstract 'hueDirection':         HueDirectionType | undefined;
}

export type EnforceLevelType = 'aa' | 'aaa';

export abstract class ContrastPairInputInterfaceType {
  abstract 'algorithm':  'wcag21' | undefined;
  abstract 'background':  string;
  abstract 'foreground':  string;
  abstract 'minRatio':   number | undefined;
}

export type EnforceOptionsInterfaceType = CurveOptionsInterfaceType & {
  'contrastPairs': ContrastPairInputInterfaceType[];
  'level':        EnforceLevelType | undefined;
};
