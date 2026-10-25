# @studnicky/iridis-rdf

Annotates the resolved palette as RDF triples (via `n3`) and serialises to
Turtle, TriG, N-Quads, or JSON-LD. The reasoning graph carries the truth: hex,
sRGB channels, OKLCH coordinates, contrast ratios, and (when the source
record is wide-gamut) Display-P3 channels alongside the sRGB ones.

The vocabulary lives at `iridisVocab` (`packages/rdf/src/data/iridisVocab.ts`)
under `https://studnicky.dev/iridis#`. Each `ColorRecord` becomes an
`iridis:Color` resource with `iridis:hex`, `iridis:rgbR/G/B`, and
`iridis:oklchL/C/H` predicates. When `record.displayP3` is populated the same
subject also carries `iridis:displayP3R/G/B` triples as `xsd:decimal` values.

Roles carry their actual resolution, not just their final color: `iridis:derivedFrom`
(this role's color is a hue-rotated offset of another role's, per ExpandFamily),
`iridis:pinned` / `iridis:synthesized` (booleans reflecting this run's own
resolution metadata), `iridis:intent` (the schema's canonical ontology hook),
`iridis:lightnessRangeMin/Max`, `iridis:chromaRangeMin/Max`, `iridis:hueClamp`
(the schema's declared bounds), and `iridis:clampedFrom` (the seed color this
run actually nudged into range, when one was).

## Relationship graph provenance

An authored `relationshipGraph` is projected as linked graph, group, mode, variant, relationship, and tolerance resources. `iridis:relationshipSource` and `iridis:relationshipTarget` support reverse traversal from a source role to every derived target. A resolved role links to its `iridis:RelationshipResolution`, which identifies the authored relationship, group, selected mode, source roles, baseline and resolved colors, disposition, and any allowed deviation. Operation parameters remain queryable through their relationship resource.

## Install

GitHub Packages requires a personal access token (classic) with
`read:packages`; the token's account must also have read access to this
package's repository. Expose the token as `NODE_AUTH_TOKEN`, then configure
the `@studnicky` scope before installing:

```ini
# ~/.npmrc
@studnicky:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

```bash
npm install @studnicky/iridis @studnicky/iridis-contrast @studnicky/iridis-rdf
```

## Usage

```ts
import type { RoleSchemaEntity } from '@studnicky/iridis';

import { Engine, coreTasks } from '@studnicky/iridis';
import { contrastPlugin } from '@studnicky/iridis-contrast';
import { rdfPlugin }         from '@studnicky/iridis-rdf';

export function generateReasoningGraph(roleSchema: RoleSchemaEntity.Type) {
  const engine = new Engine();
  for (const task of coreTasks) engine.tasks.register(task);
  engine.adopt(rdfPlugin);
  engine.adopt(contrastPlugin);

  engine.pipeline([
    'intake:any',
    'resolve:roles',
    'expand:family',
    'enforce:compliance',
    'reason:annotate',
    'reason:serialize',
  ]);

  const state = engine.run({
    'bypass':   undefined,
    'colors':   ['#8B5CF6'],
    'contrast': {
      'algorithm':  'wcag21',
      'cvdMode': 'nudge',
      'extra':      undefined,
      'level':      'AA',
    },
    'emit':      undefined,
    'maxColors': undefined,
    'metadata':  { 'rdf:format': 'Turtle' },
    'roles':     roleSchema,
    'runtime':   undefined,
  });

  const graph      = state.outputs['rdf:reasoningGraph']!;
  const serialized = state.outputs['rdf:serialized']!;
  // graph      : IterableStoreInterface // the live n3 Store, ready for SPARQL.
  // serialized : string                 // the serialised text in the requested format.

  return { graph, serialized };
}
```

## Tasks

| Name | Output slot | Notes |
|---|---|---|
| `reason:annotate` | `outputs['rdf:reasoningGraph']` | Builds the n3 `Store`: emits `Role`/`Color` resources, role provenance and bounds, authored relationship graphs, relationship tolerances, resolved-role relationship provenance, per-pair `wcag21Ratio`, and populated Display-P3 literals. |
| `reason:serialize` | `outputs['rdf:serialized']` | Renders the graph to the requested format. Reads `metadata['rdf:format']`; accepts `Turtle` (default), `TriG`, `N-Quads`, or `application/ld+json`. |

JSON-LD output is consumed directly by `@context`-aware tooling; Turtle / TriG /
N-Quads are produced by the n3 `Writer` and round-trip through any standard
RDF stack.

Part of [iridis](https://github.com/Studnicky/iridis).
