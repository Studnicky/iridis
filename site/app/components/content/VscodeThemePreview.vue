<script setup lang="ts">
const props = defineProps<{
  workbenchColors: Readonly<Record<string, string>>;
  semanticTokenColors: Readonly<Record<string, unknown>>;
}>();

function color(name: string, fallback: string): string {
  return props.workbenchColors[name] ?? fallback;
}
</script>

<template>
  <div
    class="overflow-hidden rounded-lg border border-default"
    aria-label="VS Code theme preview"
  >
    <div
      class="flex items-center gap-2 border-b border-default px-3 py-2 text-xs text-muted"
      :style="{ backgroundColor: color('titleBar.activeBackground', color('editor.background', 'var(--ui-bg)')) }"
    >
      <span class="size-2 rounded-full bg-error" /><span class="size-2 rounded-full bg-warning" /><span class="size-2 rounded-full bg-success" /><span class="ml-2">theme.json</span>
    </div>
    <div
      class="grid min-h-36 grid-cols-[8rem_minmax(0,1fr)] font-mono text-xs"
      :style="{ backgroundColor: color('editor.background', 'var(--ui-bg)'), color: color('editor.foreground', 'var(--ui-text)') }"
    >
      <aside
        class="space-y-2 border-r border-default p-3"
        :style="{ backgroundColor: color('sideBar.background', 'var(--ui-bg-elevated)') }"
      >
        <p class="font-sans text-[10px] uppercase tracking-wide text-muted">
          Explorer
        </p><p>src</p><p class="pl-3">
          index.ts
        </p><p class="pl-3">
          theme.ts
        </p>
      </aside>
      <pre class="min-w-0 overflow-auto p-4 leading-6"><code><span :style="{ color: color('editorLineNumber.foreground', 'var(--ui-text-muted)') }">1</span> <span :style="{ color: color('symbolIcon.keywordForeground', color('editor.foreground', 'var(--ui-text)')) }">export</span> <span :style="{ color: color('symbolIcon.functionForeground', color('editor.foreground', 'var(--ui-text)')) }">function</span> theme() {
<span :style="{ color: color('editorLineNumber.foreground', 'var(--ui-text-muted)') }">2</span>   <span :style="{ color: color('symbolIcon.variableForeground', color('editor.foreground', 'var(--ui-text)')) }">return</span> <span :style="{ color: color('symbolIcon.stringForeground', color('editor.foreground', 'var(--ui-text)')) }">'{{ Object.keys(semanticTokenColors).length }} semantic tokens'</span>;
<span :style="{ color: color('editorLineNumber.foreground', 'var(--ui-text-muted)') }">3</span> }</code></pre>
    </div>
  </div>
</template>
