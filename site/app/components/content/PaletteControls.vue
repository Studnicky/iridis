<script setup lang="ts">
import { IridisUiActionType } from '~/composables/types/index.ts';
import type { GalleryAlgorithmType } from '~/composables/types/galleryAlgorithm.ts';
import { computed, ref, watch } from 'vue';
import { useIridis } from '~/composables/useIridis.ts';
import { useIridisUiMachine } from '~/composables/useIridisUiMachine.ts';
import AccordionPanel from '~/components/layout/AccordionPanel.vue';
import DerivationSettings from './DerivationSettings.vue';

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
  pickerSeeds, pinnableRoles, schemaName, contrastStrictness, colorSpace, mode, imageSeeds, running,
  enabledOptionalStages, cvdCorrect, contrastReport, histogram, lastImageSrc,
  imgAlgorithm, imgHistogramBits, imgDeltaECap, imgHarmonize, imgLightnessRange, imgChromaRange,
  cvdPreviewTypes
} = useIridis();
const { send } = useIridisUiMachine();

const schemaItems = ['iridis-4', 'iridis-8', 'iridis-12', 'iridis-16', 'iridis-32'];
const algorithmItems = [
  { 'label': 'ΔE (delta-e)', 'value': 'delta-e' },
  { 'label': 'Median cut', 'value': 'median-cut' },
  { 'label': 'Wu quantize', 'value': 'wu-quantize' },
  { 'label': 'K-means', 'value': 'k-means' }
];
/** One-line "what is this and when would I pick it" for each clustering algorithm — shown under the select so the choice isn't just four unexplained names. */
const algorithmHelp: Record<string, string> = {
  'delta-e':     'Agglomerative merging by perceptual color difference (ΔE2000). Tends to keep small but visually distinct colors that box-splitting algorithms merge away.',
  'median-cut':  'Recursive box splitting at the median of the widest channel. Fast, one-shot, the long-standing default — but a median split can bisect a small distinct cluster.',
  'wu-quantize': 'Recursive box splitting like median cut, but each split lands where it minimizes total clustering error instead of at the median. One-shot, usually a better split than median cut for similar cost.',
  'k-means':     'Iteratively refines K centroids in OKLCH space until they stop moving. Often finds the lowest-error partition of the four, at the cost of being iterative rather than a single pass.'
};

