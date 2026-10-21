<script setup lang="ts">
defineProps<{
  canvasRef: (element: unknown) => void;
  reducedMotion: boolean;
  roles: readonly { alias: string; label: string }[];
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
        <DocAnchorLink href="#living-color">
          Living Color
        </DocAnchorLink> for the palette-vector
        math and curve-evaluation packages behind the drift you're watching.
      </p>

      <div
        id="color-stream-role-legend"
        class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"
        role="list"
      >
        <ColorStreamRoleBand
          v-for="role in roles"
          :key="role.alias"
          :label="role.label"
        />
      </div>

      <canvas
        :ref="canvasRef"
        aria-describedby="color-stream-role-legend"
        aria-label="Live chroma drift and naive RGB versus OKLCH interpolation comparison for six decorative palette roles"
        class="w-full rounded border border-default bg-default"
        role="img"
      />
    </div>
  </UCard>
</template>
