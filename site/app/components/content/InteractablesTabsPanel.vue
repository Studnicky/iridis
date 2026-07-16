<script setup lang="ts">
import { computed } from 'vue';
import type { RoleViewType } from '~/composables/types/index.ts';
import { buildInteractablesTabsViewModel } from './interactables/buildInteractablesShowcaseModel.ts';

const props = defineProps<{
  roleViews: readonly RoleViewType[];
  backgroundHex: string;
  complianceLabel: string;
  compliancePct: number;
}>();

const tabsModel = computed(() => buildInteractablesTabsViewModel(
  props.roleViews,
  props.backgroundHex,
  props.complianceLabel,
  props.compliancePct
));
</script>

<template>
  <InfoPanel
    variant="default"
    label="UTabs"
    class="lg:col-span-2"
  >
    <UTabs
      :items="[...tabsModel.tabItems]"
      size="sm"
    >
      <template #overview>
        <p class="p-2 text-sm text-muted">
          {{ tabsModel.overviewText }}
        </p>
      </template>
      <template #rolesTab>
        <RoleSwatchStrip
          :roles="tabsModel.visibleRoles"
          class="p-2"
        />
      </template>
      <template #contrastTab>
        <div class="p-2">
          <UProgress :model-value="props.compliancePct" />
          <p class="mt-1 text-xs text-muted">
            {{ tabsModel.contrastText }}
          </p>
        </div>
      </template>
    </UTabs>
  </InfoPanel>
</template>
