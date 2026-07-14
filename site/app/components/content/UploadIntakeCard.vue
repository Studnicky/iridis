<script setup lang="ts">
import { IridisUiActionType } from '~/composables/types/index.ts';
import { computed, ref, watch } from 'vue';
import { useIridis } from '~/composables/useIridis.ts';
import { useIridisUiMachine } from '~/composables/useIridisUiMachine.ts';
import { useNavigationTargets } from '~/composables/useNavigationTargets.ts';
import { ALGORITHM_LABELS } from '~/composables/GalleryAlgorithms.ts';
import { useModeGuardedSend } from '~/composables/useModeGuardedSend.ts';
import UploadedImageCard from './UploadedImageCard.vue';
import type { UploadedImageInterfaceType } from '~/composables/types/index.ts';

/**
 * The Upload stage's card — extract a palette from one or more images. Each
 * image is decoded and reduced to its own dominant colors independently; the
 * Combine stage (right after this one, only shown once an image is uploaded)
 * merges every image's result into one final palette. "Skip" bypasses image
 * upload entirely, jumping straight to Manual seed entry — now the Refine
 * stage's first card. Owns its own nested image carousel — a SECOND
 * local-state `<CylinderCarousel>` inside this card, independent of both the
 * top-level Upload carousel's index and any other stage's.
 */
const {
  mode, imageSeeds, uploadedImages, imgAlgorithm, removeUploadedImage,
  updateUploadedImageSetting, selectEntryCandidate, effectiveHexesFor
} = useIridis();
const { send } = useIridisUiMachine();
const { activateTarget } = useNavigationTargets();

/** Bypasses image upload entirely — jumps straight to Manual seed entry, the Refine stage's first card. */
function skipToManual(): void {
  activateTarget('picker');
}

/**
 * One summary card per uploaded image (its actual contributing colors and
 * algorithm) — a separate `combinedSummaryCard` below covers the cumulative
 * result; the two are rendered in visually distinct groups (Combined is its
 * own concept, not one more peer in the per-image row), never mixed into the
 * same balanced-row group.
 */
type SummaryCardType = { key: string; label: string; algorithmLabel: string; hexes: readonly string[] };
const uploadSummaryCards = computed<SummaryCardType[]>(() => {
  return uploadedImages.value.map((entry) => {
    const algorithmKey = entry.selectedCandidateLabel ?? entry.algorithm;
    return {
      algorithmLabel: ALGORITHM_LABELS[algorithmKey] ?? algorithmKey,
      hexes: effectiveHexesFor(entry),
      key: entry.id,
      label: entry.name || 'Sample'
    };
  });
});
/** The cumulative/combined result — same extraction algorithms as every per-image card, run against the cumulative (pixel-weighted) histogram merged across every upload; see weightedHexesFor/expandWeighted in useIridis.ts. */
const combinedSummaryCard = computed<SummaryCardType | null>(() => {
  if (uploadedImages.value.length === 0) return null;
  return {
    algorithmLabel: ALGORITHM_LABELS[imgAlgorithm.value] ?? imgAlgorithm.value,
    hexes: imageSeeds.value.map((s) => s.hex),
    key: 'combined',
    label: 'Combined'
  };
});

/** Image extraction/upload/sampling implies the engine should theme from the extracted image. */
const sendImageAction = useModeGuardedSend(mode, send, 'image');

/** UFileUpload owns this ref (multiple selection); picking file(s) here is the only trigger for the EXTRACT_IMAGE(file) effect. */
const uploadedFiles = ref<File[] | null>(null);

const handleFiles = (files: File[] | null) => {
  if (files && files.length > 0) {
    sendImageAction({ file: files, 'source': 'file', 'type': IridisUiActionType.EXTRACT_IMAGE });
    // Reset the uploader immediately — the dropzone stays visible, so the
    // same File objects must not linger and re-trigger this watcher.
    uploadedFiles.value = null;
  }
};

watch(uploadedFiles, handleFiles);

function sample(): void {
  uploadedFiles.value = null;
  sendImageAction({ 'source': 'sample', 'type': IridisUiActionType.EXTRACT_IMAGE });
}

/**
 * Image carousel's own local active index — deliberately independent of the
 * Intake stage carousel's own index (see CylinderCarousel's optional
 * modelValue mode). One slot per uploaded image; the dropzone/summary cards
 * render as plain content ABOVE this carousel rather than as a slide inside
 * it — this card is already inside the Intake stage's own "Upload" cyl-card,
 * so a nested carousel slide also titled "Upload" produced a redundant
 * card-in-a-card. The carousel itself only earns its keep once there's more
 * than one uploaded image to flip between.
 */
const imageCarouselActiveIndex = ref(0);
const imageCarouselItems = computed(() => uploadedImages.value.map((img) => {return { key: img.id, label: img.name };}));
function findUploadedImage(id: string): UploadedImageInterfaceType | undefined {
  return uploadedImages.value.find((img) => {return img.id === id;});
}
watch(() => uploadedImages.value.length, (next, prev) => {
  if (next > prev) imageCarouselActiveIndex.value = next - 1;
  else if (next < prev) imageCarouselActiveIndex.value = 0;
});
</script>

