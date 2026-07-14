<script setup lang="ts">
import { IridisUiActionType } from '~/composables/types/index.ts';
import { ref, watch, computed } from 'vue';
import { useIridis } from '~/composables/useIridis.ts';
import { useIridisUiMachine } from '~/composables/useIridisUiMachine.ts';
import { useNavigationTargets } from '~/composables/useNavigationTargets.ts';
import { useModeGuardedSend } from '~/composables/useModeGuardedSend.ts';
import UploadedImageCard from './UploadedImageCard.vue';
import type { UploadedImageInterfaceType } from '~/composables/types/index.ts';

/**
 * The Upload stage's card — extract a palette from one or more images. This
 * card itself owns no extraction controls; every control (algorithm, k,
 * histogram bits, ΔE cap, harmonize, lightness/chroma range) is per-image,
 * living on that image's own `UploadedImageCard` below. The Combine stage
 * (right after this one, only shown once an image is uploaded) shows each
 * image's selected palette for reference plus the settings for the FINAL
 * merge across every image. "Skip" bypasses image upload entirely, jumping
 * straight to Manual seed entry — now the Refine stage's first card. Owns
 * its own nested image carousel — a SECOND local-state `<CylinderCarousel>`
 * inside this card, independent of both the top-level Upload carousel's
 * index and any other stage's.
 */
const {
  mode, uploadedImages, removeUploadedImage,
  updateUploadedImageSetting, selectEntryCandidate
} = useIridis();
const { send } = useIridisUiMachine();
const { activateTarget } = useNavigationTargets();

/** Bypasses image upload entirely — jumps straight to Manual seed entry, the Refine stage's first card. */
function skipToManual(): void {
  activateTarget('picker');
}

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
 * modelValue mode). One slot per uploaded image; the dropzone renders as
 * plain content ABOVE this carousel rather than as a slide inside it — this
 * card is already inside the Intake stage's own "Upload" cyl-card, so a
 * nested carousel slide also titled "Upload" produced a redundant
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
          Each image's own extraction — controls live on its own card below. The merged result across every image, and combine-stage settings (algorithm, lock/re-run), live in the Combine stage right after this one.
        </p>
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
