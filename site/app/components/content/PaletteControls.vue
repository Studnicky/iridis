<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { CvdType } from '@studnicky/iridis';
import { OPTIONAL_STAGE_NAMES, useIridis } from '~/composables/useIridis.ts';
import { useIridisUiMachine } from '~/composables/useIridisUiMachine.ts';

/**
 * The engine's single input surface: pick seeds or an image, choose the
 * schema/contrast target, pick a framing — everything downstream (the
 * carousel cards, the spectrum) is a read-only view of what this panel feeds
 * the engine. Lives above the carousel, not inside it, so the input controls
 * never scroll away with whichever card is currently facing front.
 *
 * Seed edits, image extraction, and every select/switch here route through
 * the shared FSM (send()) — the actual mutations happen in useIridis.ts's
 * effect handlers (MUTATE_SEEDS/PIN_SEED_ROLE/SET_PALETTE_PARAM/EXTRACT_IMAGE).
 *
 * "Pin to role" lets a seed claim any role this page actually renders somewhere
 * — a Nuxt UI alias (success/warning/info/etc.), a --ui-* CSS var, or a
 * syntax-* token color — including schema-derived roles that would otherwise
 * be hue-rotated from brand by ExpandFamily (pin:derivedRoles overrides that;
 * see PinDerivedRoles.ts). pinnableRoles is restricted to USED_ROLE_NAMES so a
 * pin can never silently do nothing.
 */
const {
  pickerSeeds, pinnableRoles, framing, schemaName, contrastLevel, mode, imageSeeds, running,
  enabledOptionalStages, toggleOptionalStage, cvdCorrect, cvdPreviewType, contrastReport
} = useIridis();
const { send } = useIridisUiMachine();

const schemaItems = ['iridis-4', 'iridis-8', 'iridis-12', 'iridis-16', 'iridis-32'];
const UNPINNED = '__unpinned__';
const roleItems = computed(() => [{ 'label': 'Unpinned', 'value': UNPINNED }, ...pinnableRoles.value.map((r) => {return { 'label': r, 'value': r };})]);

/** The four simulable CVD types, in display order; a fifth "Off" pill clears the preview. */
const CVD_PREVIEW_TYPES: { label: string; value: CvdType }[] = [
  { label: 'Protanopia',     value: 'protanopia' },
  { label: 'Deuteranopia',   value: 'deuteranopia' },
  { label: 'Tritanopia',     value: 'tritanopia' },
  { label: 'Achromatopsia',  value: 'achromatopsia' }
];

/** Human labels for the optional contrast-check stages, in display order. */
const OPTIONAL_STAGE_LABELS: Record<string, string> = {
  'enforce:apca':        'APCA',
  'enforce:cvdSimulate':  'CVD simulate',
  'enforce:wcagAA':      'WCAG AA',
  'enforce:wcagAAA':     'WCAG AAA'
};
const optionalStageItems = computed(() => OPTIONAL_STAGE_NAMES.map((name) => {return { label: OPTIONAL_STAGE_LABELS[name] ?? name, name };}));
const cvdSimulateEnabled = computed(() => enabledOptionalStages.value.has('enforce:cvdSimulate'));

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
  if (cvdSimulateEnabled.value && report.cvd !== undefined) {
    const cvd = report.cvd as { warnings: unknown[]; corrections?: unknown[] };
    const corrected = cvd.corrections?.length ?? 0;
    const color = cvd.warnings.length === 0 ? 'success' : (corrected > 0 ? 'warning' : 'neutral');
    const text = cvd.warnings.length === 0
      ? 'no warnings'
      : `${cvd.warnings.length} warning${cvd.warnings.length === 1 ? '' : 's'}${corrected > 0 ? ` (${corrected} auto-corrected)` : ''}`;
    summaries.push({ color, key: 'cvd', label: 'CVD simulate', text });
  }
  return summaries;
});

/** UFileUpload owns this ref; picking a file here is the only trigger for the EXTRACT_IMAGE(file) effect. */
const uploadedFile = ref<File | null>(null);
watch(uploadedFile, (file) => {
  if (file) {send({ file, 'source': 'file', 'type': 'EXTRACT_IMAGE' });}
});

function sample(): void {
  uploadedFile.value = null;
  send({ 'source': 'sample', 'type': 'EXTRACT_IMAGE' });
}
</script>

