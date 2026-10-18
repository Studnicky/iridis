import type { PaletteInterfaceTypeEntity } from '@studnicky/iridis-algebra';

import { evaluateStops } from '@studnicky/iridis-anima';

import type { TrajectoryDefinitionInterface } from './interfaces/TrajectoryDefinitionInterface.ts';

import { builtInTrajectories } from './BuiltInTrajectories.ts';

/** Name→definition lookup for palette trajectories, seeded with the curated built-in set. */
export class TrajectoryRegistry {
  private readonly trajectories = new Map<string, TrajectoryDefinitionInterface>(builtInTrajectories);

  /** Registers (or overwrites) a named trajectory. */
  public registerTrajectory(name: string, definition: TrajectoryDefinitionInterface): void {
    this.trajectories.set(name, definition);
  }

  /** Resolves the palette at `t` along the named trajectory. */
  public resolve(name: string, t: number): PaletteInterfaceTypeEntity.Type {
    const trajectory = this.trajectories.get(name);
    if (trajectory === undefined) {throw new Error(`Unknown trajectory "${name}"`);}
    const result = evaluateStops(trajectory.stops, t, trajectory.options);
    return result;
  }
}
