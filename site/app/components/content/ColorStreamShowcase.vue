<script setup lang="ts">
defineProps<{
  reducedMotion: boolean;
  roles: readonly { alias: string; label: string }[];
  liveRefAt: (index: number) => (el: unknown) => void;
  naiveRefAt: (index: number) => (el: unknown) => void;
  engineRefAt: (index: number) => (el: unknown) => void;
}>();
</script>

<template>
  <UCard>
    <UBadge
      v-if="reducedMotion"
      color="warning"
      variant="soft"
      class="mb-3"
    >
      prefers-reduced-motion is on
    </UBadge>

    <div class="space-y-3">
      <SectionIntro body="Six independent seismograph strips — one per decorative role — tracing that role's live chroma drift, oldest at the left, newest at the right, each segment colored by its own computed hex. Beneath each, a static comparison: a naive RGB channel lerp against the engine's OKLCH lerp, both spanning the same complementary hue swing — the naive band often dips through a muddy, desaturated midpoint that the OKLCH band avoids." />

      <p class="text-xs text-muted">
        This is <strong class="text-highlighted">Living Color</strong> in motion — see
        <DocAnchorLink href="#living-color">Living Color</DocAnchorLink> for the palette-vector
        math and curve-evaluation packages behind the drift you're watching.
      </p>

      <div class="space-y-4">
        <ColorStreamRoleBand
          v-for="(role, index) in roles"
          :key="role.alias"
          :label="role.label"
          :live-ref="liveRefAt(index)"
          :naive-ref="naiveRefAt(index)"
          :engine-ref="engineRefAt(index)"
        />
      </div>
    </div>
  </UCard>
</template>
