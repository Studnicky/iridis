# @studnicky/pipeline

> Generic typed async pipeline for sequential context transforms

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/pipeline)

`@studnicky/pipeline` provides `Pipeline<T>`, a generic typed async pipeline that runs a context value through an ordered list of transform functions, passing each stage's output as the next stage's input. Construct instances via `Pipeline.create<T>()` or `Pipeline.builder<T>().build()`. Stages are registered at runtime and can be removed individually or cleared wholesale.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/pipeline
```

## Usage

```typescript
import { Pipeline } from '@studnicky/pipeline';
import type { PipelineFnType } from '@studnicky/pipeline';

interface OrderCtx {
  items: string[];
  total: number;
  discount: number;
}

// Construct via create() or builder()
const pipeline = Pipeline.create<OrderCtx>();
// equivalent: Pipeline.builder<OrderCtx>().build()

// Add stages — each receives the previous stage's output
pipeline.add((ctx) => ({ ...ctx, total: ctx.items.length * 10 }));
pipeline.add((ctx) => ({ ...ctx, discount: ctx.total > 20 ? 5 : 0 }));
pipeline.add((ctx) => ({ ...ctx, total: ctx.total - ctx.discount }));

const result = await pipeline.run({ items: ['a', 'b', 'c'], total: 0, discount: 0 });
// result.total === 25 (3 items × 10 = 30, discount 5, total 25)

// add() returns a removal function
const remove: () => void = pipeline.add((ctx) => ({ ...ctx, total: ctx.total * 2 }));
remove(); // stage is no longer registered

// Remove all stages
pipeline.clear();
```

## Extending

Subclass `Pipeline<T>` to intercept execution at any fire point. All four protected hooks have pass-through defaults — override only what you need. `onRunStart` runs once before stage 0, `beforeStage` and `afterStage` wrap each individual stage, and `onRunComplete` runs after all stages and determines the final resolved value.

```typescript
import { Pipeline } from '@studnicky/pipeline';

interface AuditCtx {
  userId: string;
  action: string;
  timestamp?: number;
}

class AuditPipeline extends Pipeline<AuditCtx> {
  protected override onRunStart(ctx: AuditCtx): AuditCtx {
    return { ...ctx, timestamp: Date.now() };
  }

  protected override onRunComplete(ctx: AuditCtx): AuditCtx {
    console.log(`[audit] ${ctx.action} by ${ctx.userId} at ${ctx.timestamp}`);
    return ctx;
  }
}

const pipeline = AuditPipeline.create();
pipeline.add(async (ctx) => {
  // stage logic
  return ctx;
});

const result = await pipeline.run({ userId: 'u1', action: 'login' });
// result.timestamp is set; audit log emitted after all stages
```

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/pipeline

## License

MIT
