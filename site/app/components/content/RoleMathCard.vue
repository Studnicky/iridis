<script setup lang="ts">
import type { RoleMathEntry } from '~/composables/useRoleMathList.ts';

defineProps<{
  role: RoleMathEntry;
  isOpen: boolean;
}>();

const emit = defineEmits<{ toggle: [] }>();

const ALGORITHM_LABELS: Record<string, string> = {
  'monochromatic': 'Monochromatic — no hue shift',
  'complementary': 'Complementary — hue sits 180° from the seed',
  'analogous': 'Analogous — hues sit 30° on either side of the seed',
  'triadic': 'Triadic — hues spaced 120° apart around the wheel',
  'tetradic': 'Tetradic — hues spaced 90° apart around the wheel',
  'split-complementary': 'Split-complementary — hues sit 30° on either side of the complement',
  'compound': 'Compound — analogous hues around both the seed and its complement',
  'freeform': 'Freeform — user-specified hue offsets',
};
</script>

<template>
  <div class="flex flex-col rounded-lg border border-default bg-elevated text-sm overflow-hidden break-inside-avoid mb-3">
    <button
      type="button"
      class="flex items-center justify-between gap-2 p-3 text-left"
      :data-state="isOpen ? 'open' : 'closed'"
      @click="emit('toggle')"
    >
      <div class="flex items-center gap-2 min-w-0">
        <div class="text-sm font-semibold text-highlighted truncate">{{ role.name }}</div>
        <div class="h-4 w-4 rounded shadow-inner flex-none border border-default" :style="{ backgroundColor: role.hex }" :title="role.hex" />
        <UBadge v-if="role.synthesized" color="warning" variant="subtle" size="sm">Synthesized</UBadge>
        <UBadge v-else-if="role.isDerived" color="secondary" variant="subtle" size="sm">Derived</UBadge>
        <UBadge v-else-if="role.isPinned" color="info" variant="subtle" size="sm">Explicit Pin</UBadge>
        <UBadge v-else-if="role.clamp" color="primary" variant="subtle" size="sm">Clamped</UBadge>
        <UBadge v-else color="success" variant="subtle" size="sm">Direct Match</UBadge>
      </div>
      <UIcon
        name="i-lucide-chevron-down"
        class="ml-auto size-4 flex-none transition-transform data-[state=open]:rotate-180"
        :data-state="isOpen ? 'open' : 'closed'"
      />
    </button>

    <div v-if="isOpen" class="flex flex-col gap-2 px-3 pb-3">
      <div v-if="role.synthesized" class="text-xs text-muted italic">
        No seed was close enough (all candidates exceeded the maximum acceptable OKLCH distance for this role's semantic hue/chroma). A new color was mathematically synthesized.
      </div>
      <div v-else-if="role.isDerived" class="text-xs text-muted italic space-y-2">
        <div>This role is derived from <strong class="text-highlighted uppercase">{{ role.parentRole }}</strong>. Its color is computed by offsetting the parent's OKLCH values according to the schema below.</div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
          <div class="bg-black/10 dark:bg-black/30 p-2 rounded border border-default/30 flex flex-col" v-if="role.def?.lightnessTarget !== undefined">
            <span class="text-dimmed uppercase text-[10px]">Lightness Target</span>
            <span class="text-primary font-mono font-bold">{{ role.def.lightnessTarget.toFixed(3) }}</span>
          </div>
          <div class="bg-black/10 dark:bg-black/30 p-2 rounded border border-default/30 flex flex-col" v-if="role.def?.lightnessClamp !== undefined">
            <span class="text-dimmed uppercase text-[10px]">Lightness Clamp</span>
            <span class="text-primary font-mono font-bold">{{ role.def.lightnessClamp.toFixed(3) }}</span>
          </div>
          <div class="bg-black/10 dark:bg-black/30 p-2 rounded border border-default/30 flex flex-col" v-if="role.def?.chromaTarget !== undefined">
            <span class="text-dimmed uppercase text-[10px]">Chroma Target</span>
            <span class="text-primary font-mono font-bold">{{ role.def.chromaTarget.toFixed(3) }}</span>
          </div>
          <div class="bg-black/10 dark:bg-black/30 p-2 rounded border border-default/30 flex flex-col" v-if="role.def?.chromaClamp !== undefined">
            <span class="text-dimmed uppercase text-[10px]">Chroma Clamp</span>
            <span class="text-primary font-mono font-bold">{{ role.def.chromaClamp.toFixed(3) }}</span>
          </div>
          <div class="bg-black/10 dark:bg-black/30 p-2 rounded border border-default/30 flex flex-col" v-if="role.def?.hue !== undefined">
            <span class="text-dimmed uppercase text-[10px]">Hue Angle</span>
            <span class="text-primary font-mono font-bold">{{ role.def.hue }}&deg;</span>
          </div>
          <div class="bg-black/10 dark:bg-black/30 p-2 rounded border border-default/30 flex flex-col" v-if="role.def?.hueClamp !== undefined">
            <span class="text-dimmed uppercase text-[10px]">Hue Clamp</span>
            <span class="text-primary font-mono font-bold">{{ role.def.hueClamp }}&deg;</span>
          </div>
        </div>

        <div v-if="role.algorithmInfo" class="mt-2 pt-2 border-t border-default/30 space-y-1">
          <div class="text-[10px] uppercase tracking-wide text-dimmed not-italic font-medium">Hue-derivation algorithm</div>
          <div class="not-italic text-highlighted">{{ ALGORITHM_LABELS[role.algorithmInfo.hueAlgorithm] ?? role.algorithmInfo.hueAlgorithm }}</div>
          <div class="not-italic font-mono text-[11px] text-muted">
            Seed hue {{ Math.round(role.algorithmInfo.baseHue) }}&deg; &rarr; computed {{ role.algorithmInfo.computedHues.map(h => `${Math.round(h)}°`).join(', ') }}
          </div>
        </div>
      </div>
      <div v-else-if="role.isPinned" class="text-xs text-muted italic space-y-1">
        <div>This role was explicitly pinned by the user, so distance-matching against candidate seeds was skipped entirely.</div>
        <div v-if="role.pinnedSeedHex" class="not-italic flex items-center gap-2 mt-1">
          <div class="h-5 w-5 rounded shadow-inner flex-none border border-default" :style="{ backgroundColor: role.pinnedSeedHex }" />
          <span class="font-mono text-[11px] text-highlighted">{{ role.pinnedSeedHex }}</span>
          <span class="text-dimmed">— pinned seed hex</span>
        </div>
      </div>
      <div v-else class="space-y-2">
        <div class="text-xs font-medium uppercase tracking-wide text-dimmed">Candidates</div>
        <div class="space-y-1">
          <div
            v-for="cand in role.candidates.slice(0, 4)"
            :key="cand.hex"
            class="flex items-center gap-3 p-1.5 rounded-md"
            :class="cand.isWinner ? 'bg-primary/10 border border-primary/20' : 'opacity-70'"
          >
            <div class="h-5 w-5 rounded shadow-inner flex-none" :style="{ backgroundColor: cand.hex }" />
            <div class="flex-1 text-xs font-mono">{{ cand.hex.toLowerCase() }}</div>
            <div class="text-xs font-mono" :class="cand.isWinner ? 'text-primary font-bold' : 'text-muted'">
              Δ {{ cand.dist.toFixed(4) }}
            </div>
          </div>
          <div v-if="role.candidates.length > 4" class="text-[10px] text-dimmed italic pl-1.5">
            +{{ role.candidates.length - 4 }} more candidate{{ role.candidates.length - 4 === 1 ? '' : 's' }}, not shown
          </div>
        </div>
      </div>

      <!-- Clamping -->
      <div v-if="role.clamp" class="mt-2 pt-3 border-t border-default/50 space-y-2">
        <div class="text-xs font-medium uppercase tracking-wide text-dimmed">Clamp applied</div>
        <div class="flex items-center gap-3">
          <div class="h-6 w-6 rounded border border-default shadow-inner flex-none" :style="{ backgroundColor: role.clamp.seedHex }" />
          <div class="flex flex-col min-w-0">
            <span class="text-[10px] text-muted truncate">{{ role.clamp.seedOklch }}</span>
          </div>
        </div>
        <div class="flex justify-start ml-2.5 text-muted">
          <UIcon name="i-material-symbols-arrow-downward-rounded" class="h-3 w-3" />
        </div>
        <div class="flex items-center gap-3">
          <div class="h-6 w-6 rounded border border-default shadow-inner flex-none" :style="{ backgroundColor: role.clamp.resolvedHex }" />
          <div class="flex flex-col min-w-0">
            <span class="text-[10px] text-primary truncate">{{ role.clamp.roleOklch }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
