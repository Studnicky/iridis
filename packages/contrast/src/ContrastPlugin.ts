import type {
  MathPrimitiveInterface,
  PluginInterface,
  TaskInterface,
} from '@studnicky/iridis';
import { enforceApca }        from './tasks/EnforceApca.ts';
import { enforceCvdSimulate } from './tasks/EnforceCvdSimulate.ts';
import { enforceWcagAa }      from './tasks/EnforceWcagAa.ts';
import { enforceWcagAaa }     from './tasks/EnforceWcagAaa.ts';

export class ContrastPlugin implements PluginInterface {
  readonly 'name'    = 'contrast';

  readonly 'version' = '0.1.0';

  tasks(): readonly TaskInterface[] {
    return [
      enforceWcagAa,
      enforceWcagAaa,
      enforceApca,
      enforceCvdSimulate,
    ];
  }

  math(): readonly MathPrimitiveInterface[] {
    // No additional math primitives beyond those provided by the core.
    // CVD simulation is performed inline by EnforceCvdSimulate.
    return [];
  }
}

export const contrastPlugin = new ContrastPlugin();
