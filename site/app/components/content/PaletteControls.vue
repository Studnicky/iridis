<script setup lang="ts">
import { IridisUiActionType } from '~/composables/types/index.ts';
import { computed, ref, watch } from 'vue';
import { useIridis } from '~/composables/useIridis.ts';
import { useIridisUiMachine } from '~/composables/useIridisUiMachine.ts';
import type {
  DerivationStrategyPreset,
  RoleType,
  RoleDerivation,
  HueAlgorithm,
  VariationAlgorithm
} from '~/composables/types/colorDerivation.ts';

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
  pickerSeeds, pinnableRoles, framing, schemaName, contrastStrictness, colorSpace, mode, imageSeeds, running,
  enabledOptionalStages, cvdCorrect, contrastReport,
  imgAlgorithm, imgK, imgHistogramBits, imgDeltaECap, imgHarmonize, imgLightnessRange, imgChromaRange,
  cvdPreviewTypes, derivationConfig
} = useIridis();
const { send } = useIridisUiMachine();

const schemaItems = ['iridis-4', 'iridis-8', 'iridis-12', 'iridis-16', 'iridis-32'];
const algorithmItems = [
  { 'label': 'ΔE (delta-e)', 'value': 'delta-e' },
  { 'label': 'Median cut', 'value': 'median-cut' }
];
const UNPINNED = '__unpinned__';



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
const handleFile = (file: File | null) => {
  if (file) {
    send({ file, 'source': 'file', 'type': IridisUiActionType.EXTRACT_IMAGE });
  }
};
watch(uploadedFile, handleFile);

function sample(): void {
  uploadedFile.value = null;
  send({ 'source': 'sample', 'type': IridisUiActionType.EXTRACT_IMAGE });
}

/** Derivation strategy selection — role-level algorithm config lives behind the "Custom" preset. */
const presets: DerivationStrategyPreset[] = ['automatic', 'brand-focused', 'accessible', 'custom'];
const hueAlgorithms: HueAlgorithm[] = ['monochromatic', 'complementary', 'analogous', 'triadic', 'tetradic', 'split-complementary', 'compound', 'freeform'];
const variationAlgorithms: VariationAlgorithm[] = ['tints-shades', 'saturation-gradient', 'value-gradient'];
const roles: RoleType[] = ['primary', 'success', 'warning', 'error', 'info', 'neutral', 'accent'];

const selectedStrategy = ref<DerivationStrategyPreset>('automatic');
const isModalOpen = ref(false);
const selectedRole = ref<RoleType | null>(null);
const roleConfig = ref<RoleDerivation>({
  'hueAlgorithm': 'monochromatic',
  'variationAlgorithms': ['tints-shades']
});

function handleStrategyChange(preset: DerivationStrategyPreset): void {
  send({ 'strategy': preset, 'type': IridisUiActionType.SET_DERIVATION_STRATEGY });
}

function openRoleModal(role: RoleType): void {
  selectedRole.value = role;
  roleConfig.value = {
    ...derivationConfig.value.roles[role]
  };
  isModalOpen.value = true;
}

function toggleVariation(algo: VariationAlgorithm): void {
  const idx = roleConfig.value.variationAlgorithms.indexOf(algo);
  if (idx >= 0) {
    roleConfig.value.variationAlgorithms.splice(idx, 1);
  } else {
    roleConfig.value.variationAlgorithms.push(algo);
  }
}

function saveRoleConfig(): void {
  if (selectedRole.value) {
    send({ 'derivation': roleConfig.value, 'role': selectedRole.value, 'type': IridisUiActionType.SET_ROLE_DERIVATION });
  }
  isModalOpen.value = false;
}

function resetRoleToDefault(): void {
  if (selectedRole.value) {
    send({ 'role': selectedRole.value, 'type': IridisUiActionType.RESET_ROLE_DERIVATION });
  }
  isModalOpen.value = false;
}

function strategyLabel(preset: DerivationStrategyPreset): string {
  const labels: Record<DerivationStrategyPreset, string> = {
    'automatic': 'Automatic',
    'brand-focused': 'Brand-Focused',
    'accessible': 'Accessible',
    'custom': 'Custom'
  };
  return labels[preset];
}

function algorithmBadge(role: RoleType): string {
  const abbrev: Record<HueAlgorithm, string> = {
    'monochromatic':        'mono',
    'complementary':        'comp',
    'analogous':            'ana',
    'triadic':              'tri',
    'tetradic':             'tet',
    'split-complementary':  'split',
    'compound':             'cmpd',
    'freeform':             'free'
  };
  const algo = derivationConfig.value.roles[role].hueAlgorithm;
  return abbrev[algo];
}