/** Group order for the role picker: surfaces, text, borders, brand/semantic, then syntax tokens. */
const ROLE_GROUP_ORDER = [
  'background', 'bg-soft', 'surface', 'code-bg', 'divider',
  'text', 'text-strong', 'text-subtle',
  'border', 'border-strong',
  'brand', 'on-brand', 'accent-alt', 'muted',
  'success', 'warning', 'error', 'info',
  'syntax-keyword', 'syntax-string', 'syntax-number', 'syntax-function', 'syntax-type',
  'syntax-comment', 'syntax-attribute', 'syntax-punctuation'
];
const sortedPinnableRoles = computed(() => {
  return [...pinnableRoles.value].sort((a, b) => {
    const ai = ROLE_GROUP_ORDER.indexOf(a);
    const bi = ROLE_GROUP_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
});

/** BalancedWrap's item list — seed cards only. The "Add hue" trigger lives
 * outside this list entirely (a fixed control above it), not as a mixed-in
 * item: BalancedWrap free-places items into its balanced-height columns, so
 * an "add" entry inside that list can land anywhere in the grid instead of
 * staying put where a user expects to find it. */
type SeedCardItemType = { hex: string; role?: string };
const seedCardItems = computed<SeedCardItemType[]>(() => {
  return pickerSeeds.value.map((s) => {return { hex: s.hex, role: s.role };});
});

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

/** UFileUpload owns this ref; picking a file here is the only trigger for the EXTRACT_IMAGE(file) effect. */
const uploadedFile = ref<File | null>(null);

/** Manual hue edits imply the engine should theme from picker seeds, not an extracted image. */
function sendPickerAction(action: Parameters<typeof send>[0]): void {
  if (mode.value !== 'picker') mode.value = 'picker';
  send(action);
}

/** Image extraction/upload/sampling implies the engine should theme from the extracted image. */
function sendImageAction(action: Parameters<typeof send>[0]): void {
  if (mode.value !== 'image') mode.value = 'image';
  send(action);
}

const handleFile = (file: File | null) => {
  if (file) {
    sendImageAction({ file, 'source': 'file', 'type': IridisUiActionType.EXTRACT_IMAGE });
  }
};

const clearImage = () => {
  uploadedFile.value = null;
  lastImageSrc.value = null;
};

watch(uploadedFile, handleFile);

function sample(): void {
  uploadedFile.value = null;
  sendImageAction({ 'source': 'sample', 'type': IridisUiActionType.EXTRACT_IMAGE });
}

/** Each envelope (lightness/chroma) is a UNION of ranges, not one continuous span — these helpers add/edit/remove entries in that list, always sending the whole array back through the same FSM action the single-range slider used to send. */
function updateLightnessRange(index: number, range: [number, number]): void {
  const next = [...imgLightnessRange.value];
  next[index] = range;
  sendImageAction({ range: next, type: IridisUiActionType.SET_IMAGE_LIGHTNESS_RANGE });
}
function addLightnessRange(): void {
  sendImageAction({ range: [...imgLightnessRange.value, [0, 1]], type: IridisUiActionType.SET_IMAGE_LIGHTNESS_RANGE });
}
function removeLightnessRange(index: number): void {
  const next = imgLightnessRange.value.filter((_, i) => i !== index);
  sendImageAction({ range: next.length > 0 ? next : [[0, 1]], type: IridisUiActionType.SET_IMAGE_LIGHTNESS_RANGE });
}
function updateChromaRange(index: number, range: [number, number]): void {
  const next = [...imgChromaRange.value];
  next[index] = range;
  sendImageAction({ range: next, type: IridisUiActionType.SET_IMAGE_CHROMA_RANGE });
}
function addChromaRange(): void {
  sendImageAction({ range: [...imgChromaRange.value, [0, 0.5]], type: IridisUiActionType.SET_IMAGE_CHROMA_RANGE });
}
function removeChromaRange(index: number): void {
  const next = imgChromaRange.value.filter((_, i) => i !== index);
  sendImageAction({ range: next.length > 0 ? next : [[0, 0.5]], type: IridisUiActionType.SET_IMAGE_CHROMA_RANGE });
}

</script>

<template>
  <div class="space-y-5">
    <AccordionPanel
      panel-id="imageCard"
      title="Image"
      icon="i-material-symbols-image-outline-rounded"
      :default-open="false"
    >
      <div
        v-auto-animate
        class="w-full space-y-5"
      >
        <div class="space-y-3">
              <p class="text-sm text-muted">
                Extract a palette from an image — upload one or try a sample. Adjust extraction parameters to re-cluster and regenerate.
              </p>

              <!-- Uploader and preview share one slot — never both at once. The
                   uploader comes back the moment the image is cleared (clearImage
                   resets lastImageSrc), so there's always exactly one thing here:
                   something to drop an image into, or the image you dropped. -->
              <UFileUpload
                v-if="!lastImageSrc"
                v-model="uploadedFile"
                accept="image/*"
                :preview="false"
                icon="i-material-symbols-upload-rounded"
                label="Drop an image or click to browse"
                description="PNG, JPG, WEBP — extracts dominant hues based on your schema"
                class="w-full"
              >
                <template #actions="{ open }">
                  <UButton
                    icon="i-material-symbols-upload-rounded"
                    color="primary"
                    variant="soft"
                    size="sm"
                    @click.stop="open()"
                  >
                    Browse
                  </UButton>
                  <UButton
                    icon="i-material-symbols-auto-awesome-rounded"
                    color="neutral"
                    variant="soft"
                    size="sm"
                    @click.stop="sample"
                  >
                    Try a sample
                  </UButton>
                </template>
              </UFileUpload>

              <!-- Image preview with matching dismiss button -->
              <div
                v-else
                class="relative rounded-lg overflow-hidden border border-default h-48"
              >
                <img
                  :src="lastImageSrc"
                  alt="Upload preview"
                  class="w-full h-full object-cover"
                >
                <UButton
                  icon="i-material-symbols-close-rounded"
                  color="error"
                  variant="ghost"
                  size="xs"
                  class="absolute top-1 right-1 p-0.5"
                  :aria-label="`Clear uploaded image`"
                  @click="clearImage"
                />
              </div>
            </div>

            <div
              v-if="histogram.length > 0"
              class="space-y-3"
            >
              <div class="space-y-4 my-6 relative">
                <!-- Spinner Overlay -->
                <div
                  v-if="running"
                  class="absolute inset-0 z-10 flex items-center justify-center bg-elevated/50 backdrop-blur-sm rounded-lg"
                >
                  <UIcon
                    name="i-material-symbols-progress-activity"
                    class="size-8 animate-spin text-primary"
                  />
                </div>

                <Histogram />
              </div>
              <div class="grid gap-x-6 gap-y-4 rounded-lg border border-default p-4 sm:grid-cols-2 mt-4">
                <UFormField label="Clustering algorithm">
                  <USelect
                    :model-value="imgAlgorithm"
                    :items="algorithmItems"
                    value-key="value"
                    class="w-full"
                    @update:model-value="sendImageAction({ algorithm: $event as GalleryAlgorithmType, type: IridisUiActionType.SET_IMAGE_ALGORITHM })"
                  />
                  <p class="mt-1 text-xs text-muted">
                    {{ algorithmHelp[imgAlgorithm] }}
                  </p>
                </UFormField>
                <UFormField
                  v-if="imgAlgorithm === 'delta-e'"
                  :label="`ΔE cap · ${imgDeltaECap}`"
                >
                  <USlider
                    :model-value="imgDeltaECap"
                    :min="16"
                    :max="256"
                    :step="8"
                    @update:model-value="sendImageAction({ cap: $event as number, type: IridisUiActionType.SET_IMAGE_DELTA_E_CAP })"
                  />
                  <p class="mt-1 text-xs text-muted">
                    Caps how many histogram bins feed the ΔE merger (it's O(n²), so this bounds the work). Lower keeps only the heaviest bins; raise it if a distinct minor color is getting dropped before it can merge.
                  </p>
                </UFormField>

                <!-- Same control as "Role schema" in Schema & Compliance — image extraction's
                     color count IS the schema's role count, not a second independent number.
                     Moving either one moves the other, since both read/write schemaName. -->
                <UFormField
                  :label="`Colors — role schema · ${schemaName}`"
                  class="sm:col-span-2"
                >
                  <div class="w-full space-y-2">
                    <div class="flex w-full justify-between text-[11px] font-medium text-dimmed">
                      <span
                        v-for="s in schemaItems"
                        :key="s"
                        :class="schemaName === s ? 'text-primary' : 'cursor-pointer hover:text-muted'"
                        @click="send({ type: IridisUiActionType.SET_SCHEMA, schemaName: s })"
                      >
                        {{ s.replace('iridis-', '') }}
                      </span>
                    </div>
                    <USlider
                      :model-value="Math.max(0, schemaItems.indexOf(schemaName))"
                      :min="0"
                      :max="schemaItems.length - 1"
                      :step="1"
                      @update:model-value="send({ type: IridisUiActionType.SET_SCHEMA, schemaName: schemaItems[Number($event)] || 'iridis-32' })"
                    />
                  </div>
                  <p class="mt-1 text-xs text-muted">
                    How many dominant colors to extract from the image — the same "how many roles to resolve" setting as Schema &amp; Compliance below, not a second independent count. Change it here or there; both move together.
                  </p>
                </UFormField>

                <UFormField :label="`Histogram bits · ${imgHistogramBits}`">
                  <USlider
                    :model-value="imgHistogramBits"
                    :min="3"
                    :max="7"
                    :step="1"
                    @update:model-value="sendImageAction({ bits: $event as number, type: IridisUiActionType.SET_IMAGE_HISTOGRAM_BITS })"
                  />
                  <p class="mt-1 text-xs text-muted">
                    Bits per RGB channel when bucketing pixels before clustering. Higher keeps finer color detail but produces more bins for the clustering step to chew through; lower is faster and smooths out near-duplicate shades.
                  </p>
                </UFormField>
                <UFormField :label="`Harmonize threshold · ${imgHarmonize}`">
                  <USlider
                    :model-value="imgHarmonize"
                    :min="0"
                    :max="30"
                    :step="1"
                    @update:model-value="sendImageAction({ threshold: $event as number, type: IridisUiActionType.SET_IMAGE_HARMONIZE })"
                  />
                  <p class="mt-1 text-xs text-muted">
                    After clustering, hues within this ΔE distance of each other are nudged into agreement — cleans up near-duplicate colors the clustering step left slightly apart. 0 disables it.
                  </p>
                </UFormField>

                <UFormField label="Lightness ranges">
                  <p class="mb-2 text-xs text-muted">
                    Only pixels whose OKLCH lightness falls in one of these bands are considered — use it to ignore black bars (low L) or blown-out highlights (high L). Multiple ranges are a union: add a second band to keep shadows AND highlights while still excluding the midtones between them.
                  </p>
                  <div class="space-y-2">
                    <div
                      v-for="(range, i) in imgLightnessRange"
                      :key="i"
                      class="flex items-center gap-2"
                    >
                      <USlider
                        :model-value="range"
                        :min="0"
                        :max="1"
                        :step="0.01"
                        class="flex-1"
                        @update:model-value="updateLightnessRange(i, $event as [number, number])"
                      />
                      <span class="w-20 shrink-0 font-mono text-xs text-muted">{{ range[0].toFixed(2) }}–{{ range[1].toFixed(2) }}</span>
                      <UButton
                        v-if="imgLightnessRange.length > 1"
                        icon="i-material-symbols-close-rounded"
                        color="neutral"
                        variant="ghost"
                        size="xs"
                        :aria-label="`Remove lightness range ${i + 1}`"
                        @click="removeLightnessRange(i)"
                      />
                    </div>
                    <UButton
                      icon="i-material-symbols-add-rounded"
                      color="neutral"
                      variant="soft"
                      size="xs"
                      @click="addLightnessRange"
                    >
                      Add range
                    </UButton>
                  </div>
                </UFormField>
                <UFormField label="Chroma ranges">
                  <p class="mb-2 text-xs text-muted">
                    Only pixels whose OKLCH chroma (saturation) falls in one of these bands are considered — raise the floor to ignore a near-neutral background so the cluster budget goes toward colors the image actually cares about. Also a union of ranges.
                  </p>
                  <div class="space-y-2">
                    <div
                      v-for="(range, i) in imgChromaRange"
                      :key="i"
                      class="flex items-center gap-2"
                    >
                      <USlider
                        :model-value="range"
                        :min="0"
                        :max="0.5"
                        :step="0.01"
                        class="flex-1"
                        @update:model-value="updateChromaRange(i, $event as [number, number])"
                      />
                      <span class="w-20 shrink-0 font-mono text-xs text-muted">{{ range[0].toFixed(2) }}–{{ range[1].toFixed(2) }}</span>
                      <UButton
                        v-if="imgChromaRange.length > 1"
                        icon="i-material-symbols-close-rounded"
                        color="neutral"
                        variant="ghost"
                        size="xs"
                        :aria-label="`Remove chroma range ${i + 1}`"
                        @click="removeChromaRange(i)"
                      />
                    </div>
                    <UButton
                      icon="i-material-symbols-add-rounded"
                      color="neutral"
                      variant="soft"
                      size="xs"
                      @click="addChromaRange"
                    >
                      Add range
                    </UButton>
                  </div>
                </UFormField>
              </div>

              <div class="space-y-1 mt-4">
                <div class="text-xs font-medium uppercase tracking-wide text-dimmed">
                  Extracted hues
                </div>
                <div
                  v-auto-animate
                  class="flex flex-wrap gap-1 min-h-[30px]"
                >
                  <div
                    v-if="imageSeeds.length === 0"
                    class="text-sm text-muted italic"
                  >
                    None
                  </div>
                  <div
                    v-for="(hex, i) in imageSeeds"
                    :key="i"
                    class="h-7 w-7 rounded-md border border-default"
                    :style="{ backgroundColor: hex }"
                    :title="hex"
                  />
                </div>
              </div>
            </div>
          </div>
    </AccordionPanel>

    <AccordionPanel
      panel-id="paletteCard"
      title="Palette"
      icon="i-material-symbols-palette-outline"
      :default-open="true"
    >
          <div
            v-auto-animate
            class="w-full space-y-5"
          >
            <div class="rounded-lg border-2 border-dashed border-default p-4 space-y-3">
              <UButton
                icon="i-material-symbols-add-rounded"
                color="primary"
                variant="soft"
                size="sm"
                :disabled="pickerSeeds.length >= 32"
                @click="sendPickerAction({ type: IridisUiActionType.ADD_SEED })"
              >
                Add hue
              </UButton>

              <BalancedWrap
                v-auto-animate
                :items="seedCardItems"
                :min-width="210"
                :gap="12"
              >
                <template #default="{ item: card, index: i }">
                  <div class="relative flex flex-col gap-2 rounded-lg border border-default bg-elevated/50 p-2.5 flex-1 max-w-xs">
                    <UButton
                      icon="i-material-symbols-close-rounded"
                      color="error"
                      variant="ghost"
                      size="xs"
                      class="absolute top-1 right-1 p-0.5"
                      :disabled="pickerSeeds.length <= 1"
                      :aria-label="`Remove seed ${i}`"
                      @click="sendPickerAction({ type: IridisUiActionType.REMOVE_SEED, index: i })"
                    />
                    <div class="flex items-center gap-2">
                      <input
                        :value="card.hex"
                        type="color"
                        class="h-10 w-10 cursor-pointer rounded-md border-0 bg-transparent flex-none"
                        @change="sendPickerAction({ type: IridisUiActionType.SET_SEED, index: i, hex: ($event.target as HTMLInputElement).value })"
                      >
                      <div class="flex flex-col min-w-0 flex-1">
                        <span class="font-mono text-xs text-muted truncate">{{ card.hex }}</span>
                      </div>
                    </div>
                    <UPopover
                      mode="hover"
                      :content="{ align: 'start' }"
                    >
                      <UButton
                        :label="card.role ?? 'Unpinned'"
                        trailing-icon="i-material-symbols-keyboard-arrow-down-rounded"
                        size="xs"
                        :color="card.role ? 'primary' : 'neutral'"
                        variant="soft"
                        class="w-full justify-between rounded-full"
                      />
                      <template #content>
                        <div class="flex max-h-64 max-w-56 flex-wrap gap-1 overflow-y-auto p-2">
                          <UButton
                            label="Unpinned"
                            size="xs"
                            :color="card.role ? 'neutral' : 'primary'"
                            :variant="card.role ? 'soft' : 'solid'"
                            class="rounded-full"
                            @click="sendPickerAction({ index: i, role: undefined, type: IridisUiActionType.PIN_SEED_ROLE })"
                          />
                          <UButton
                            v-for="r in sortedPinnableRoles"
                            :key="r"
                            :label="r"
                            size="xs"
                            :color="card.role === r ? 'primary' : (pickerSeeds.some((s, sIdx) => sIdx !== i && s.role === r) ? 'warning' : 'neutral')"
                            :variant="card.role === r ? 'solid' : 'soft'"
                            class="rounded-full"
                            @click="sendPickerAction({ index: i, role: card.role === r ? undefined : r, type: IridisUiActionType.PIN_SEED_ROLE })"
                          />
                        </div>
                      </template>
                    </UPopover>
                  </div>
                </template>
              </BalancedWrap>
            </div>
          </div>
    </AccordionPanel>

    <AccordionPanel
      panel-id="schemaCard"
      title="Schema & Compliance"
      icon="i-material-symbols-settings-rounded"
      :default-open="false"
    >
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
                    <div class="flex w-full justify-between text-[11px] font-medium text-dimmed">
                      <span
                        v-for="s in schemaItems"
                        :key="s"
                        :class="schemaName === s ? 'text-primary' : 'cursor-pointer hover:text-muted'"
                        @click="send({ type: IridisUiActionType.SET_SCHEMA, schemaName: s })"
                      >
                        {{ s.replace('iridis-', '') }}
                      </span>
                    </div>
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
                    @update:model-value="($event) => { send({ colorSpace: $event as 'srgb' | 'displayP3', type: IridisUiActionType.SET_COLOR_SPACE }); send({ index: 3, type: IridisUiActionType.SELECT_CARD }); }"
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
                        @click="() => { send({ strictness: 0, type: IridisUiActionType.SET_CONTRAST_STRICTNESS }); send({ index: 4, type: IridisUiActionType.SELECT_CARD }); }"
                      >AA</span>
                      <span
                        :class="contrastStrictness === 1 ? 'text-primary' : 'cursor-pointer hover:text-muted'"
                        @click="() => { send({ strictness: 1, type: IridisUiActionType.SET_CONTRAST_STRICTNESS }); send({ index: 4, type: IridisUiActionType.SELECT_CARD }); }"
                      >AAA</span>
                      <span
                        :class="contrastStrictness === 2 ? 'text-primary' : 'cursor-pointer hover:text-muted'"
                        @click="() => { send({ strictness: 2, type: IridisUiActionType.SET_CONTRAST_STRICTNESS }); send({ index: 4, type: IridisUiActionType.SELECT_CARD }); }"
                      >APCA</span>
                    </div>
                    <USlider
                      :model-value="contrastStrictness"
                      :min="0"
                      :max="2"
                      :step="1"
                      @update:model-value="($event) => { send({ strictness: $event as number, type: IridisUiActionType.SET_CONTRAST_STRICTNESS }); send({ index: 4, type: IridisUiActionType.SELECT_CARD }); }"
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
                      @update:model-value="($event) => { send({ cvdCorrect: $event as boolean, type: IridisUiActionType.SET_CVD_CORRECT }); send({ index: 8, type: IridisUiActionType.SELECT_CARD }); }"
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
                          :label="t.label"
                          size="xs"
                          :color="cvdPreviewTypes.has(t.value as any) ? 'primary' : 'neutral'"
                          :variant="cvdPreviewTypes.has(t.value as any) ? 'solid' : 'soft'"
                          class="flex-1 justify-center"
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
    </AccordionPanel>
  </div>
</template>
