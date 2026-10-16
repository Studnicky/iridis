<script setup lang="ts">
import { computed, ref } from 'vue';

import { useVscodeTierDemo } from '~/composables/useVscodeTierDemo.ts';

const { announcement, framing, paletteName, result, roles, seedRoles, setPalette, setTier, tier } = useVscodeTierDemo();
const copyMessage = ref('');
const themeJson = computed(() => result.value.theme === undefined ? '' : JSON.stringify(result.value.theme.theme.json, null, 2));

function updateTier(event: Event): void {
  if (event.currentTarget instanceof HTMLSelectElement) { setTier(Number(event.currentTarget.value)); }
}

function updatePalette(event: Event): void {
  if (event.currentTarget instanceof HTMLSelectElement) { setPalette(event.currentTarget.value); }
}

async function copyTheme(): Promise<void> {
  if (themeJson.value.length === 0 || !navigator.clipboard) { copyMessage.value = 'Copy is unavailable until the theme validates.'; return; }
  await navigator.clipboard.writeText(themeJson.value);
  copyMessage.value = 'Theme JSON copied.';
}

function downloadTheme(): void {
  if (themeJson.value.length === 0) { copyMessage.value = 'Download is unavailable until the theme validates.'; return; }
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([themeJson.value], { 'type': 'application/json' }));
  link.download = `iridis-vscode-${tier.value}-${framing.value}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  copyMessage.value = 'Theme JSON download started.';
}
</script>

<template>
  <section
    aria-labelledby="vscode-tier-demo-title"
    class="space-y-5 rounded-xl border border-default bg-elevated/70 p-5 shadow-sm"
  >
    <header class="space-y-1">
      <p class="text-xs font-semibold uppercase tracking-wide text-primary">
        Live VS Code pipeline
      </p>
      <h2
        id="vscode-tier-demo-title"
        class="font-display text-xl font-bold"
      >
        Palette to VS Code theme
      </h2>
      <p class="max-w-3xl text-sm text-muted">
        Choose a shipped palette, refine its exact seed roles, then inspect the generated workbench, syntax, provenance, and contrast evidence. The page’s shared framing switch controls this output.
      </p>
    </header>

    <p
      aria-live="polite"
      class="sr-only"
    >
      {{ announcement }} {{ copyMessage }}
    </p>
    <div class="grid gap-4 sm:grid-cols-2">
      <label
        class="grid gap-1 text-sm font-medium text-highlighted"
        for="vscode-palette"
      >Shipped palette
        <select
          id="vscode-palette"
          :value="paletteName"
          class="rounded-md border border-default bg-default px-3 py-2"
          @change="updatePalette"
        ><option value="aurora">Aurora</option><option value="ember">Ember</option></select>
      </label>
      <label
        class="grid gap-1 text-sm font-medium text-highlighted"
        for="vscode-tier"
      >Seed tier
        <select
          id="vscode-tier"
          :value="tier"
          class="rounded-md border border-default bg-default px-3 py-2"
          @change="updateTier"
        ><option
          v-for="option in [4, 8, 16, 64]"
          :key="option"
          :value="option"
        >{{ option }} supplied roles</option></select>
      </label>
    </div>

    <p class="rounded-md border border-default px-3 py-2 text-sm text-muted">
      Color framing: <strong class="text-highlighted">{{ framing }}</strong>. Presentation presets change typography and surface treatment; framing changes the shared semantic color system and this emitted theme.
    </p>

    <fieldset class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <legend class="text-sm font-medium text-highlighted">
        Exact {{ tier }}-role seed set
      </legend>
      <label
        v-for="role in seedRoles"
        :key="role"
        class="grid gap-1 text-xs text-muted"
      >{{ role }}
        <input
          v-model="roles[role]"
          :aria-label="`${role} seed color`"
          class="rounded border border-default bg-default px-2 py-1 font-mono text-sm text-highlighted"
          maxlength="7"
          pattern="#[0-9a-fA-F]{6}"
          inputmode="text"
        >
      </label>
    </fieldset>

    <p
      v-if="result.error"
      role="alert"
      class="rounded-md border border-error bg-error/10 px-3 py-2 text-sm text-error"
    >
      {{ result.error }}
    </p>
    <template v-else-if="result.theme">
      <VscodeThemePreview
        :semantic-token-colors="result.theme.semanticTokenColors"
        :workbench-colors="result.theme.workbenchColors"
      />
      <div class="grid gap-4 lg:grid-cols-2">
        <details class="rounded-lg border border-default p-3">
          <summary class="cursor-pointer font-medium text-highlighted">
            Role provenance
          </summary><p class="mt-2 text-sm text-muted">
            {{ result.theme.provenance.pinnedRoles.length }} supplied and pinned; {{ result.theme.provenance.derivedRoles.length }} derived.
          </p><p class="mt-2 break-words font-mono text-xs text-muted">
            Derived: {{ result.theme.provenance.derivedRoles.join(', ') }}
          </p>
        </details>
        <details class="rounded-lg border border-default p-3">
          <summary class="cursor-pointer font-medium text-highlighted">
            Contrast checks
          </summary><ul class="mt-2 space-y-1 text-sm text-muted">
            <li
              v-for="entry in result.theme.contrast"
              :key="`${entry.foreground}-${entry.background}`"
            >
              <strong :class="entry.passed ? 'text-success' : 'text-error'">{{ entry.passed ? 'Pass' : 'Fail' }}</strong> {{ entry.foreground }} / {{ entry.background }}: {{ entry.ratio.toFixed(2) }} ({{ entry.minRatio }}–{{ entry.maxRatio ?? '∞' }})
            </li>
          </ul>
        </details>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="rounded-md border border-default bg-default px-3 py-2 text-sm font-medium text-highlighted"
          @click="copyTheme"
        >
          Copy theme JSON
        </button><button
          type="button"
          class="rounded-md border border-default bg-default px-3 py-2 text-sm font-medium text-highlighted"
          @click="downloadTheme"
        >
          Download theme JSON
        </button>
      </div>
      <details class="overflow-hidden rounded-lg border border-default">
        <summary class="cursor-pointer px-3 py-2 text-sm font-medium text-highlighted">
          Emitted theme.json
        </summary><pre class="max-h-72 overflow-auto border-t border-default p-3 text-xs leading-relaxed text-highlighted"><code>{{ themeJson }}</code></pre>
      </details>
    </template>
  </section>
</template>
