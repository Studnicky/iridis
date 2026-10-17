<script setup lang="ts">
import type { RoleMathEntry } from '~/composables/types/roleMathEntry.ts';
import { computed } from 'vue';
import { buildRoleMathStatusModel } from './roleMath/buildRoleMathStatusModel.ts';

const props = defineProps<{
  role: RoleMathEntry;
}>();

const statusModel = computed(() => buildRoleMathStatusModel.build(props.role));
</script>

<template>
  <UBadge
    :color="statusModel.presentation.badgeColor()"
    variant="subtle"
    size="sm"
  >
    {{ statusModel.presentation.badgeLabel() }}
  </UBadge>
</template>
