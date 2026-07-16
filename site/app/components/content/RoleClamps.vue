<script setup lang="ts">
import { useRoleMathList } from '~/composables/useRoleMathList.ts';

const { mathList } = useRoleMathList();

const openRoleName = ref<string | null>(null);
</script>

<template>
  <div class="space-y-6">
    <SectionIntro body="This shows the engine's hidden &quot;hand&quot; by revealing how every role was selected from the provided seeds. You can see the OKLCH distance for each candidate seed, whether a role had to be synthesized, and where input seeds were forcefully clamped to satisfy lightness, chroma, or semantic hue envelopes." />

    <RoleSortControls />

    <div
      v-if="mathList.length === 0"
      class="text-muted text-sm italic py-4"
    >
      No roles resolved yet.
    </div>

    <div
      v-else
    >
      <RoleMathGrid
        :roles="mathList"
        :open-role-name="openRoleName"
        @toggle="(roleName) => openRoleName = openRoleName === roleName ? null : roleName"
      />
    </div>
  </div>
</template>
