import type { CliConfigEntity } from '../entities/CliConfigEntity.ts';

/** Public CLI configuration contract, composed from the admitted configuration entity. */
export interface CliConfigInterface extends CliConfigEntity.Type {}
