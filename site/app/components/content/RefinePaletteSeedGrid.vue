<script setup lang="ts">
import { computed } from 'vue';
import { buildRefinePaletteSeedGridModel } from './refine/buildRefinePaletteSeedGridModel.ts';

const props = defineProps<{
  activeSeeds: readonly { hex: string; role?: string }[];
  sortedPinnableRoles: readonly string[];
}>();

const emit = defineEmits<{
  pin: [index: number, role: string | undefined];
}>();

const seedGridModel = computed(() => buildRefinePaletteSeedGridModel(props.activeSeeds));
</script>

<template>
  <BalancedWrap
    v-auto-animate
    :items="[...seedGridModel.balancedSeeds]"
    :min-width="210"
    :gap="12"
  >
    <template #default="{ item: card, index: i }">
      <SeedCard
        :hex="card.hex"
        class="flex-1 max-w-xs"
        :aria-label="`Seed color ${card.hex}`"
      >
        <SeedRolePicker
          :current-role="card.role"
          :index="i"
          :roles="sortedPinnableRoles"
          :seed-roles="seedGridModel.seedRoles"
          @pin="(index, role) => emit('pin', index, role)"
        />
      </SeedCard>
    </template>
  </BalancedWrap>
</template>
