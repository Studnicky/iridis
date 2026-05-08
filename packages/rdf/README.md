# @studnicky/iridis-rdf

Annotates the palette with RDF triples via n3. Serializes to Turtle, TriG, N-Quads, or JSON-LD. Browser-safe.

## Install

```bash
npm install @studnicky/iridis @studnicky/iridis-rdf
```

## Usage

```ts
import { engine } from '@studnicky/iridis';
import { rdfPlugin } from '@studnicky/iridis-rdf';

engine.adopt(rdfPlugin);
engine.pipeline(['intake:any', 'resolve:roles', 'emit:rdf']);

const state = await engine.run({
  colors: ['#8B5CF6'],
  roles: yourRoleSchema,
});

const graph = state.outputs.rdf;
// graph.serialize('text/turtle'): string
// graph.serialize('application/ld+json'): { '@context': ..., '@graph': ... }
```

The plugin maps ColorRecord entries to RDF resources with properties like `srgb:hex`, `wcag:contrastRatio`, and `schema:name`. Use it to publish palettes as linked data or feed them into semantic reasoning workflows. Supports all n3 serialization formats.

Part of [iridis](https://github.com/Studnicky/iridis).
