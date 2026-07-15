<script setup lang="ts">
import { IridisUiActionType } from '~/composables/types/index.ts';
import { ref, watch } from 'vue';
import { useIridis } from '~/composables/useIridis.ts';
import { useIridisUiMachine } from '~/composables/useIridisUiMachine.ts';
import { useNavigationTargets } from '~/composables/useNavigationTargets.ts';
import { useModeGuardedSend } from '~/composables/useModeGuardedSend.ts';

/**
 * The Upload stage's dropzone card — extract a palette from one or more
 * images. This card owns no per-image extraction controls and no per-image
 * display at all: every uploaded image gets its OWN separate top-level card
 * in this same Upload stage carousel (see index.vue's `stageItemsFor()` /
 * `UploadedImageCard` dispatch), never a second carousel nested inside this
 * one's content. "Skip" bypasses image upload entirely, jumping straight to
 * Manual seed entry — now the Refine stage's first card.
 */
const { mode } = useIridis();
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
</script>

<template>
  <div class="w-full space-y-5">
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
  </div>
</template>
