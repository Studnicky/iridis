<script setup lang="ts">
defineProps<{
  animation: {
    kind: 'dot' | 'orbit' | 'sonar' | 'radar' | 'chroma';
    class?: string;
    duration: string;
    label: string;
    note: string;
  };
}>();
</script>

<template>
  <SpecimenCard
    :label="`${animation.label} · ${animation.duration}`"
    :note="animation.note"
    class="flex flex-col items-center gap-2 text-center"
  >
    <template #default>
      <div class="relative flex h-14 w-14 items-center justify-center">
        <div
          v-if="animation.kind === 'dot'"
          class="glass flex h-12 w-12 items-center justify-center rounded-full"
          :class="animation.class !== 'glass' ? animation.class : ''"
        >
          <span
            class="h-3 w-3 rounded-full"
            :style="{ backgroundColor: 'var(--ui-primary)' }"
          />
        </div>
        <div
          v-else-if="animation.kind === 'orbit'"
          class="orbit-rig"
        >
          <div class="orbit-ring r1">
            <span class="orbit-orb" />
          </div>
          <div class="orbit-ring r2">
            <span class="orbit-orb" />
          </div>
          <div class="orbit-ring r3">
            <span class="orbit-orb" />
          </div>
        </div>
        <template v-else-if="animation.kind === 'sonar'">
          <span class="sonar-ring" />
          <span class="sonar-dot n" />
          <span class="sonar-dot e" />
          <span class="sonar-dot s" />
          <span class="sonar-dot w" />
        </template>
        <div
          v-else-if="animation.kind === 'radar'"
          class="glass h-12 w-12 rounded-full"
        >
          <span class="radar-sweep" />
        </div>
        <div
          v-else-if="animation.kind === 'chroma'"
          class="chroma-cycle"
        />
      </div>
    </template>
  </SpecimenCard>
</template>
