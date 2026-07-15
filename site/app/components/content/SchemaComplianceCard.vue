<script setup lang="ts">
import { IridisUiActionType } from '~/composables/types/index.ts';
import { computed } from 'vue';
import { useIridis } from '~/composables/useIridis.ts';
import { useIridisUiMachine } from '~/composables/useIridisUiMachine.ts';
import { useNavigationTargets } from '~/composables/useNavigationTargets.ts';
import SchemaSelector from './SchemaSelector.vue';

/**
 * Schema & Compliance — role-count schema, color space, and contrast
 * strictness. A Refine-stage carousel card: it configures how the engine
 * resolves and validates roles, the same stage that assigns them (Palette).
 * All CVD auto-correct/preview controls live in the CVD vision card instead
 * — not duplicated here. Per-relation hue-derivation algorithms live in
 * their own Derivation Relations card (see DerivationRelations.vue).
 */
const {
  schemaName, contrastStrictness, colorSpace,
  contrastReport, enabledOptionalStages
} = useIridis();
const { send } = useIridisUiMachine();
/**
 * `send()` is fire-and-forget over an async EffectInterpreter — firing TWO
 * send() calls back-to-back in the same synchronous handler (the state
 * change, then a NAVIGATE_TO_TARGET) races: only the first lands before the
 * interpreter is still busy processing it, silently dropping the second.
 * activateTarget() is the actual underlying navigation implementation
 * (see useNavigationTargets.ts), called directly instead of routing a
 * second event through the FSM — same pattern UploadIntakeCard.vue uses.
 */
const { activateTarget } = useNavigationTargets();

/** Compact pass/fail summary badges for whichever optional stages are currently enabled. */
const stageSummaries = computed(() => {
  const summaries: { key: string; label: string; text: string; color: 'success' | 'warning' | 'neutral' }[] = [];
  const report = contrastReport.value;
  if (enabledOptionalStages.value.has('enforce:wcagAA') && report.aa !== undefined) {
    const pairs = (report.aa as { pairs: { pass: boolean }[] }).pairs;
    const passing = pairs.filter((p) => {return p.pass;}).length;
    summaries.push({ color: passing === pairs.length ? 'success' : 'warning', key: 'aa', label: 'WCAG AA', text: `${passing}/${pairs.length} pairs passing` });
  }
  if (enabledOptionalStages.value.has('enforce:wcagAAA') && report.aaa !== undefined) {
    const pairs = (report.aaa as { pairs: { pass: boolean }[] }).pairs;
    const passing = pairs.filter((p) => {return p.pass;}).length;
    summaries.push({ color: passing === pairs.length ? 'success' : 'warning', key: 'aaa', label: 'WCAG AAA', text: `${passing}/${pairs.length} pairs passing` });
  }
  if (enabledOptionalStages.value.has('enforce:apca') && report.apca !== undefined) {
    const pairs = (report.apca as { pairs: { pass: boolean }[] }).pairs;
    const passing = pairs.filter((p) => {return p.pass;}).length;
    summaries.push({ color: passing === pairs.length ? 'success' : 'warning', key: 'apca', label: 'APCA', text: `${passing}/${pairs.length} pairs passing` });
  }
  return summaries;
});
</script>

<template>
  <div class="space-y-4">
    <div class="grid gap-4 sm:grid-cols-2">
      <!-- LEFT COLUMN: Schema & Color Space -->
      <div class="space-y-4">
        <div class="space-y-2">
          <p class="text-xs font-medium uppercase tracking-wide text-dimmed">
            Role schema
          </p>
          <p class="text-sm text-muted">
            How many roles to resolve — <strong class="text-highlighted">iridis-4</strong> is the minimal set, <strong class="text-highlighted">iridis-32</strong> resolves the full token surface this site renders.
          </p>
          <SchemaSelector
            :model-value="schemaName"
            @update:model-value="send({ type: IridisUiActionType.SET_SCHEMA, schemaName: $event })"
          />
        </div>

        <div class="space-y-2">
          <p class="text-xs font-medium uppercase tracking-wide text-dimmed">
            Color Space
          </p>
          <USelect
            :model-value="colorSpace"
            :items="[{ label: 'sRGB', value: 'srgb' }, { label: 'Display P3', value: 'displayP3' }]"
            value-key="value"
            class="w-full"
            @update:model-value="($event) => { send({ colorSpace: $event as 'srgb' | 'displayP3', type: IridisUiActionType.SET_COLOR_SPACE }); activateTarget('pairingPreview'); }"
          />
          <p class="text-sm text-muted">
            The color space used when exporting CSS variables. <strong class="text-highlighted">Display P3</strong> allows for much wider gamut colors on compatible displays.
          </p>
        </div>
      </div>

      <!-- RIGHT COLUMN: Contrast Target -->
      <div class="space-y-4">
        <div class="space-y-2">
          <p class="text-xs font-medium uppercase tracking-wide text-dimmed">
            Compliance strictness
          </p>
          <p class="text-sm text-muted">
            <template v-if="contrastStrictness === 0">
              <strong class="text-highlighted">AA</strong> is the WCAG 2.1 minimum: 4.5:1 (3:1 for large text).
            </template>
            <template v-else-if="contrastStrictness === 1">
              <strong class="text-highlighted">AAA</strong> is the enhanced WCAG 2.1 level: 7:1 (4.5:1 for large text).
            </template>
            <template v-else>
              <strong class="text-highlighted">APCA</strong> is the modern perceptual contrast algorithm (target Lc).
            </template>
          </p>
          <div class="w-full space-y-2">
            <div class="flex w-full justify-between text-[11px] font-medium text-dimmed">
              <span
                :class="contrastStrictness === 0 ? 'text-primary' : 'cursor-pointer hover:text-muted'"
                @click="() => { send({ strictness: 0, type: IridisUiActionType.SET_CONTRAST_STRICTNESS }); activateTarget('cvd'); }"
              >AA</span>
              <span
                :class="contrastStrictness === 1 ? 'text-primary' : 'cursor-pointer hover:text-muted'"
                @click="() => { send({ strictness: 1, type: IridisUiActionType.SET_CONTRAST_STRICTNESS }); activateTarget('cvd'); }"
              >AAA</span>
              <span
                :class="contrastStrictness === 2 ? 'text-primary' : 'cursor-pointer hover:text-muted'"
                @click="() => { send({ strictness: 2, type: IridisUiActionType.SET_CONTRAST_STRICTNESS }); activateTarget('cvd'); }"
              >APCA</span>
            </div>
            <USlider
              :model-value="contrastStrictness"
              :min="0"
              :max="2"
              :step="1"
              @update:model-value="($event) => { send({ strictness: $event as number, type: IridisUiActionType.SET_CONTRAST_STRICTNESS }); activateTarget('cvd'); }"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mt-6 pt-4 border-t border-default/50">
      <!-- Links on left -->
      <a
        href="https://www.w3.org/WAI/WCAG21/quickref/"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-1 text-sm text-primary underline underline-offset-2 hover:text-primary/80"
      >
        WCAG 2.1 quick reference ↗
      </a>

      <!-- Warnings on right -->
      <div
        v-if="stageSummaries.length"
        class="flex flex-wrap justify-end gap-1.5"
      >
        <UBadge
          v-for="s in stageSummaries"
          :key="s.key"
          :color="s.color"
          variant="soft"
          size="sm"
        >
          {{ s.label }}: {{ s.text }}
        </UBadge>
      </div>
    </div>
  </div>
</template>
