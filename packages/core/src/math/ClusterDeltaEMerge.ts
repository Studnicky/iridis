import type { ColorRecordInterface } from '../types/index.ts';
import { colorRecordFactory } from './ColorRecordFactory.ts';
import { deltaE2000 } from './DeltaE2000.ts';

interface ClusterInterface {
  centroid:  ColorRecordInterface;
  weight:    number;
}

function recordWeight(record: ColorRecordInterface): number {
  const w = record.hints?.weight;
  return typeof w === 'number' && w > 0 ? w : 1;
}

/**
 * Builds a centroid record from two clusters by weighted-averaging in
 * OKLab space (a*, b* are the rectangular Cartesian projection of
 * chroma+hue) so hue wrap-around is handled by the projection rather
 * than by a circular-mean correction.
 */
function mergeCentroids(a: ClusterInterface, b: ClusterInterface): ClusterInterface {
  // Treat zero-weight inputs as weight=1 so the weighted average stays
  // defined. A zero-weight cluster is degenerate (the upstream task
  // should not produce one), but guarding here keeps a single bad input
  // from NaN-poisoning every subsequent merge.
  const wa = a.weight > 0 ? a.weight : 1;
  const wb = b.weight > 0 ? b.weight : 1;
  const tot = wa + wb;
  const aRad = (a.centroid.oklch.h * Math.PI) / 180;
  const bRad = (b.centroid.oklch.h * Math.PI) / 180;
  const aA = a.centroid.oklch.c * Math.cos(aRad);
  const aB = a.centroid.oklch.c * Math.sin(aRad);
  const bA = b.centroid.oklch.c * Math.cos(bRad);
  const bB = b.centroid.oklch.c * Math.sin(bRad);
  const L = (a.centroid.oklch.l * wa + b.centroid.oklch.l * wb) / tot;
  const aMean = (aA * wa + bA * wb) / tot;
  const bMean = (aB * wa + bB * wb) / tot;
  const C = Math.sqrt(aMean * aMean + bMean * bMean);
  let H = (Math.atan2(bMean, aMean) * 180) / Math.PI;
  if (H < 0) H += 360;
  const alpha = (a.centroid.alpha * wa + b.centroid.alpha * wb) / tot;
  return {
    'centroid': colorRecordFactory.fromOklch(L, C, H, alpha, 'oklch', { 'weight': tot }),
    'weight':   tot,
  };
}

/**
 * Agglomerative deltaE2000 clustering. Each input record starts as its
 * own cluster; the algorithm repeatedly merges the closest pair (in
 * deltaE2000) until exactly K clusters remain. Distances are recomputed
 * for the new centroid after every merge.
 *
 * Output records carry `hints.weight` set to the cluster's total
 * weight (sum of input weights). The cluster that absorbed the most
 * pixels comes out heaviest, irrespective of merge order.
 *
 * Complexity is O(N² log N) due to repeated nearest-pair scans;
 * intended for ≤ a few hundred input bins (i.e., post-histogram).
 * Calling against raw pixel arrays will be slow — feed it the output
 * of `gallery:histogram` instead.
 */
export class ClusterDeltaEMerge {
  readonly 'name' = 'clusterDeltaEMerge';

  apply(colors: readonly ColorRecordInterface[], k: number): ColorRecordInterface[] {
    if (colors.length === 0) return [];
    if (k < 1) {
      throw new Error('ClusterDeltaEMerge.apply: k must be a positive number');
    }
    const targetK = Math.min(Math.floor(k), colors.length);
    if (targetK >= colors.length) {
      /* Pass-through: no clustering needed. Return inputs verbatim when
         a weight is already declared (preserves `displayP3` + every hint
         the upstream task attached); otherwise reallocate via the factory
         (the only sanctioned allocation point — spread-append would
         break the monomorphic hidden class per ColorRecordInterface
         docs) while merging existing hint keys (`role`, `intent`, etc.)
         with the stamped `weight: 1`. */
      return colors.map((c) => {
        if (typeof c.hints?.weight === 'number' && c.hints.weight > 0) return c;
        const hints = { ...(c.hints ?? {}), 'weight': 1 };
        return colorRecordFactory.fromOklch(c.oklch.l, c.oklch.c, c.oklch.h, c.alpha, c.sourceFormat, hints);
      });
    }

    let clusters: ClusterInterface[] = colors.map((c) => ({
      'centroid': c,
      'weight':   recordWeight(c),
    }));

    while (clusters.length > targetK) {
      let bestI = 0;
      let bestJ = 1;
      let bestD = Infinity;
      for (let i = 0; i < clusters.length; i++) {
        const a = clusters[i];
        if (a === undefined) continue;
        for (let j = i + 1; j < clusters.length; j++) {
          const b = clusters[j];
          if (b === undefined) continue;
          // Non-finite distances (NaN from a degenerate centroid, e.g.
          // zero-chroma both sides where the deltaE branch divides by
          // C1p*C2p === 0) would silently skip the pair otherwise and,
          // if EVERY pair returns NaN, the nearest-pair scan never picks
          // a winner and the loop spins forever. Coerce non-finite to
          // Infinity so the comparison is total, and the fallback below
          // guarantees forward progress when all pairs tie.
          const raw = deltaE2000.apply(a.centroid, b.centroid);
          const d   = Number.isFinite(raw) ? raw : Infinity;
          if (d < bestD) {
            bestD = d;
            bestI = i;
            bestJ = j;
          }
        }
      }
      // Forward-progress guarantee: if every pair scanned to Infinity
      // (a pathological all-NaN centroid set), still merge the first
      // two clusters so we drain toward targetK rather than hang.
      if (bestD === Infinity) {
        bestI = 0;
        bestJ = 1;
      }
      const a = clusters[bestI];
      const b = clusters[bestJ];
      if (a === undefined || b === undefined) break;
      const merged = mergeCentroids(a, b);
      clusters = [
        ...clusters.slice(0, bestI),
        merged,
        ...clusters.slice(bestI + 1, bestJ),
        ...clusters.slice(bestJ + 1),
      ];
    }

    return clusters.map((cl) => cl.centroid);
  }
}

/** Singleton instance registered as the `clusterDeltaEMerge` math primitive. */
export const clusterDeltaEMerge = new ClusterDeltaEMerge();
