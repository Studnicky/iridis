<script setup lang="ts">
import { useRoleMathList } from '~/composables/useRoleMathList.ts';

const { mathList } = useRoleMathList();

const openRoleName = ref<string | null>(null);
</script>

<template>
  <div class="space-y-6">
    <p class="text-sm text-muted">
      This shows the engine's hidden "hand" by revealing how every role was selected from the provided seeds. You can see the OKLCH distance for each candidate seed, whether a role had to be synthesized, and where input seeds were forcefully clamped to satisfy lightness, chroma, or semantic hue envelopes.
    </p>

    <RoleSortControls />

    <div
      v-if="mathList.length === 0"
      class="text-muted text-sm italic py-4"
    >
      No roles resolved yet.
    </div>

    <div
      v-else
      class="role-grid columns-1 md:columns-2 xl:columns-3"
    >
      <RoleMathCard
        v-for="role in mathList"
        :key="role.name"
        :role="role"
        :is-open="openRoleName === role.name"
        @toggle="openRoleName = openRoleName === role.name ? null : role.name"
      />
    </div>
  </div>
</template>

<style scoped>
.role-grid {
  column-gap: 0.75rem;
}
</style>
