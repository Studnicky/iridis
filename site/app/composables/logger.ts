import { ConsoleTransport, Logger } from '@studnicky/logger';

/** Shared site-wide logger — no raw console.* calls in app code, ever. */
export const logger = Logger.create({
  'level':      'debug',
  'metadata':   { 'service': 'iridis-site' },
  'transports': [ConsoleTransport.create()]
});
