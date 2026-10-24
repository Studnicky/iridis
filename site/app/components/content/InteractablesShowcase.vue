<script setup lang="ts">
import { computed, ref } from 'vue';
import { useIridis } from '~/composables/useIridis.ts';
import type { AliasColorEntity } from '~/theme/entities/AliasColorEntity.ts';
import { buildInteractablesShowcaseModel } from './interactables/buildInteractablesShowcaseModel.ts';

/**
 * Toggleable/selectable Nuxt UI controls — split out of the Components card
 * so switches/radios/checkboxes/tabs/accordion/pagination (things you
 * interact WITH to change what's displayed) aren't crowded in beside
 * one-shot action components (buttons/toasts/forms). Each avatar+badge pair
 * below is wrapped in its own flex item — two independent children per
 * iteration inside one `flex flex-wrap` parent wrap at the child level, not
 * the pair level, which is what previously interleaved them.
 */
const { roleViews, roles, contrastStrictness, sortedRoleContrastRows, contrastReport } = useIridis();


/** A real filter applied to the avatar/badge row below, not decoration. */
const checkedColors = ref<AliasColorEntity.Type[]>(buildInteractablesShowcaseModel.resolveDefaultCheckedColors());

// 'background' is required in every schema tier and resolved synchronously
// before any component reads this — never a hardcoded placeholder.
/** Under AA/AAA (strictness 0/1) reads the same sortedRoleContrastRows every
 * other compliance display on the page reads — never a second independent
 * contrastRatio() sweep, so this stat can't silently diverge from Roles
 * table / Resolved roles / Clamps if complianceFor()'s thresholds ever
 * change. Under APCA (strictness 2) the WCAG-derived `compliance` field
 * on those rows doesn't reflect the enforced APCA Lc target at all, so this
 * reads the compliance report's pairs instead — the same report
 * SchemaComplianceCard and PipelineExplainer render as "X/Y pairs passing" —
 * so the label 'APCA' next to this number always matches the metric behind it. */
const showcaseModel = computed(() => {
  const compliance = contrastReport.value.compliance;
  const apcaPairCount = compliance?.pairs.length ?? 0;
  const apcaPassingPairCount = apcaPairCount - (compliance?.problemPairs.length ?? 0);
  const result = buildInteractablesShowcaseModel.build(
    contrastStrictness.value,
    sortedRoleContrastRows.value,
    apcaPairCount,
    apcaPassingPairCount,
    roleViews.value.length,
    roles.value['background']!
  );
  return result;
});

</script>

<template>
  <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
    <InteractablesSwitchRadioPanel />

    <InteractablesCheckboxFilterPanel v-model="checkedColors" />

    <FilteredAvatarBadgePanel :checked-colors="checkedColors" />

    <InteractablesTabsPanel
      :role-views="roleViews"
      :background-hex="showcaseModel.backgroundHex"
      :compliance-label="showcaseModel.complianceLabel"
      :compliance-pct="showcaseModel.compliancePercent"
    />

    <InteractablesAccordionPanel :items="showcaseModel.accordionItems" />

    <InteractablesPaginationPanel :roles="sortedRoleContrastRows" />

    <ComplianceProgressPanel
      :label="`${showcaseModel.complianceLabel} compliance`"
      :percent="showcaseModel.compliancePercent"
    />
  </div>
</template>