<template>
  <div
    v-auto-animate
    class="w-full space-y-5"
  >
    <div class="flex flex-wrap items-start justify-between gap-3">
      <p class="text-sm text-muted">
        Extract a palette from one or more images — upload them or try a sample. Each image is decoded and reduced to its own dominant colors independently, with its own extraction settings; the Combine stage right after this one merges every image's result into one final palette.
      </p>
      <UButton
        icon="i-material-symbols-skip-next-rounded"
        color="neutral"
        variant="ghost"
        size="sm"
        class="shrink-0"
        @click="skipToManual"
      >
        Skip
      </UButton>
    </div>

    <!-- Always rendered — a user can always drop another image on top of
         what's already uploaded, never has to clear everything and start
         over in the OS file picker. Plain content, not a carousel slide: it
         already lives inside the Upload stage's own cyl-card. -->
    <UFileUpload
      v-model="uploadedFiles"
      multiple
      accept="image/*"
      :preview="false"
      icon="i-material-symbols-upload-rounded"
      label="Drop image(s) or click to browse"
      description="PNG, JPG, WEBP — each image is extracted independently, then combined in the next stage"
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

    <div
      v-if="uploadedImages.length > 0"
      class="space-y-3"
    >
      <div class="space-y-1">
        <p class="text-xs font-medium uppercase tracking-wide text-dimmed">
          Extracted palettes
        </p>
        <p class="text-sm text-muted">
          Each image's own extraction, and the combined result used to theme the page. Adjust an image's own extraction on its card below — combine-stage settings (algorithm, lock/re-run) live in the Combine stage right after this one.
        </p>
      </div>
      <BalancedWrap
        :items="uploadSummaryCards"
        :min-width="200"
        :gap="12"
      >
        <template #default="{ item: card }">
          <div class="glass scanlines flex flex-1 max-w-xs flex-col gap-3 p-4">
            <div class="flex items-center justify-between gap-2">
              <span
                class="truncate font-display text-sm font-bold uppercase tracking-widest glow-text"
                :title="card.label"
              >{{ card.label }}</span>
              <span class="h-3 w-3 shrink-0 rounded-full pulse bg-primary" />
            </div>
            <div
              v-if="card.hexes.length === 0"
              class="text-xs text-muted italic"
            >
              None
            </div>
            <BalancedWrap
              v-else
              :items="[...card.hexes]"
              :min-width="28"
              :gap="4"
            >
              <template #default="{ item: hex }">
                <span
                  class="h-7 w-7 rounded border border-default/50"
                  :style="{ backgroundColor: hex }"
                  :title="hex"
                  role="img"
                  :aria-label="`${card.label} color ${hex}`"
                />
              </template>
            </BalancedWrap>
            <UBadge
              color="neutral"
              variant="soft"
              size="sm"
              class="self-start"
            >
              {{ card.algorithmLabel }}
            </UBadge>
          </div>
        </template>
      </BalancedWrap>

      <!-- Combined is a separate concept from the per-image cards above
           (the cumulative merge, not one more peer extraction) — its own
           row, visually set apart, always last. -->
      <div
        v-if="combinedSummaryCard"
        class="flex justify-center border-t border-default pt-3"
      >
        <div class="glass scanlines flex w-full max-w-xs flex-col gap-3 p-4">
          <div class="flex items-center justify-between gap-2">
            <span
              class="truncate font-display text-sm font-bold uppercase tracking-widest glow-text"
              :title="combinedSummaryCard.label"
            >{{ combinedSummaryCard.label }}</span>
            <span class="h-3 w-3 shrink-0 rounded-full pulse bg-primary" />
          </div>
          <div
            v-if="combinedSummaryCard.hexes.length === 0"
            class="text-xs text-muted italic"
          >
            None
          </div>
          <BalancedWrap
            v-else
            :items="[...combinedSummaryCard.hexes]"
            :min-width="28"
            :gap="4"
          >
            <template #default="{ item: hex }">
              <span
                class="h-7 w-7 rounded border border-default/50"
                :style="{ backgroundColor: hex }"
                :title="hex"
                role="img"
                :aria-label="`Combined color ${hex}`"
              />
            </template>
          </BalancedWrap>
          <UBadge
            color="primary"
            variant="soft"
            size="sm"
            class="self-start"
          >
            {{ combinedSummaryCard.algorithmLabel }}
          </UBadge>
        </div>
      </div>

      <!-- Per-image detail/edit carousel — only earns its own coverflow deck
           once there's more than one image to flip between; a single image
           renders its detail card flat, no redundant carousel chrome. -->
      <CylinderCarousel
        v-if="imageCarouselItems.length > 1"
        :items="imageCarouselItems"
        :model-value="imageCarouselActiveIndex"
        @update:model-value="imageCarouselActiveIndex = $event"
      >
        <template #default="{ item }">
          <UploadedImageCard
            v-if="findUploadedImage(item.key)"
            :image="findUploadedImage(item.key)!"
            :show-header="false"
            @remove="removeUploadedImage(item.key)"
            @update="updateUploadedImageSetting(item.key, $event)"
            @select-candidate="selectEntryCandidate(item.key, $event)"
          />
        </template>
      </CylinderCarousel>
      <UploadedImageCard
        v-else-if="findUploadedImage(imageCarouselItems[0]?.key ?? '')"
        :image="findUploadedImage(imageCarouselItems[0]!.key)!"
        @remove="removeUploadedImage(imageCarouselItems[0]!.key)"
        @update="updateUploadedImageSetting(imageCarouselItems[0]!.key, $event)"
        @select-candidate="selectEntryCandidate(imageCarouselItems[0]!.key, $event)"
      />
    </div>
  </div>
</template>
