import type {
  PluginInterface,
  TaskInterface
} from '@studnicky/iridis';

import { PluginSchemaContributionInterfaceEntity } from '@studnicky/iridis';

import { CONTRAST_PLUGIN_SCHEMAS } from './constants/ContrastPluginSchemas.ts';
import { enforceCompliance } from './tasks/EnforceCompliance.ts';
import { reportCompliance } from './tasks/ReportCompliance.ts';

export class ContrastPlugin implements PluginInterface {
  readonly 'name'    = 'contrast';

  readonly 'version' = '0.1.0';

  tasks(): readonly TaskInterface[] {
    return [
      enforceCompliance,
      reportCompliance
    ];
  }

  schemas(): PluginSchemaContributionInterfaceEntity.Type {
    const result = PluginSchemaContributionInterfaceEntity.create({
      'metadata': {
        'contrast:complianceReport': CONTRAST_PLUGIN_SCHEMAS.complianceReport,
        'contrast:cvd': CONTRAST_PLUGIN_SCHEMAS.cvd
      }
    });
    return result;
  }
}
