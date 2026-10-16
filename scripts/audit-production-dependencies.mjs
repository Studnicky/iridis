import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const MAX_EXCEPTION_DAYS = 30;
const PAGE_PATH_PREFIX = 'site>';

function fail(message) {
  process.stderr.write(`audit: ${message}\n`);
  process.exitCode = 1;
}

function parseArguments(arguments_) {
  const options = {
    auditFile: undefined,
    exceptionsFile: undefined,
    now: new Date(),
  };

  for (let index = 0; index < arguments_.length; index += 2) {
    const flag = arguments_[index];
    const value = arguments_[index + 1];
    if (!value || !['--audit-file', '--exceptions-file', '--now'].includes(flag)) {
      throw new Error(`unsupported audit option: ${flag ?? ''}`);
    }
    if (flag === '--audit-file') options.auditFile = value;
    if (flag === '--exceptions-file') options.exceptionsFile = value;
    if (flag === '--now') options.now = new Date(value);
  }

  if (Number.isNaN(options.now.valueOf())) {
    throw new Error('audit time is invalid');
  }

  return options;
}

function readJson(filePath, description) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`cannot read ${description}: ${detail}`);
  }
}

function calendarDay(value) {
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

function validateExceptions(document, now) {
  if (!document || typeof document !== 'object' || !Array.isArray(document.exceptions)) {
    throw new Error('exceptions document must contain an exceptions array');
  }

  const allowedPaths = new Map();
  for (const exception of document.exceptions) {
    if (!exception || typeof exception !== 'object') {
      throw new Error('every audit exception must be an object');
    }
    const { advisoryId, createdAt, expiresAt, paths, reason } = exception;
    if (typeof advisoryId !== 'string' || typeof createdAt !== 'string' || typeof expiresAt !== 'string' || typeof reason !== 'string' || !Array.isArray(paths) || paths.length === 0 || paths.some((path) => typeof path !== 'string' || !path.startsWith(PAGE_PATH_PREFIX))) {
      throw new Error('every audit exception requires a Pages-only advisory ID, dates, paths, and reason');
    }
    if (allowedPaths.has(advisoryId)) {
      throw new Error(`duplicate audit exception: ${advisoryId}`);
    }

    const created = new Date(createdAt);
    const expires = new Date(expiresAt);
    if (Number.isNaN(created.valueOf()) || Number.isNaN(expires.valueOf()) || expires <= created) {
      throw new Error(`invalid audit exception dates: ${advisoryId}`);
    }
    const durationDays = (calendarDay(expires) - calendarDay(created)) / 86_400_000;
    if (durationDays > MAX_EXCEPTION_DAYS) {
      throw new Error(`audit exception exceeds ${MAX_EXCEPTION_DAYS} days: ${advisoryId}`);
    }
    if (now > expires) {
      throw new Error(`audit exception expired: ${advisoryId}`);
    }
    allowedPaths.set(advisoryId, new Set(paths));
  }

  return allowedPaths;
}

function productionAudit() {
  const result = spawnSync('pnpm', ['audit', '--prod', '--audit-level', 'high', '--json'], {
    encoding: 'utf8',
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(`pnpm audit failed with exit status ${result.status ?? 'unknown'}: ${result.stderr}`);
  }
  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`pnpm audit did not return JSON: ${detail}`);
  }
}

function verifyAudit(audit, allowedPaths) {
  if (!audit || typeof audit !== 'object' || !audit.advisories || typeof audit.advisories !== 'object') {
    throw new Error('audit output does not contain advisories');
  }

  const failures = [];
  for (const [advisoryId, advisory] of Object.entries(audit.advisories)) {
    if (!advisory || typeof advisory !== 'object') continue;
    const severity = advisory.severity;
    if (severity !== 'high' && severity !== 'critical') continue;
    const findings = Array.isArray(advisory.findings) ? advisory.findings : [];
    const allowed = allowedPaths.get(advisoryId);
    for (const finding of findings) {
      const paths = Array.isArray(finding?.paths) ? finding.paths : [];
      for (const path of paths) {
        if (severity === 'high' && allowed?.has(path)) continue;
        failures.push(`${severity} ${advisoryId} at ${path || 'unknown path'}`);
      }
    }
  }

  if (failures.length > 0) {
    throw new Error(`unapproved production audit findings:\n${failures.join('\n')}`);
  }
}

try {
  const options = parseArguments(process.argv.slice(2));
  const exceptionsFile = options.exceptionsFile ?? resolve('.github/security-audit-exceptions.json');
  const audit = options.auditFile ? readJson(options.auditFile, 'audit output') : productionAudit();
  const exceptions = readJson(exceptionsFile, 'audit exceptions');
  verifyAudit(audit, validateExceptions(exceptions, options.now));
  process.stdout.write('audit: production dependency findings comply with the exception policy\n');
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
