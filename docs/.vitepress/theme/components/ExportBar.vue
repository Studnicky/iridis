<script setup lang="ts">
/**
 * ExportBar.vue
 *
 * Reusable export-action bar — pairs an "Export JSON" download button
 * with a "Copy" clipboard button and an ephemeral status note. The
 * payload is supplied lazily via the `payloadProvider` callback so the
 * caller can build the JSON at click time against the freshest state.
 *
 * Both actions serialize the same payload (`JSON.stringify(value, null, 2)`).
 * Download writes a Blob with the supplied `filename`; Copy writes via
 * `navigator.clipboard.writeText`. Clipboard access is guarded for SSR
 * and insecure contexts where `navigator.clipboard` is undefined.
 */

import { ref } from 'vue';

import Button from 'primevue/button';

const props = withDefaults(
  defineProps<{
    'filename':        string;
    'payloadProvider': () => unknown;
    'primaryLabel'?:   string;
    'copyLabel'?:      string;
    'primaryTitle'?:   string;
    'copyTitle'?:      string;
  }>(),
  {
    'primaryLabel': '⬇ Export JSON',
    'copyLabel':    'Copy',
    'primaryTitle': 'Download the payload as a JSON file. Suitable as a fixture for tests or hand-off to a designer.',
    'copyTitle':    'Copy the same JSON payload to the clipboard.',
  },
);

const exportNote = ref<string | null>(null);

const NOTE_TIMEOUT_MS = 2000;

function serialize(): string {
  return JSON.stringify(props.payloadProvider(), null, 2);
}

function setNote(text: string): void {
  exportNote.value = text;
  setTimeout(() => { exportNote.value = null; }, NOTE_TIMEOUT_MS);
}

function downloadJson(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const text = serialize();
  const blob = new Blob([text], { 'type': 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = props.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  setNote('Downloaded');
}

async function copyJson(): Promise<void> {
  const text = serialize();
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      setNote('Copied to clipboard');
    } catch {
      setNote('Copy failed — clipboard unavailable');
    }
  } else {
    setNote('Copy failed — clipboard unavailable');
  }
}
</script>

<template>
  <div class="export-bar">
    <Button
      type="button"
      :label="props.primaryLabel"
      severity="primary"
      size="small"
      class="export-bar__btn export-bar__btn--primary"
      :title="props.primaryTitle"
      @click="downloadJson"
    />
    <Button
      type="button"
      :label="props.copyLabel"
      severity="secondary"
      size="small"
      class="export-bar__btn"
      :title="props.copyTitle"
      @click="copyJson"
    />
    <span v-if="exportNote" class="export-bar__note">{{ exportNote }}</span>
  </div>
</template>

<style scoped>
.export-bar {
  margin-top: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.export-bar__btn :deep(.p-button) {
  padding: 0.4rem 0.85rem;
  font-size: 0.78rem;
  font-weight: 600;
  border-radius: 6px;
}
.export-bar__btn--primary :deep(.p-button) {
  background:   var(--iridis-brand);
  color:        var(--iridis-on-brand);
  border-color: var(--iridis-brand);
}
.export-bar__btn--primary :deep(.p-button:hover) {
  filter: brightness(1.1);
  color: var(--iridis-on-brand);
}
.export-bar__note {
  font-size: 0.74rem;
  color: var(--iridis-brand);
  font-weight: 500;
}
</style>
