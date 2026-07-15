# @studnicky/iridis-rdf

Annotates the resolved palette as RDF triples (via `n3`) and serialises to
Turtle, TriG, N-Quads, or JSON-LD. The reasoning graph carries the truth: hex,
sRGB channels, OKLCH coordinates, contrast ratios, and (when the source
record is wide-gamut) Display-P3 channels alongside the sRGB ones.

The vocabulary lives at `iridisVocab` (`packages/rdf/src/data/iridisVocab.ts`)
under `https://studnicky.dev/iridis#`. Each `ColorRecord` becomes an
`iridis:Color` resource with `iridis:hex`, `iridis:rgbR/G/B`, and
`iridis:oklchL/C/H` predicates. When `record.displayP3` is populated the same
subject also carries `iridis:displayP3R/G/B` triples (xsd:decimal, 4dp).

Roles carry their actual resolution, not just their final color: `iridis:derivedFrom`
(this role's color is a hue-rotated offset of another role's, per ExpandFamily),
`iridis:pinned` / `iridis:synthesized` (booleans reflecting this run's own
resolution metadata), `iridis:intent` (the schema's canonical ontology hook),
`iridis:lightnessRangeMin/Max`, `iridis:chromaRangeMin/Max`, `iridis:hueClamp`
(the schema's declared bounds), and `iridis:clampedFrom` (the seed color this
run actually nudged into range, when one was).

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

const graph      = state.outputs['rdf:reasoningGraph']!;
const serialized = state.outputs['rdf:serialized']!;
// graph      : IterableStoreInterface // the live n3 Store, ready for SPARQL.
// serialized : string                 // the serialised text in the requested format.
```

## Tasks

| Name | Output slot | Notes |
|---|---|---|
| `reason:annotate` | `outputs['rdf:reasoningGraph']` | Builds the n3 `Store`: emits `Role`/`Color` resources plus per-role `derivedFrom`/`pinned`/`synthesized`/`intent`/range-clamp triples, per-pair `wcag21Ratio`, and per-record `displayP3R/G/B` literals when populated. |
| `reason:serialize` | `outputs['rdf:serialized']` | Renders the graph to the requested format. Reads `metadata['rdf:format']`; accepts `Turtle` (default), `TriG`, `N-Quads`, or `application/ld+json`. |

JSON-LD output is consumed directly by `@context`-aware tooling; Turtle / TriG /
N-Quads are produced by the n3 `Writer` and round-trip through any standard
RDF stack.

Part of [iridis](https://github.com/Studnicky/iridis).
