<script setup lang="ts">
import { useIridis } from '~/composables/useIridis.ts';
import { colorRecordFactory } from '@studnicky/iridis';
import { computed } from 'vue';

const { roleViews, activeSeeds } = useIridis();

// Recreate the seed matching logic from the old looseEnvelope feature
const roleClamps = computed(() => {
  const seeds = activeSeeds.value;
  if (seeds.length === 0) return [];

  return roleViews.value.map(role => {
    let bestSeedHex = '';
    let minDistance = Infinity;
    let seedL = 0;
    let seedC = 0;
    let seedH = 0;

    // Convert role to OKLCH (we have l, c, h in role)
    const roleL = role.l;
    const roleC = role.c;
    const roleH = role.h;

    for (const hex of seeds) {
      if (!/^#[0-9a-fA-F]{6}$/i.test(hex)) continue;
      try {
        const seedRec = colorRecordFactory.fromHex(hex);
        const dL = seedRec.oklch.l - roleL;
        const dC = seedRec.oklch.c - roleC;
        const dh = ((seedRec.oklch.h - roleH + 540) % 360) - 180;
        const dist = dL * dL + dC * dC + (dh / 360) * (dh / 360);
        if (dist < minDistance) {
          minDistance = dist;
          bestSeedHex = hex;
          seedL = seedRec.oklch.l;
          seedC = seedRec.oklch.c;
          seedH = seedRec.oklch.h;
        }
      } catch { /* skip invalid hex */ }
    }

    const clamped = bestSeedHex.toLowerCase() !== role.hex.toLowerCase();
    
    return {
      name: role.name,
      seedHex: bestSeedHex.toLowerCase(),
      resolvedHex: role.hex.toLowerCase(),
      seedOklch: `L ${seedL.toFixed(2)} · C ${seedC.toFixed(2)} · H ${Math.round(seedH)}`,
      roleOklch: `L ${roleL.toFixed(2)} · C ${roleC.toFixed(2)} · H ${Math.round(roleH)}`,
      clamped
    };
  }).filter(r => r.clamped);
});
</script>

<template>
  <div class="space-y-4">
    <p class="text-sm text-muted">
      Shows the engine's hidden "hand" by revealing roles where the input seed was forcefully clamped to satisfy lightness, chroma, or semantic hue envelopes.
    </p>

    <div v-if="roleClamps.length === 0" class="text-muted text-sm italic py-4">
      No aggressive clamping was needed for this palette. All resolved roles are identical to their assigned seeds.
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="clamp in roleClamps"
        :key="clamp.name"
        class="flex flex-col gap-3 rounded-lg border border-default bg-elevated p-3 text-sm"
      >
        <div class="font-bold text-highlighted">{{ clamp.name }}</div>
        
        <!-- Before -->
        <div class="flex items-center gap-3">
          <div class="h-8 w-8 rounded-md border border-default shadow-inner flex-none" :style="{ backgroundColor: clamp.seedHex }" />
          <div class="flex flex-col min-w-0">
            <span class="text-xs font-mono truncate">{{ clamp.seedHex }}</span>
            <span class="text-[10px] text-muted truncate">{{ clamp.seedOklch }}</span>
          </div>
        </div>

        <div class="flex justify-start ml-3 text-muted">
          <UIcon name="i-material-symbols-arrow-downward-rounded" class="h-4 w-4" />
        </div>

        <!-- After -->
        <div class="flex items-center gap-3">
          <div class="h-8 w-8 rounded-md border border-default shadow-inner flex-none" :style="{ backgroundColor: clamp.resolvedHex }" />
          <div class="flex flex-col min-w-0">
            <span class="text-xs font-mono font-medium truncate">{{ clamp.resolvedHex }}</span>
            <span class="text-[10px] text-primary truncate">{{ clamp.roleOklch }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
