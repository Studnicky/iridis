<script setup lang="ts">
import { ref } from 'vue';
import { ALIAS_COLOR_NAMES } from '~/theme/aliasColorNames.ts';
import { buildDismissibleAlertsModel } from './buildDismissibleAlertsModel.ts';

const COLORS = ALIAS_COLOR_NAMES;
const alerts = ref(buildDismissibleAlertsModel.empty);
let alertId = 0;

function addAlert(): void {
  alerts.value = buildDismissibleAlertsModel.append(alerts.value, COLORS, alertId);
  alertId += 1;
}

function removeAlert(id: number): void {
  alerts.value = alerts.value.filter((alert) => {
    return alert.id !== id;
  });
}
</script>

<template>
  <InfoPanel
    variant="default"
    label="Dismissible alerts"
  >
    <PanelMeta class="mb-2">
      <UButton
        icon="i-material-symbols-add-rounded"
        size="xs"
        variant="soft"
        @click="addAlert"
      >
        Add alert
      </UButton>
    </PanelMeta>
    <div
      v-auto-animate
      class="space-y-2"
    >
      <UAlert
        v-for="alert in alerts"
        :key="alert.id"
        :color="alert.color"
        variant="soft"
        :title="alert.title"
        close
        @update:open="removeAlert(alert.id)"
      />
      <p
        v-if="alerts.length === 0"
        class="text-xs text-dimmed"
      >
        No alerts yet — add one.
      </p>
    </div>
  </InfoPanel>
</template>
