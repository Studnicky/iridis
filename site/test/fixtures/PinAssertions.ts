import { Metadata } from '@studnicky/iridis';
import assert from 'node:assert/strict';

import type { PinRun } from './PinRun.ts';

const RATIO_TOLERANCE = 1e-6;

/** Survey invariants over a PinRun: exact pins, no false pass, compliant implies every ratio meets target, blocked implies a reported reason. */
export class PinAssertions {
  public static pinsExact(run: PinRun): void {
    const provenance = Metadata.roleProvenance(run.state.metadata);
    const roleNames = Array.from(run.request.pins.keys());
    for (let index = 0; index < roleNames.length; index += 1) {
      const role = roleNames[index] ?? '';
      assert.equal(run.state.roles[role]?.hex, run.request.pins.get(role), `${role} keeps its exact pinned hex`);
      assert.equal(provenance.get(role)?.origin, 'stated', `${role} is recorded as stated`);
    }
  }

  public static compliant(run: PinRun): void {
    assert.equal(run.report.compliant, true);
    assert.equal(run.report.cvdCompliant, true);
    assert.deepEqual(run.report.blockedPairs, []);
    assert.equal(run.report.pairs.length > 0, true);
    for (let index = 0; index < run.report.pairs.length; index += 1) {
      const pair = run.report.pairs[index];
      if (pair !== undefined) {
        const label = `${pair.foreground}/${pair.background}`;
        const measured = run.measure(pair.foreground, pair.background);
        assert.equal(pair.passed, true, `${label} passes`);
        assert.equal(measured + RATIO_TOLERANCE >= pair.requiredTrichromat, true, `${label} measures ${measured.toFixed(2)} against ${pair.requiredTrichromat.toFixed(2)}`);
      }
    }
  }

  public static blocked(run: PinRun): void {
    assert.equal(run.report.compliant, false);
    assert.equal(run.report.blockedPairs.length > 0, true);
    for (let index = 0; index < run.report.blockedPairs.length; index += 1) {
      assert.equal((run.report.blockedPairs[index]?.reason ?? '').length > 0, true);
    }
  }

  public static blockedWith(run: PinRun, foreground: string, background: string, reason: string): void {
    const match = run.report.blockedPairs.some((pair) => {
      const matches = pair.foreground === foreground && pair.background === background && pair.reason === reason;
      return matches;
    });
    assert.equal(match, true, `${foreground}/${background} is blocked as ${reason}`);
  }

  public static noFalsePass(run: PinRun): void {
    for (let index = 0; index < run.report.pairs.length; index += 1) {
      const pair = run.report.pairs[index];
      if (pair?.passed === true) {
        const measured = run.measure(pair.foreground, pair.background);
        assert.equal(measured + RATIO_TOLERANCE >= pair.requiredTrichromat, true, `${pair.foreground}/${pair.background} is reported passed at ${measured.toFixed(2)} against ${pair.requiredTrichromat.toFixed(2)}`);
      }
    }
  }

  public static truthful(run: PinRun): void {
    PinAssertions.pinsExact(run);
    PinAssertions.noFalsePass(run);
    if (run.report.compliant) {
      PinAssertions.compliant(run);
    }
    if (!run.report.compliant) {
      PinAssertions.blocked(run);
    }
  }
}
