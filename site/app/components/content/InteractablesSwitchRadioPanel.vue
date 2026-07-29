<script setup lang="ts">
import { ref } from 'vue';

const notifyEnabled = ref(true);
const density = ref('cozy');
const densityOptions = ['compact', 'cozy', 'spacious'];
</script>

<template>
  <InfoPanel
    variant="default"
    label="Switch & radio"
    class="space-y-3"
  >
    <div class="flex items-center justify-between">
      <span class="text-xs text-muted">Notifications</span>
      <USwitch v-model="notifyEnabled" />
    </div>
    <URadioGroup
      v-model="density"
      :items="densityOptions"
      orientation="horizontal"
      size="sm"
    />
  </InfoPanel>
</template>
