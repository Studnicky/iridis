<script setup lang="ts">
import { computed } from 'vue';
import { useDataLayout } from '~/composables/useDataLayout.ts';
import { useIridis } from '~/composables/useIridis.ts';
import { roleSchemaByName } from '~/theme/RoleSchemaByName.ts';
import { buildRolesComplianceRows } from './roles/buildRolesComplianceRows.ts';
import { selectDataCardLayout } from './selectDataCardLayout.ts';

const NA_TOOLTIP = 'Structural role — not a text pairing';

/**
 * Contrast/compliance-focused role listing — name, ratio, AA/AAA/fail/n-a
 * badge. Raw OKLCH values (L/C/H) live in Resolved roles instead, so the two
 * cards split the same underlying role set by concern rather than both
 * showing everything. Sort state is shared (RoleSortControls / roleSortKeys)
 * with every other role listing on the page.
 */
const { framing, roleSortKeys, schemaName, sortedRoleContrastRows } = useIridis();
const { dataLayout } = useDataLayout();

/**
 * sortedRoleContrastRows scores declared foreground roles against their own
 * minimum contrast target and uses 4.5 only when no pair is declared. This
 * render-only step labels structural rows 'n/a' without changing the shared
 * minimum-ratio and compliance utilities, then re-sorts so 'n/a' has its own
 * rank rather than inheriting the overwritten 'fail'/'AA'/'AAA' value.
 */
const selectedRoleSchema = computed(() => {
  const result = roleSchemaByName[schemaName.value]?.[framing.value];
  return result;
});

const displayRoleRows = computed(() => buildRolesComplianceRows.build(
  selectedRoleSchema.value,
  sortedRoleContrastRows.value,
  roleSortKeys.value
));

const cardLayoutByMode = {
  'grid': {
    'badgeSize':       'xs',
    'cardClass':       'text-sm',
    'containerClass':  'grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4',
    'ratioClass':      undefined,
    'showRatioLabel':  true,
    'titleClass':      'truncate text-xs font-semibold text-highlighted',
    'variant':         'row'
  },
  'list': {
    'badgeSize':       'xs',
    'cardClass':       'w-full gap-3 text-sm',
    'containerClass':  'flex flex-col gap-2',
    'ratioClass':      undefined,
    'showRatioLabel':  true,
    'titleClass':      'truncate text-xs font-semibold text-highlighted',
    'variant':         'row'
  },
  'pixel': {
    'badgeSize':       'xs',
    'cardClass':       undefined,
    'containerClass':  'grid grid-cols-4 gap-1 sm:grid-cols-6 lg:grid-cols-8',
    'ratioClass':      'text-[8px] text-muted',
    'showRatioLabel':  false,
    'titleClass':      'w-full truncate text-[9px] font-semibold text-highlighted',
    'variant':         'tile'
  }
} as const;

const activeCardLayout = computed(() => {
  return selectDataCardLayout.select(
    dataLayout.value,
    cardLayoutByMode.grid,
    cardLayoutByMode.list,
    cardLayoutByMode.pixel
  );
});
const rendersTable = computed(() => dataLayout.value.select(false, false, false, true));
</script>

<template>
  <UCard>
    <LeadSummary>
      <p class="text-sm text-muted">
        Same roles as Resolved roles, laid out for contrast scanning — sort by any field below.
      </p>
      <template #meta>
        <UBadge
          color="neutral"
          variant="soft"
        >
          {{ displayRoleRows.length }} roles
        </UBadge>
      </template>
    </LeadSummary>

    <p class="mb-3 text-xs text-dimmed">
      <strong class="text-highlighted">AAA</strong> exceeds 7:1 · <strong class="text-highlighted">AA</strong> meets the pair's own WCAG target · <strong class="text-highlighted">fail</strong> falls short · <strong class="text-highlighted">n/a</strong> a structural role (border, surface, code background…) never meant to be read as text against this background.
    </p>

    <RoleSortControls class="mb-3" />

    <RolesComplianceGrid
      v-if="activeCardLayout"
      :rows="displayRoleRows"
      :layout="activeCardLayout"
      :na-tooltip="NA_TOOLTIP"
    />

    <RolesComplianceTable
      v-show="rendersTable"
      :rows="displayRoleRows"
      :na-tooltip="NA_TOOLTIP"
    />

    <FootnoteText>
      Ratio and Compliance are live WCAG 2.1 measurements, nudged into range by the engine's contrast enforcement —
      see <DocAnchorLink href="#10-math-primitives-reference">
        Math Primitives Reference
      </DocAnchorLink>
      for the WCAG/APCA math and how `enforce:contrast` corrects a failing pair.
    </FootnoteText>
  </UCard>
</template>
