<script setup lang="ts">
import type { RoleMathEntryType } from '~/composables/types/roleMathEntry.ts';
import { computed } from 'vue';
import { buildRoleMathStatusModel } from './roleMath/buildRoleMathStatusModel.ts';

const props = defineProps<{
  role: RoleMathEntryType;
}>();

const statusModel = computed(() => buildRoleMathStatusModel(props.role));
</script>

<template>
  <UBadge
    :color="statusModel.color"
    variant="subtle"
    size="sm"
  >
    {{ statusModel.label }}
  </UBadge>
</template>
