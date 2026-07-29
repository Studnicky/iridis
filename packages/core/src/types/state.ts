import type { ContrastOptionsInterfaceTypeEntity } from '../entities/ContrastOptionsInterfaceTypeEntity.ts';
import type { ContrastReportEntryInterfaceTypeEntity } from '../entities/ContrastReportEntryInterfaceTypeEntity.ts';
import type { PendingContrastEntryInterfaceTypeEntity } from '../entities/PendingContrastEntryInterfaceTypeEntity.ts';
import type { RequiredSchemaShapeType } from './RequiredSchemaShapeType.ts';
import type { ContrastPairInterfaceType } from './role.ts';

/** Shape of a single contrast report entry (written by enforce:contrast). */
export type ContrastReportEntryInterfaceType = ContrastReportEntryInterfaceTypeEntity.Type;

/**
 * A contrast pair queued during the nudge pass, held until reconciliation
 * re-measures it against the terminal state.roles. `pair` is pinned to
 * {@link ContrastPairInterfaceType} — nesting another entity's `Schema`
 * object literal makes `FromSchema` re-derive that nested shape from
 * scratch, losing its own optional-field widening, so it is restored here
 * at the consumption site (every field of the entity's own `Type` is
 * already required, so only `pair` needs the fix-up).
 */
export type PendingContrastEntryInterfaceType = Omit<PendingContrastEntryInterfaceTypeEntity.Type, 'pair'> & {
  'pair': ContrastPairInterfaceType;
};

type ContrastOptionsSchemaShapeType = ContrastOptionsInterfaceTypeEntity.Type;

/**
 * `InputInterface.contrast`: run-level contrast enforcement options. Every
 * optional schema field is widened from an optional key to a required key
 * holding `T | undefined`, matching this codebase's monomorphic-shape
 * convention — `FromSchema` marks a non-`required` field optional (`field?:
 * T`), not present-but-`undefined`, and JSON Schema has no way to express
 * the latter, so the widening happens here at the consumption site instead
 * of inside the entity (where the lint-mandated `Type = FromSchema<typeof
 * Schema>` shape must stay verbatim). `extra` is additionally pinned to an
 * array of {@link ContrastPairInterfaceType} — nesting another entity's
 * `Schema` object literal makes `FromSchema` re-derive that nested shape
 * from scratch, losing its own optional-field widening.
 */
export type ContrastOptionsInterfaceType = RequiredSchemaShapeType<
  ContrastOptionsSchemaShapeType,
  { 'extra': ContrastPairInterfaceType[] }
>;