function roleDescription(role: RoleType): string {
  const desc: Record<RoleType, string> = {
    'primary': 'Brand primary color',
    'success': 'Success/positive state',
    'warning': 'Warning/caution state',
    'error': 'Error/negative state',
    'info': 'Information state',
    'neutral': 'Neutral/text colors',
    'accent': 'Accent/interactive'
  };
  return desc[role];
}
</script>

<template>
  <div class="space-y-5">
  <UCard>
    <template #header>
      <div class="mx-auto grid w-full max-w-4xl grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div class="flex flex-wrap items-center gap-3">
          <!-- ModeSwitch moved to body -->
        </div>
        <span class="text-center font-semibold text-highlighted">Palette</span>
        <div class="flex justify-end">
          <USwitch
            :model-value="framing === 'dark'"
            size="lg"
            unchecked-icon="material-symbols:light-mode-rounded"
            checked-icon="material-symbols:dark-mode-rounded"
            :aria-label="framing === 'dark' ? 'Dark framing' : 'Light framing'"
            @update:model-value="send({ framing: $event ? 'dark' : 'light', type: IridisUiActionType.SET_FRAMING })"
          />
        </div>
      </div>
    </template>

    <div
      v-auto-animate
      class="mx-auto w-full max-w-4xl space-y-5"
    >
      <ModeSwitch class="mb-8" />

      <div class="space-y-3">
        <p class="text-sm text-muted">
          Create a palette by uploading an image, using a sample, or manually adding hues. Adjust extraction parameters to re-cluster and regenerate.
        </p>

        <UFileUpload
          v-model="uploadedFile"
          accept="image/*"
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
      </div>

      <BalancedWrap
        v-auto-animate
        :items="[{ isAddBtn: true }, ...pickerSeeds]"
        :min-width="210"
        :gap="12"
        class="rounded-lg border-2 border-dashed border-default p-4"
      >
        <template #default="{ item: hue, index: i }">
          <div
            v-if="hue.isAddBtn"
            class="flex min-h-full items-center justify-center flex-1 rounded-lg border border-transparent p-2.5"
          >
            <UButton
              icon="i-material-symbols-add-rounded"
              color="primary"
              variant="soft"
              size="sm"
              :disabled="pickerSeeds.length >= 32"
              @click="send({ type: IridisUiActionType.ADD_SEED })"
            >
              Add hue
            </UButton>
          </div>
          <div
            v-else
            class="relative flex flex-col gap-2 rounded-lg border border-default bg-elevated/50 p-2.5 flex-1"
          >
            <UButton
              icon="i-material-symbols-close-rounded"
              color="neutral"
              variant="ghost"
              size="xs"
              class="absolute top-1 right-1 p-0.5"
              :disabled="pickerSeeds.length <= 1"
              @click="send({ type: IridisUiActionType.REMOVE_SEED, index: i - 1 })"
            />
            <div class="flex items-center gap-2">
              <input
                :value="hue.hex"
                type="color"
                class="h-10 w-10 cursor-pointer rounded-md border-0 bg-transparent flex-none"
                @change="send({ type: IridisUiActionType.SET_SEED, index: i - 1, hex: ($event.target as HTMLInputElement).value })"
              >
              <div class="flex flex-col min-w-0 flex-1">
                <span class="font-mono text-xs text-muted truncate">{{ hue.hex }}</span>
              </div>
            </div>
            <div class="space-y-1">
              <p class="text-xs font-medium uppercase tracking-wide text-dimmed">Pin to role</p>
              <div class="flex flex-wrap gap-1">
                <UButton
                  label="Unpinned"
                  size="xs"
                  :color="hue.role ? 'neutral' : 'primary'"
                  :variant="hue.role ? 'soft' : 'solid'"
                  @click="send({ index: i - 1, role: undefined, type: IridisUiActionType.PIN_SEED_ROLE })"
                />
                <UButton
                  v-for="r in pinnableRoles"
                  :key="r"
                  :label="r"
                  size="xs"
                  :color="hue.role === r ? 'primary' : 'neutral'"
                  :variant="hue.role === r ? 'solid' : 'soft'"
                  :disabled="pickerSeeds.some((s, sIdx) => sIdx !== i - 1 && s.role === r)"
                  @click="send({ index: i - 1, role: hue.role === r ? undefined : r, type: IridisUiActionType.PIN_SEED_ROLE })"
                />
              </div>
            </div>
          </div>
        </template>
      </BalancedWrap>

      <div
        v-if="histogram.length > 0"
        class="space-y-3"
      >
        <div class="space-y-4 my-6 relative">
          <!-- Spinner Overlay -->
          <div v-if="running" class="absolute inset-0 z-10 flex items-center justify-center bg-elevated/50 backdrop-blur-sm rounded-lg">
            <UIcon name="i-material-symbols-progress-activity" class="size-8 animate-spin text-primary" />
          </div>

          <Histogram />
          <div class="space-y-1">
            <div class="text-xs font-medium text-muted">
              Extracted hues
            </div>
            <div
              v-auto-animate
              class="flex flex-wrap gap-1 min-h-[30px]"
            >
              <div v-if="imageSeeds.length === 0" class="text-sm text-muted italic">None</div>
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
        <div class="grid gap-x-6 gap-y-4 rounded-lg border border-default p-4 sm:grid-cols-2 mt-4">
          <UFormField label="Clustering algorithm">
            <USelect
              :model-value="imgAlgorithm"
              :items="algorithmItems"
              value-key="value"
              class="w-full"
              @update:model-value="send({ algorithm: $event as 'median-cut' | 'delta-e', type: IridisUiActionType.SET_IMAGE_ALGORITHM })"
            />
          </UFormField>
          <UFormField :label="`Colors (k) · ${imgK}`">
            <USlider
              :model-value="imgK"
              :min="2"
              :max="16"
              :step="1"
              @update:model-value="send({ k: $event as number, type: IridisUiActionType.SET_IMAGE_K })"
            />
          </UFormField>
          <UFormField :label="`Histogram bits · ${imgHistogramBits}`">
            <USlider
              :model-value="imgHistogramBits"
              :min="3"
              :max="7"
              :step="1"
              @update:model-value="send({ bits: $event as number, type: IridisUiActionType.SET_IMAGE_HISTOGRAM_BITS })"
            />
          </UFormField>
          <UFormField :label="`ΔE cap · ${imgDeltaECap}${imgAlgorithm !== 'delta-e' ? ' (delta-e only)' : ''}`">
            <USlider
              :model-value="imgDeltaECap"
              :min="16"
              :max="256"
              :step="8"
              :disabled="imgAlgorithm !== 'delta-e'"
              @update:model-value="send({ cap: $event as number, type: IridisUiActionType.SET_IMAGE_DELTA_E_CAP })"
            />
          </UFormField>
          <UFormField :label="`Harmonize threshold · ${imgHarmonize}`">
            <USlider
              :model-value="imgHarmonize"
              :min="0"
              :max="30"
              :step="1"
              @update:model-value="send({ threshold: $event as number, type: IridisUiActionType.SET_IMAGE_HARMONIZE })"
            />
          </UFormField>
          <UFormField :label="`Lightness range · ${imgLightnessRange[0].toFixed(2)}–${imgLightnessRange[1].toFixed(2)}`">
            <USlider
              :model-value="imgLightnessRange"
              :min="0"
              :max="1"
              :step="0.01"
              @update:model-value="send({ range: $event as [number, number], type: IridisUiActionType.SET_IMAGE_LIGHTNESS_RANGE })"
            />
          </UFormField>
          <UFormField :label="`Chroma range · ${imgChromaRange[0].toFixed(2)}–${imgChromaRange[1].toFixed(2)}`">
            <USlider
              :model-value="imgChromaRange"
              :min="0"
              :max="0.5"
              :step="0.01"
              @update:model-value="send({ range: $event as [number, number], type: IridisUiActionType.SET_IMAGE_CHROMA_RANGE })"
            />
          </UFormField>
        </div>
      </div>


    </div>
  </UCard>

  <UCard>
    <template #header>
      <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <span />
        <span class="flex items-center justify-center gap-1.5 text-center font-semibold text-highlighted">
          <UIcon
            name="i-material-symbols-settings-rounded"
            class="size-4 text-primary"
          />
          Schema & Compliance
        </span>
        <span />
      </div>
    </template>

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
                  v-for="(s, i) in schemaItems"
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

          <div class="derivation-section space-y-2">
            <p class="text-xs font-medium uppercase tracking-wide text-dimmed">
              Derivation Strategy
            </p>
            <p class="text-sm text-muted">
              How should colors be generated for each role — pick a preset, or go
              <strong class="text-highlighted">Custom</strong> to configure hue and variation algorithms per role.
            </p>

            <div class="space-y-1.5">
              <label
                v-for="preset in presets"
                :key="preset"
                class="flex items-center gap-2 cursor-pointer rounded-md border border-default p-2 pl-3 hover:bg-elevated/50"
                :class="selectedStrategy === preset ? 'border-primary bg-primary/5' : ''"
              >
                <input
                  v-model="selectedStrategy"
                  type="radio"
                  :value="preset"
                  class="h-4 w-4 accent-primary"
                  @change="handleStrategyChange(preset)"
                >
                <span class="text-sm text-highlighted">
                  {{ strategyLabel(preset) }}
                  <span v-if="preset === 'automatic'" class="text-xs text-muted">(recommended)</span>
                </span>
              </label>
            </div>

            <div v-if="selectedStrategy === 'custom'" class="mt-3 space-y-2">
              <p class="text-xs font-medium uppercase tracking-wide text-dimmed">Configure by role</p>
              <div class="grid gap-2 sm:grid-cols-2">
                <div
                  v-for="role in roles"
                  :key="role"
                  class="cursor-pointer rounded-lg border border-default bg-elevated/50 p-2.5 hover:bg-elevated"
                  @click="openRoleModal(role)"
                >
                  <div class="mb-1 flex items-start justify-between gap-2">
                    <span class="text-sm font-medium capitalize text-highlighted">{{ role }}</span>
                    <UBadge color="neutral" variant="soft" size="sm">
                      {{ algorithmBadge(role) }}
                    </UBadge>
                  </div>
                  <p class="text-xs text-muted">
                    {{ roleDescription(role) }}
                  </p>
                </div>
              </div>
            </div>

            <UModal v-model:open="isModalOpen">
              <template #content>
                <div class="p-6">
                  <h2 class="mb-4 text-lg font-semibold text-highlighted">
                    Configure {{ selectedRole }} role
                  </h2>

                  <div class="mb-6 space-y-2">
                    <p class="text-sm font-medium text-highlighted">Hue algorithm</p>
                    <div class="space-y-1.5">
                      <label
                        v-for="algo in hueAlgorithms"
                        :key="algo"
                        class="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          v-model="roleConfig.hueAlgorithm"
                          type="radio"
                          :value="algo"
                          class="h-4 w-4 accent-primary"
                        >
                        <span class="text-sm capitalize text-muted">{{ algo }}</span>
                      </label>
                    </div>
                  </div>

                  <div class="mb-6 space-y-2">
                    <p class="text-sm font-medium text-highlighted">Variation layers</p>
                    <p class="text-xs text-muted">Applied in order.</p>
                    <div class="space-y-1.5">
                      <label
                        v-for="algo in variationAlgorithms"
                        :key="algo"
                        class="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          :checked="roleConfig.variationAlgorithms.includes(algo)"
                          class="h-4 w-4 accent-primary"
                          @change="toggleVariation(algo)"
                        >
                        <span class="text-sm capitalize text-muted">{{ algo.replace('-', ' ') }}</span>
                      </label>
                    </div>
                  </div>

                  <div class="flex justify-end gap-2">
                    <UButton
                      label="Reset"
                      color="neutral"
                      variant="soft"
                      size="sm"
                      @click="resetRoleToDefault"
                    />
                    <UButton
                      label="Save"
                      color="primary"
                      size="sm"
                      @click="saveRoleConfig"
                    />
                  </div>
                </div>
              </template>
            </UModal>
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
                <span :class="contrastStrictness === 0 ? 'text-primary' : 'cursor-pointer hover:text-muted'" @click="() => { send({ strictness: 0, type: IridisUiActionType.SET_CONTRAST_STRICTNESS }); send({ index: 4, type: IridisUiActionType.SELECT_CARD }); }">AA</span>
                <span :class="contrastStrictness === 1 ? 'text-primary' : 'cursor-pointer hover:text-muted'" @click="() => { send({ strictness: 1, type: IridisUiActionType.SET_CONTRAST_STRICTNESS }); send({ index: 4, type: IridisUiActionType.SELECT_CARD }); }">AAA</span>
                <span :class="contrastStrictness === 2 ? 'text-primary' : 'cursor-pointer hover:text-muted'" @click="() => { send({ strictness: 2, type: IridisUiActionType.SET_CONTRAST_STRICTNESS }); send({ index: 4, type: IridisUiActionType.SELECT_CARD }); }">APCA</span>
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
                @update:model-value="($event) => { send({ cvdCorrect: $event as boolean, type: IridisUiActionType.SET_CVD_CORRECT }); send({ index: 7, type: IridisUiActionType.SELECT_CARD }); }"
              />
            </div>
            <div class="space-y-1.5 rounded-md border border-dashed border-primary/50 bg-primary/5 p-2.5 pl-3">
              <div class="flex items-center justify-between gap-3">
                <span class="text-sm font-medium">Simulate CVD vision</span>
                <UButton
                  label="Off"
                  :color="cvdPreviewTypes.size > 0 ? 'neutral' : 'gray'"
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
  </UCard>
  </div>
</template>
