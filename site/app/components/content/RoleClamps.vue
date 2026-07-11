<script setup lang="ts">
import { useIridis } from '~/composables/useIridis.ts';
import { roleSchemaByName } from '~/theme/RoleSchemaByName.ts';

const { roles, roleClamps, roleDistances, rolesSynthesized, rolesPinned, rolesDerived, schemaName, framing } = useIridis();

const mathList = computed(() => {
  const schema = roleSchemaByName[schemaName.value]?.[framing.value];
  const roleDefs = schema?.roles || [];

  return Object.keys(roles.value).map(roleName => {
    const clamp = roleClamps.value[roleName];
    const distances = roleDistances.value[roleName] || {};
    const synthesized = rolesSynthesized.value.includes(roleName);
    const isPinned = rolesPinned.value.includes(roleName);
    const isDerived = rolesDerived.value.includes(roleName);
    
    // Sort candidates by distance
    const candidates = Object.entries(distances).map(([hex, dist]) => ({
      hex,
      dist,
      isWinner: false,
    })).sort((a, b) => a.dist - b.dist);
    
    let winnerHex = '';
    const hasCandidates = candidates.length > 0;
    if (!synthesized && !isPinned && !isDerived && hasCandidates) {
      candidates[0]!.isWinner = true;
      winnerHex = candidates[0]!.hex;
    }

    const def = roleDefs.find(r => r.name === roleName);

    return {
      name: roleName,
      synthesized,
      isPinned,
      isDerived,
      parentRole: def?.derivedFrom,
      candidates,
      clamp: clamp ? {
        seedHex: clamp.seedHex.toLowerCase(),
        resolvedHex: clamp.resolvedHex.toLowerCase(),
        seedOklch: `L ${clamp.seedOklch.l.toFixed(2)} · C ${clamp.seedOklch.c.toFixed(2)} · H ${Math.round(clamp.seedOklch.h)}`,
        roleOklch: `L ${clamp.resolvedOklch.l.toFixed(2)} · C ${clamp.resolvedOklch.c.toFixed(2)} · H ${Math.round(clamp.resolvedOklch.h)}`,
      } : null,
    };
  });
});
</script>

<template>
  <div class="space-y-6">
    <p class="text-sm text-muted">
      This shows the engine's hidden "hand" by revealing how every role was selected from the provided seeds. You can see the OKLCH distance for each candidate seed, whether a role had to be synthesized, and where input seeds were forcefully clamped to satisfy lightness, chroma, or semantic hue envelopes.
    </p>

    <div v-if="mathList.length === 0" class="text-muted text-sm italic py-4">
      No roles resolved yet.
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div
        v-for="role in mathList"
        :key="role.name"
        class="flex flex-col gap-3 rounded-lg border border-default bg-elevated p-4 text-sm"
      >
        <div class="flex items-center justify-between">
          <div class="font-bold text-highlighted uppercase tracking-wider">{{ role.name }}</div>
          <UBadge v-if="role.synthesized" color="warning" variant="subtle" size="sm">Synthesized</UBadge>
          <UBadge v-else-if="role.isDerived" color="secondary" variant="subtle" size="sm">Derived</UBadge>
          <UBadge v-else-if="role.isPinned" color="info" variant="subtle" size="sm">Explicit Pin</UBadge>
          <UBadge v-else-if="role.clamp" color="primary" variant="subtle" size="sm">Clamped</UBadge>
          <UBadge v-else color="success" variant="subtle" size="sm">Direct Match</UBadge>
        </div>
        
        <div v-if="role.synthesized" class="text-xs text-muted italic">
          No seed was close enough (all candidates exceeded the maximum acceptable OKLCH distance for this role's semantic hue/chroma). A new color was mathematically synthesized.
        </div>
        <div v-else-if="role.isDerived" class="text-xs text-muted italic">
          This role is derived from <strong>{{ role.parentRole }}</strong>. Its exact color is mathematically offset based on the schema's lightness and chroma instructions.
        </div>
        <div v-else-if="role.isPinned" class="text-xs text-muted italic">
          This role was explicitly pinned to a seed by the user. Distance matching was skipped.
        </div>
        <div v-else class="space-y-2">
          <div class="text-xs font-semibold text-dimmed uppercase">Candidates</div>
          <div class="space-y-1">
            <div 
              v-for="cand in role.candidates" 
              :key="cand.hex"
              class="flex items-center gap-3 p-1.5 rounded-md"
              :class="cand.isWinner ? 'bg-primary/10 border border-primary/20' : 'opacity-70'"
            >
              <div class="h-5 w-5 rounded shadow-inner flex-none" :style="{ backgroundColor: cand.hex }" />
              <div class="flex-1 text-xs font-mono">{{ cand.hex.toLowerCase() }}</div>
              <div class="text-xs font-mono" :class="cand.isWinner ? 'text-primary font-bold' : 'text-muted'">
                Δ {{ cand.dist.toFixed(4) }}
              </div>
            </div>
          </div>
        </div>

        <!-- Clamping -->
        <div v-if="role.clamp" class="mt-2 pt-3 border-t border-default/50 space-y-2">
          <div class="text-xs font-semibold text-dimmed uppercase">Clamp applied</div>
          <div class="flex items-center gap-3">
            <div class="h-6 w-6 rounded border border-default shadow-inner flex-none" :style="{ backgroundColor: role.clamp.seedHex }" />
            <div class="flex flex-col min-w-0">
              <span class="text-[10px] text-muted truncate">{{ role.clamp.seedOklch }}</span>
            </div>
          </div>
          <div class="flex justify-start ml-2.5 text-muted">
            <UIcon name="i-material-symbols-arrow-downward-rounded" class="h-3 w-3" />
          </div>
          <div class="flex items-center gap-3">
            <div class="h-6 w-6 rounded border border-default shadow-inner flex-none" :style="{ backgroundColor: role.clamp.resolvedHex }" />
            <div class="flex flex-col min-w-0">
              <span class="text-[10px] text-primary truncate">{{ role.clamp.roleOklch }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
