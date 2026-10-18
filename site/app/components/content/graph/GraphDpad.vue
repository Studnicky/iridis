<script setup lang="ts">
import { computed } from 'vue';

import { DpadMachine } from '~/components/content/viz/DpadMachine.ts';

const props = withDefaults(defineProps<{
  machine: InstanceType<typeof DpadMachine>;
  dpadReady?: boolean;
}>(), {});

const state = computed(() => {
  const current = props.machine.state();
  const controlsUnavailable = props.dpadReady !== true;
  const items = current.items.map((item) => {
    const action = item.action;
    const disabled = controlsUnavailable || item.disabled;
    const label = item.label;
    const title = item.title;
    return { action, disabled, label, title };
  });
  return {
    'hint': current.hint,
    items,
    'zoomLevel': current.zoomLevel,
    'zoomText': current.zoomText
  };
});

function onPress(action: Parameters<InstanceType<typeof DpadMachine>['press']>[0]): void {
  void props.machine.press(action);
}
</script>

<template>
  <div
    class="dagonizer-dpad-wrap"
    aria-label="Graph navigation controls"
  >
    <aside
      v-if="state.zoomLevel !== null"
      class="dagonizer-dpad-hud"
      aria-live="polite"
    >
      <span class="dagonizer-dpad-hud-level">{{ state.zoomText }}</span>
      <span
        v-if="state.hint !== null"
        class="dagonizer-dpad-hud-hint"
      >{{ state.hint }}</span>
    </aside>

    <div
      class="dagonizer-dpad"
      aria-label="Navigation D-pad"
    >
      <button
        v-for="item in state.items"
        :key="item.action"
        class="dagonizer-dpad-btn"
        :class="{ 'dagonizer-dpad-btn--disabled': item.disabled }"
        :disabled="item.disabled"
        :title="item.title"
        :aria-label="item.title"
        @click="onPress(item.action)"
      >
        {{ item.label }}
      </button>
    </div>
  </div>
</template>
