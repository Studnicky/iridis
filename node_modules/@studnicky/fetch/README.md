# @studnicky/fetch

> Professional HTTP client with timeout, interceptors, and configured clients for Node.js

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/fetch)

`@studnicky/fetch` wraps the native `fetch` API with a configured client, fluent request builder, and composable interceptor pipeline. Every observable behavior — telemetry, logging, tracing — is added by subclassing, not by configuring flags.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/fetch
```

## Usage

```typescript
import { FetchClient } from '@studnicky/fetch';

const api = FetchClient.create({
  baseURL: 'https://api.example.com',
  headers: { Authorization: 'Bearer token' },
  timeout: 5000
});

// Fluent request builder
const response = await api
  .request('/users')
  .queryString('page', 1)
  .queryString('limit', 20)
  .header('X-Request-Source', 'dashboard')
  .get();

const users = await response.json();
```

## Extending

`FetchClient` provides three protected hook points that subclasses override to add telemetry. The base class hooks are no-ops — all observability is supplied by the subclass:

```typescript
import { FetchClient } from '@studnicky/fetch';

class TracedClient extends FetchClient {
  protected override onRequestStart(method: string, path: string, requestId: string, url: string): void {
    console.log(`[${requestId}] ${method} ${url}`);
  }

  protected override onResponseSuccess(method: string, requestId: string, statusCode: number, durationMs: number): void {
    console.log(`[${requestId}] ${statusCode} in ${durationMs}ms`);
  }

  protected override onRequestError(error: unknown, method: string, requestId: string, url: string, durationMs: number): void {
    console.error(`[${requestId}] ${method} ${url} failed after ${durationMs}ms`, error);
  }
}

const api = new TracedClient({ baseURL: 'https://api.example.com' });
```

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/fetch

## License

MIT
