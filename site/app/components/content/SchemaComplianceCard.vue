<script setup lang="ts">
import { IridisUiActionType } from '~/composables/types/index.ts';
import { computed } from 'vue';
import { useIridis } from '~/composables/useIridis.ts';
import { useIridisUiMachine } from '~/composables/useIridisUiMachine.ts';
import DerivationSettings from './DerivationSettings.vue';

/**
 * Schema & Compliance — role-count schema, color space, contrast strictness,
 * CVD auto-correct/preview, and derivation settings. A Refine-stage carousel
 * card: it configures how the engine resolves and validates roles, the same
 * stage that assigns them (Palette) and previews CVD vision.
 */
const {
  schemaName, contrastStrictness, colorSpace,
  cvdCorrect, contrastReport, cvdPreviewTypes, enabledOptionalStages
} = useIridis();
const { send } = useIridisUiMachine();

const schemaItems = ['iridis-4', 'iridis-8', 'iridis-12', 'iridis-16', 'iridis-32'];

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
  if (report.cvd !== undefined) {
    const cvd = report.cvd as { warnings: unknown[]; corrections?: unknown[] };
    const corrected = cvd.corrections?.length ?? 0;
    const color = cvd.warnings.length === 0 ? 'success' : (corrected > 0 ? 'warning' : 'neutral');
    const text = cvd.warnings.length === 0
      ? 'no warnings'
      : `${cvd.warnings.length} warning${cvd.warnings.length === 1 ? '' : 's'}${corrected > 0 ? ` (${corrected} auto-corrected)` : ''}`;
    summaries.push({ color, key: 'cvd', label: 'CVD check', text });
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
          <div class="w-full space-y-2">
            <BalancedWrap
              :items="schemaItems"
              :min-width="48"
              :gap="8"
            >
              <template #default="{ item: s }">
                <button
                  type="button"
                  class="schema-pill flex-1 justify-center text-[11px] font-medium"
                  :class="schemaName === s ? 'text-primary font-bold' : 'text-dimmed cursor-pointer hover:text-muted'"
                  :aria-pressed="schemaName === s"
                  @click="send({ type: IridisUiActionType.SET_SCHEMA, schemaName: s })"
                >
                  {{ s.replace('iridis-', '') }}
                </button>
              </template>
            </BalancedWrap>
            <USlider
              :model-value="Math.max(0, schemaItems.indexOf(schemaName))"
              :min="0"
              :max="schemaItems.length - 1"
              :step="1"
              @update:model-value="send({ type: IridisUiActionType.SET_SCHEMA, schemaName: schemaItems[Number($event)] || 'iridis-32' })"
            />
          </div>
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
            @update:model-value="($event) => { send({ colorSpace: $event as 'srgb' | 'displayP3', type: IridisUiActionType.SET_COLOR_SPACE }); send({ targetId: 'pairingPreview', type: IridisUiActionType.NAVIGATE_TO_TARGET }); }"
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
                @click="() => { send({ strictness: 0, type: IridisUiActionType.SET_CONTRAST_STRICTNESS }); send({ targetId: 'cvd', type: IridisUiActionType.NAVIGATE_TO_TARGET }); }"
              >AA</span>
              <span
                :class="contrastStrictness === 1 ? 'text-primary' : 'cursor-pointer hover:text-muted'"
                @click="() => { send({ strictness: 1, type: IridisUiActionType.SET_CONTRAST_STRICTNESS }); send({ targetId: 'cvd', type: IridisUiActionType.NAVIGATE_TO_TARGET }); }"
              >AAA</span>
              <span
                :class="contrastStrictness === 2 ? 'text-primary' : 'cursor-pointer hover:text-muted'"
                @click="() => { send({ strictness: 2, type: IridisUiActionType.SET_CONTRAST_STRICTNESS }); send({ targetId: 'cvd', type: IridisUiActionType.NAVIGATE_TO_TARGET }); }"
              >APCA</span>
            </div>
            <USlider
              :model-value="contrastStrictness"
              :min="0"
              :max="2"
              :step="1"
              @update:model-value="($event) => { send({ strictness: $event as number, type: IridisUiActionType.SET_CONTRAST_STRICTNESS }); send({ targetId: 'cvd', type: IridisUiActionType.NAVIGATE_TO_TARGET }); }"
            />
          </div>
        </div>

        <div class="space-y-2">
          <div class="flex items-center justify-between gap-3 rounded-md border border-default p-2.5 pl-3">
            <div class="flex flex-col">
              <span class="text-sm font-medium">Auto-correct CVD failures</span>
              <span class="text-xs text-muted">Also always-on — adjusts the palette itself, same as the level above.</span>
            </div>
            <USwitch
              :model-value="cvdCorrect"
              @update:model-value="($event) => { send({ cvdCorrect: $event as boolean, type: IridisUiActionType.SET_CVD_CORRECT }); send({ targetId: 'motion', type: IridisUiActionType.NAVIGATE_TO_TARGET }); }"
            />
          </div>
          <div class="space-y-1.5 rounded-md border border-dashed border-primary/50 bg-primary/5 p-2.5 pl-3">
            <div class="flex items-center justify-between gap-3">
              <span class="text-sm font-medium">Simulate CVD vision</span>
              <UButton
                label="Off"
                color="neutral"
                :disabled="cvdPreviewTypes.size === 0"
                variant="ghost"
                size="xs"
                @click="send({ type: IridisUiActionType.CVD_CLEAR_PREVIEWS })"
              />
            </div>
            <BalancedWrap
              :items="[
                { label: 'Protanopia', value: 'protanopia' },
                { label: 'Deuteranopia', value: 'deuteranopia' },
                { label: 'Tritanopia', value: 'tritanopia' },
                { label: 'Achromatopsia', value: 'achromatopsia' }
              ]"
              :min-width="80"
              :gap="4"
            >
              <template #default="{ item: t }">
                <UButton
                  :label="cvdPreviewTypes.has(t.value as any) ? `${t.label} ✓` : t.label"
                  size="xs"
                  :color="cvdPreviewTypes.has(t.value as any) ? 'primary' : 'neutral'"
                  :variant="cvdPreviewTypes.has(t.value as any) ? 'solid' : 'soft'"
                  class="flex-1 justify-center"
                  :aria-pressed="cvdPreviewTypes.has(t.value as any)"
                  @click="send({ cvdType: t.value, type: IridisUiActionType.CVD_TOGGLE_PREVIEW })"
                />
              </template>
            </BalancedWrap>
            <p class="text-xs text-muted">
              Changes how this page looks to you — it does not touch the palette.
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-6 pt-4 border-t border-default/50">
      <DerivationSettings />
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

<style scoped>
.schema-pill {
  display: flex;
  align-items: center;
  padding: 0.15rem 0;
  background: transparent;
  border: none;
}
</style>