<template>
  <div class="space-y-5">
  <UCard>
    <template #header>
      <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div class="flex flex-wrap items-center gap-3">
          <ModeSwitch />
        </div>
        <span class="text-center font-semibold text-highlighted">Palette</span>
        <div class="flex justify-end">
          <USwitch
            :model-value="framing === 'dark'"
            size="lg"
            unchecked-icon="material-symbols:light-mode-rounded"
            checked-icon="material-symbols:dark-mode-rounded"
            :aria-label="framing === 'dark' ? 'Dark framing' : 'Light framing'"
            @update:model-value="send({ framing: $event ? 'dark' : 'light', type: 'SET_FRAMING' })"
          />
        </div>
      </div>
    </template>

    <div
      v-auto-animate
      class="space-y-5"
    >
      <p
        v-if="mode === 'picker'"
        class="text-sm text-muted"
      >
        Feed the engine any number of seeds — pin one to a role to skip the auto-resolver
        entirely.
      </p>
      <p
        v-else
        class="text-sm text-muted"
      >
        Drop an image or try a sample. Tune the extraction itself in the Histogram card below.
      </p>

      <div
        v-if="mode === 'picker'"
        v-auto-animate
        class="flex flex-wrap items-stretch gap-3 rounded-lg border-2 border-dashed border-default p-4"
      >
        <div
          v-for="(seed, i) in pickerSeeds"
          :key="i"
          class="flex flex-col gap-2 rounded-lg border border-default bg-elevated/50 p-2.5"
        >
          <div class="flex items-center gap-2">
            <input
              :value="seed.hex"
              type="color"
              class="h-10 w-10 cursor-pointer rounded-md border-0 bg-transparent"
              @input="send({ type: 'SET_SEED', index: i, hex: ($event.target as HTMLInputElement).value })"
            >
            <div class="flex flex-col">
              <span class="font-mono text-xs text-muted">{{ seed.hex }}</span>
              <UButton
                icon="i-material-symbols-close-rounded"
                color="neutral"
                variant="link"
                size="xs"
                class="-ml-1.5 p-0"
                :disabled="pickerSeeds.length <= 1"
                @click="send({ type: 'REMOVE_SEED', index: i })"
              >
                Remove
              </UButton>
            </div>
          </div>
          <USelect
            :model-value="seed.role ?? UNPINNED"
            :items="roleItems"
            value-key="value"
            size="xs"
            class="w-full"
            @update:model-value="send({ index: i, role: $event === UNPINNED ? undefined : ($event as string), type: 'PIN_SEED_ROLE' })"
          />
        </div>
        <div class="flex min-h-full items-center">
          <UButton
            icon="i-material-symbols-add-rounded"
            color="primary"
            variant="soft"
            size="sm"
            :disabled="pickerSeeds.length >= 8"
            @click="send({ type: 'ADD_SEED' })"
          >
            Add seed
          </UButton>
        </div>
      </div>

      <div
        v-else
        class="space-y-3"
      >
        <UFileUpload
          v-model="uploadedFile"
          accept="image/*"
          icon="i-material-symbols-upload-rounded"
          label="Drop an image, or click to browse"
          description="PNG, JPG, WEBP — extracts dominant colors on drop."
          class="w-full"
        >
          <template #actions="{ open }">
            <UButton
              icon="i-material-symbols-upload-rounded"
              color="primary"
              variant="soft"
              size="sm"
              @click="open()"
            >
              Browse
            </UButton>
            <UButton
              icon="i-material-symbols-auto-awesome-rounded"
              color="neutral"
              variant="soft"
              size="sm"
              @click="sample"
            >
              Try a sample
            </UButton>
          </template>
        </UFileUpload>
        <UBadge
          :color="running ? 'warning' : 'success'"
          variant="soft"
        >
          {{ running ? 'extracting…' : `${imageSeeds.length} colors` }}
        </UBadge>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-default pt-4">
        <div class="flex items-center gap-1.5">
          <UIcon
            name="i-material-symbols-layers-rounded"
            class="size-4 text-primary"
          />
          <span class="text-sm font-medium text-highlighted">Role schema</span>
        </div>
        <USelect
          :model-value="schemaName"
          :items="schemaItems"
          size="sm"
          class="w-40"
          @update:model-value="send({ schemaName: $event as string, type: 'SET_SCHEMA' })"
        />
      </div>
      <p class="-mt-3 text-sm text-muted">
        How many roles to resolve — <strong class="text-highlighted">iridis-4</strong> is
        the minimal set, <strong class="text-highlighted">iridis-32</strong> resolves the
        full token surface this site renders.
      </p>

    </div>
  </UCard>

  <UCard>
    <template #header>
      <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <span />
        <span class="flex items-center justify-center gap-1.5 text-center font-semibold text-highlighted">
          <UIcon
            name="i-material-symbols-contrast-rounded"
            class="size-4 text-primary"
          />
          Contrast target
        </span>
        <span />
      </div>
    </template>

    <div class="space-y-4">
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-2">
          <p class="text-xs font-medium uppercase tracking-wide text-dimmed">
            Base contrast target
          </p>
          <USelect
            :model-value="contrastLevel"
            :items="['AA', 'AAA']"
            class="w-full"
            @update:model-value="send({ contrastLevel: $event as 'AA' | 'AAA', type: 'SET_CONTRAST' })"
          />
          <p class="text-sm text-muted">
            The level the always-on corrector (<code class="font-mono text-xs">enforce:contrast</code>)
            targets for every role pair. <strong class="text-highlighted">AA</strong> is the WCAG 2.1
            minimum: 4.5:1 for normal text, 3:1 for large text (18pt+, or 14pt+ bold).
            <strong class="text-highlighted">AAA</strong> is the enhanced level: 7:1 / 4.5:1.
          </p>
        </div>

        <div class="space-y-2">
          <p class="text-xs font-medium uppercase tracking-wide text-dimmed">
            Additional checks
          </p>
          <p class="text-sm text-muted">
            Opt-in, independent verification/correction passes layered on top of the base
            corrector above — each checks against its own standard: WCAG 2.1, APCA (a
            perceptual contrast algorithm), or a color-vision-deficiency simulation.
          </p>
          <div class="space-y-1.5">
            <UCheckbox
              v-for="item in optionalStageItems"
              :key="item.name"
              :model-value="enabledOptionalStages.has(item.name)"
              :label="item.label"
              @update:model-value="toggleOptionalStage(item.name)"
            />
          </div>
        </div>
      </div>

      <div
        v-if="cvdSimulateEnabled"
        class="grid gap-3 border-t border-default pt-4 sm:grid-cols-2"
      >
        <div class="flex items-center justify-between gap-3 rounded-md border border-default p-2.5 pl-3">
          <div class="flex flex-col">
            <span class="text-sm font-medium">Auto-correct CVD failures</span>
            <span class="text-xs text-muted">Adjusts the palette itself.</span>
          </div>
          <USwitch
            :model-value="cvdCorrect"
            @update:model-value="cvdCorrect = $event"
          />
        </div>

        <div class="space-y-1.5 rounded-md border border-dashed border-primary/50 bg-primary/5 p-2.5 pl-3">
          <div class="flex items-center justify-between gap-3">
            <span class="text-sm font-medium">Simulate CVD vision</span>
            <UButton
              v-if="cvdPreviewType"
              label="Off"
              color="neutral"
              variant="ghost"
              size="xs"
              @click="cvdPreviewType = null;"
            />
          </div>
          <div class="flex flex-wrap gap-1">
            <UButton
              v-for="t in CVD_PREVIEW_TYPES"
              :key="t.value"
              :label="t.label"
              size="xs"
              :color="cvdPreviewType === t.value ? 'primary' : 'neutral'"
              :variant="cvdPreviewType === t.value ? 'solid' : 'soft'"
              @click="cvdPreviewType = cvdPreviewType === t.value ? null : t.value;"
            />
          </div>
          <p class="text-xs text-muted">
            Changes how this page looks to you — it does not touch the palette.
          </p>
        </div>
      </div>

      <div
        v-if="stageSummaries.length"
        class="flex flex-wrap gap-1.5"
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

      <a
        href="https://www.w3.org/WAI/WCAG21/quickref/"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-1 text-sm text-primary underline underline-offset-2 hover:text-primary/80"
      >
        WCAG 2.1 quick reference ↗
      </a>
    </div>
  </UCard>
  </div>
</template>
