<script setup lang="ts">
/**
 * SidebarToc.vue — accordion outline.
 *
 * Walks the live DOM (.vp-doc h2/h3) and groups H3 children under each H2.
 * The H2 whose content is currently in the viewport auto-expands; siblings
 * collapse. User can manually click any H2 to override (sticky for that
 * page).
 */

import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vitepress';

interface Heading {
  'level': 2 | 3;
  'text':  string;
  'id':    string;
}
interface Group {
  'h2':       Heading;
  'children': Heading[];
}

const router      = useRouter();
const groups      = ref<Group[]>([]);
const activeId    = ref<string | null>(null);
const userOpen    = ref<string | null>(null);

let intersection: IntersectionObserver | null = null;
let mutation:     MutationObserver     | null = null;

function readGroups(): void {
  if (typeof document === 'undefined') return;
  const els = Array.from(document.querySelectorAll('.vp-doc h2[id], .vp-doc h3[id]'));
  const parsed: Heading[] = [];
  for (const el of els) {
    const text = (el.textContent ?? '').replace(/​/g, '').replace(/^#\s*/, '').trim();
    if (text === '') continue;
    parsed.push({
      'level': el.tagName === 'H2' ? 2 : 3,
      'text':  text,
      'id':    el.id,
    });
  }
  // Group H3s under their preceding H2. Stray H3s before any H2 form a
  // synthetic group keyed to the first heading found.
  const next: Group[] = [];
  let current: Group | null = null;
  for (const h of parsed) {
    if (h.level === 2) {
      current = { 'h2': h, 'children': [] };
      next.push(current);
    } else if (current) {
      current.children.push(h);
    } else {
      // No H2 yet — make a synthetic top-level entry (the H3 itself).
      current = { 'h2': h, 'children': [] };
      next.push(current);
    }
  }
  groups.value = next;
}

function rebindIntersection(): void {
  if (typeof window === 'undefined') return;
  intersection?.disconnect();
  intersection = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => (a.target as HTMLElement).offsetTop - (b.target as HTMLElement).offsetTop);
      if (visible[0]) {
        activeId.value = (visible[0].target as HTMLElement).id;
      }
    },
    { 'rootMargin': '-15% 0% -70% 0%' },
  );
  for (const g of groups.value) {
    const h2El = document.getElementById(g.h2.id);
    if (h2El) intersection.observe(h2El);
    for (const child of g.children) {
      const el = document.getElementById(child.id);
      if (el) intersection.observe(el);
    }
  }
}

function refresh(): void {
  readGroups();
  rebindIntersection();
}

onMounted(() => {
  refresh();
  if (typeof document !== 'undefined') {
    const root = document.querySelector('.VPDoc') ?? document.body;
    mutation = new MutationObserver(() => requestAnimationFrame(refresh));
    mutation.observe(root, { 'childList': true, 'subtree': true });
  }
  router.onAfterRouteChange = () => {
    setTimeout(refresh, 50);
    userOpen.value = null;
    activeId.value = null;
  };
});
onUnmounted(() => {
  intersection?.disconnect();
  mutation?.disconnect();
  intersection = null;
  mutation     = null;
});

// A group is "open" if user explicitly toggled it OR if its h2/child is
// the current active heading.
function isOpen(g: Group): boolean {
  if (userOpen.value === g.h2.id) return true;
  if (userOpen.value !== null && userOpen.value !== g.h2.id) return false;
  if (activeId.value === g.h2.id) return true;
  return g.children.some((c) => c.id === activeId.value);
}
function toggleGroup(g: Group): void {
  userOpen.value = userOpen.value === g.h2.id ? null : g.h2.id;
}
function clickHeading(h: Heading): void {
  // Let the anchor navigate; clear sticky-open so scroll-driven open resumes
  setTimeout(() => { userOpen.value = null; }, 600);
}

const visible = computed(() => groups.value.length > 0);
</script>

<template>
  <ClientOnly>
    <nav v-if="visible" class="iridis-toc" aria-label="On this page">
      <div class="iridis-toc__head">
        <span class="iridis-toc__label">On this page</span>
      </div>
      <ul class="iridis-toc__groups">
        <li v-for="g in groups" :key="g.h2.id" :class="['iridis-toc__group', { 'iridis-toc__group--open': isOpen(g) }]">
          <button type="button" class="iridis-toc__group-head" :aria-expanded="isOpen(g)" @click="toggleGroup(g)">
            <span class="iridis-toc__chev" aria-hidden="true">{{ isOpen(g) ? '▾' : '▸' }}</span>
            <a
              :href="'#' + g.h2.id"
              :class="['iridis-toc__group-link', { 'iridis-toc__group-link--active': activeId === g.h2.id }]"
              @click.stop="clickHeading(g.h2)"
            >{{ g.h2.text }}</a>
          </button>
          <ul v-show="isOpen(g) && g.children.length > 0" class="iridis-toc__sublist">
            <li v-for="c in g.children" :key="c.id" :class="['iridis-toc__sub', { 'iridis-toc__sub--active': activeId === c.id }]">
              <a :href="'#' + c.id" @click="clickHeading(c)">{{ c.text }}</a>
            </li>
          </ul>
        </li>
      </ul>
    </nav>
  </ClientOnly>
</template>

<style scoped>
.iridis-toc {
  margin: 0.4rem 0;
  padding-top: 0.85rem;
  border-top: 1px solid color-mix(in oklch, var(--vp-c-divider) 50%, transparent);
}
.iridis-toc__head {
  display: flex;
  padding: 0.35rem 0 0.4rem;
  color: var(--vp-c-text-3);
}
.iridis-toc__label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.iridis-toc__groups,
.iridis-toc__sublist {
  list-style: none;
  margin: 0;
  padding: 0;
}
.iridis-toc__group { margin: 0.05rem 0; }
.iridis-toc__group-head {
  display: grid;
  grid-template-columns: 1.1rem 1fr;
  align-items: baseline;
  gap: 0.35rem;
  width: 100%;
  padding: 0.18rem 0;
  background: transparent;
  border: 0;
  cursor: pointer;
  text-align: left;
  color: var(--vp-c-text-2);
  font-size: 0.82rem;
}
.iridis-toc__chev { font-size: 0.65rem; color: var(--vp-c-text-3); }
.iridis-toc__group-link {
  color: inherit;
  text-decoration: none;
  font-weight: 500;
  border-left: 2px solid transparent;
  padding-left: 0.45rem;
  margin-left: 0;
}
.iridis-toc__group-link:hover { color: var(--vp-c-brand-1); }
.iridis-toc__group-link--active {
  color: var(--vp-c-brand-1);
  border-left-color: var(--vp-c-brand-1);
  font-weight: 600;
}
.iridis-toc__sublist { padding-left: 1.5rem; }
.iridis-toc__sub a {
  display: block;
  padding: 0.16rem 0 0.16rem 0.45rem;
  font-size: 0.76rem;
  color: var(--vp-c-text-3);
  text-decoration: none;
  border-left: 2px solid transparent;
}
.iridis-toc__sub a:hover { color: var(--vp-c-brand-1); }
.iridis-toc__sub--active a {
  color: var(--vp-c-brand-1);
  border-left-color: var(--vp-c-brand-1);
}
</style>
