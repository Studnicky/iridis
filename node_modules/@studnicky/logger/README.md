# @studnicky/logger

> Pluggable logging interface with transport architecture for Node.js

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/logger)

`@studnicky/logger` provides a typed `LoggerInterface` with a pluggable transport system and structured log builders. Every log entry is constructed via the `LogBody` or `LogFault` builder — required fields are enforced at build time. Correlation IDs flow from child loggers, not from the builders.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/logger
```

## Usage

```typescript
import { Logger, ConsoleTransport, LogBody, LogFault } from '@studnicky/logger';

const logger = Logger.create({
  level: 'info',
  metadata: { service: 'api' },
  transports: [new ConsoleTransport()]
});

// Structured info log
const body = LogBody.create()
  .component('users')
  .operation('create')
  .status('success')
  .message('User created')
  .context({ userId: 'u-123' })
  .duration(12)
  .build();

logger.info(body);

// Error log from a caught exception
try {
  throw new Error('Database timeout');
} catch (err) {
  const fault = LogFault.create()
    .component('users')
    .operation('create')
    .status('failed')
    .fromError(err as Error)
    .context({ userId: 'u-123' })
    .build();

  logger.error(fault);
}

// Child logger for correlation IDs
const requestLogger = logger.child({ requestId: 'req-abc', userId: 'u-123' });
requestLogger.info(body);
```

## Transport architecture

The `Logger` core emits `LogRecordType` records to each configured transport. A Logger with no transports is valid and silent.

```typescript
import {
  Logger,
  ConsoleTransport,
  MemoryTransport,
  FunctionTransport,
  NoOpTransport
} from '@studnicky/logger';

// Fan-out: console (warn+) and memory capture for tests
const memory = new MemoryTransport();
const logger = Logger.create({
  level: 'debug',
  transports: [
    new ConsoleTransport({ level: 'warn' }), // only warn and above
    memory                                    // all records at or above global floor
  ]
});

logger.info(body);  // reaches memory only
logger.warn(body);  // reaches both

// Assert captured records in tests
const records = memory.records();
records[0]?.level;    // LogLevel.WARN
records[0]?.metadata; // { service: 'api' }
records[0]?.data;     // LogBodyDataType
memory.clear();

// Bridge to an external logger via FunctionTransport
import pino from 'pino';
const pinoLogger = pino();
const bridged = Logger.create({
  transports: [new FunctionTransport((r) => pinoLogger.info(r.metadata, r.data.message))]
});

// Implement your own transport
import type { TransportInterface, LogRecordType } from '@studnicky/logger';
class RemoteTransport implements TransportInterface {
  write(record: LogRecordType): void {
    // send to remote sink
  }
}
```

## Per-transport level filtering

Each transport accepts an optional `level` option that adds an independent filter above the Logger global floor:

```typescript
const logger = Logger.create({
  level: 'debug',
  transports: [
    new ConsoleTransport({ level: 'debug' }), // debug and above
    new ConsoleTransport({ level: 'warn' }),   // warn and above only
  ]
});
```

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/logger

## License

MIT
