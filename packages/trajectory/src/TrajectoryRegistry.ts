import { evaluateStops } from '@studnicky/iridis-anima';
import type { PaletteInterfaceType } from '@studnicky/iridis-algebra';

import { builtInTrajectories } from './BuiltInTrajectories.ts';
import type { TrajectoryDefinitionInterfaceType } from './types/index.ts';

/** Name→definition lookup for palette trajectories, seeded with the curated built-in set. */
export class TrajectoryRegistry {
  private readonly trajectories = new Map<string, TrajectoryDefinitionInterfaceType>(builtInTrajectories);

  /** Registers (or overwrites) a named trajectory. */
  public registerTrajectory(name: string, definition: TrajectoryDefinitionInterfaceType): void {
    this.trajectories.set(name, definition);
  }

  /** Resolves the palette at `t` along the named trajectory. */
  public resolve(name: string, t: number): PaletteInterfaceType {
    const trajectory = this.trajectories.get(name);
    if (!trajectory) throw new Error(`Unknown trajectory "${name}"`);
    return evaluateStops(trajectory.stops, t, trajectory.opts);
  }
}
