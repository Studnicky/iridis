<script setup lang="ts">
/**
 * ResolvedRoleCard.vue
 *
 * Reusable read-only tile that surfaces a single resolved role: name,
 * contrast badge, hex string, and OKLCH coordinates. Painted with the
 * role's own color as the background; foreground text is auto-tuned to
 * whichever of white or black yields the better WCAG 2.1 contrast.
 *
 * The badge string is supplied by the parent — this component is dumb
 * about which standard cleared. Downstream consumers receive a pre-
 * computed badge ('AAA' | 'AA' | 'APCA' | 'APCA·Bronze' | 'fail' | '')
 * so the same tile renders identically whether the engine enforced AA,
 * AAA, or APCA pairs.
 *
 * Every visible field carries a native `title` tooltip explaining what
 * it represents and how a downstream consumer should interpret it.
 */

import { colorRecordFactory, contrastWcag21 } from '@studnicky/iridis';

import type { ColorRecordInterface } from '@studnicky/iridis/model';

const props = defineProps<{
  'name':         string;
  'record':       ColorRecordInterface;
  'badge':        string;
  'badgeTitle'?:  string;
}>();

function fmtOklch(c: ColorRecordInterface): string {
  return `L ${c.oklch.l.toFixed(2)} · C ${c.oklch.c.toFixed(2)} · H ${Math.round(c.oklch.h)}`;
}

function safeOnRoleColor(role: ColorRecordInterface): string {
  const white   = colorRecordFactory.fromHex('#ffffff');
  const black   = colorRecordFactory.fromHex('#000000');
  const onWhite = contrastWcag21.apply(white, role) as number;
  const onBlack = contrastWcag21.apply(black, role) as number;
  return onWhite >= onBlack ? '#ffffff' : '#0a0a0a';
}

function fg(): string {
  return safeOnRoleColor(props.record);
}

function fgMuted(): string {
  return safeOnRoleColor(props.record) + 'b0';
}

function badgeBorder(): string {
  return safeOnRoleColor(props.record) + '55';
}
</script>

<template>
  <div
    class="resolved-role-card"
    :style="{ background: record.hex }"
  >
    <div class="resolved-role-card__head">
      <span
        class="resolved-role-card__name"
        :style="{ color: fg() }"
        :title="`Role name. The engine emits this as CSS custom property --c-${name}; contrast pairs reference it by this exact string. Downstream consumers read it from state.roles to bind themed surfaces.`"
      >{{ name }}</span>
      <span
        v-if="badge !== ''"
        class="resolved-role-card__badge"
        :style="{ color: fg(), borderColor: badgeBorder() }"
        :title="badgeTitle ?? `Contrast badge surfaces what the engine enforced for this role as a foreground in declared contrast pairs. AAA beats AA beats APCA·Bronze beats APCA; 'fail' means at least one declared pair did not meet its minimum ratio.`"
      >{{ badge }}</span>
    </div>
    <span
      class="resolved-role-card__hex"
      :style="{ color: fg() }"
      :title="`Resolved hex string. This is the sRGB output color the engine produced for this role; copy-paste it into design tooling or read it from state.roles[name].hex.`"
    >{{ record.hex }}</span>
    <span
      class="resolved-role-card__coords"
      :style="{ color: fgMuted() }"
      :title="`OKLCH coordinates — L lightness (0 black to 1 white), C chroma (0 grey to ~0.4 saturated), H hue in degrees (0 red, 120 green, 240 blue). Read state.roles[name].oklch for the raw numbers.`"
    >{{ fmtOklch(record) }}</span>
  </div>
</template>

<style scoped>
.resolved-role-card {
  padding: 0.7rem 0.85rem;
  border-radius: var(--iridis-radius-md);
  border: 1px solid rgba(255, 255, 255, 0.10);
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
  min-height: 82px;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.10),
    inset 0 -10px 14px rgba(0, 0, 0, 0.22),
    0 1px 2px rgba(0, 0, 0, 0.18),
    0 4px 12px -4px rgba(0, 0, 0, 0.25);
}
.resolved-role-card__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.4rem;
}
.resolved-role-card__name {
  font-size: 0.8rem;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55);
}
.resolved-role-card__badge {
  font-family: var(--vp-font-family-mono);
  font-size: 0.6rem;
  padding: 0.05rem 0.35rem;
  border-radius: 2px;
  border: 1px solid;
  background: rgba(0, 0, 0, 0.25);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55);
}
.resolved-role-card__hex,
.resolved-role-card__coords {
  font-family: var(--vp-font-family-mono);
  font-size: 0.66rem;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55);
}
.resolved-role-card__coords { font-size: 0.6rem; }
</style>
