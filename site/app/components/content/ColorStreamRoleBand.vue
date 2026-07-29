<script setup lang="ts">
defineProps<{
  label: string;
  liveRef: (el: unknown) => void;
  naiveRef: (el: unknown) => void;
  engineRef: (el: unknown) => void;
}>();
</script>

<template>
  <div class="space-y-1">
    <StreamBand :label="`${label} — engine-driven (live)`">
      <canvas
        :ref="liveRef"
        width="640"
        height="48"
        class="w-full rounded border border-default"
        style="height: 48px;"
      />
    </StreamBand>

    <div class="grid grid-cols-2 gap-2 pt-1">
      <StreamBand label="CSS lerp (naive RGB)">
        <canvas
          :ref="naiveRef"
          width="320"
          height="24"
          class="w-full rounded border border-default"
          style="height: 24px;"
        />
      </StreamBand>
      <StreamBand label="OKLCH engine">
        <canvas
          :ref="engineRef"
          width="320"
          height="24"
          class="w-full rounded border border-default"
          style="height: 24px;"
        />
      </StreamBand>
    </div>
  </div>
</template>
