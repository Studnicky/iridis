# @studnicky/iridis-rdf

Annotates the resolved palette as RDF triples (via `n3`) and serialises to
Turtle, TriG, N-Quads, or JSON-LD. The reasoning graph carries the truth: hex,
sRGB channels, OKLCH coordinates, contrast ratios, and — when the source
record is wide-gamut — Display-P3 channels alongside the sRGB ones.

The vocabulary lives at `colorologyVocab` (`packages/rdf/src/data/colorologyVocab.ts`)
under `https://studnicky.dev/colorology/`. Each `ColorRecord` becomes a
`colorology:Color` resource with `colorology:hex`, `colorology:r/g/b`, and
`colorology:oklch` predicates. When `record.displayP3` is populated the same
subject also carries `colorology:displayP3R/G/B` triples (xsd:decimal, 4dp).

## Install

```bash
npm install @studnicky/iridis @studnicky/iridis-rdf
```

## Usage

```ts
import { Engine, coreTasks } from '@studnicky/iridis';
import { rdfPlugin }         from '@studnicky/iridis-rdf';

const engine = new Engine();
for (const task of coreTasks) engine.tasks.register(task);
engine.adopt(rdfPlugin);

engine.pipeline([
  'intake:any',
  'expand:family',
  'resolve:roles',
  'enforce:contrast',
  'reason:annotate',
  'reason:serialize',
]);

const state = await engine.run({
  'colors':   ['#8B5CF6'],
  'roles':    yourRoleSchema,
  'contrast': { 'level': 'AA' },
  'metadata': { 'reasoning': { 'format': 'Turtle' } },
});

const out = state.outputs['reasoning']!;
// out.graph      : IterableStoreInterface — the live n3 Store, ready for SPARQL.
// out.serialized : string — the serialised text in the requested format.
```

## Tasks

| Name | Output slot | Notes |
|---|---|---|
| `reason:annotate` | `outputs.reasoning.graph` | Builds the n3 `Store`: emits `Color`, `Role`, `Palette`, `ContrastPair` resources plus per-record `displayP3R/G/B` literals when populated. |
| `reason:serialize` | `outputs.reasoning.serialized` | Renders the graph to the requested format. Reads `metadata.reasoning.format`; accepts `Turtle` (default), `TriG`, `N-Quads`, or `application/ld+json`. |

JSON-LD output is consumed directly by `@context`-aware tooling; Turtle / TriG /
N-Quads are produced by the n3 `Writer` and round-trip through any standard
RDF stack.

Part of [iridis](https://github.com/Studnicky/iridis).
