import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PinAssertions } from './fixtures/PinAssertions.ts';
import { PinDiagnostics } from './fixtures/PinDiagnostics.ts';
import { PinRequest } from './fixtures/PinRequest.ts';
import { PinRun } from './fixtures/PinRun.ts';

await test('R1 dark APCA with black and white seeds and no pins is compliant', (context) => {
  const run = PinRun.execute(PinRequest.dark(2, new Map()));
  PinDiagnostics.emit(context, 'R1', run);
  PinAssertions.pinsExact(run);
  PinAssertions.compliant(run);
});

await test('R2 dark APCA pinned surface #808080 keeps the pin and reports truthfully', (context) => {
  const run = PinRun.execute(PinRequest.dark(2, new Map([['surface', '#808080']])));
  PinDiagnostics.emit(context, 'R2', run);
  PinAssertions.truthful(run);
});

await test('R3 dark APCA pinned background #808080 keeps the pin and reports truthfully', (context) => {
  const run = PinRun.execute(PinRequest.dark(2, new Map([['background', '#808080']])));
  PinDiagnostics.emit(context, 'R3', run);
  PinAssertions.truthful(run);
});

await test('R4 dark APCA pinned background #808080 and text #909090 is blocked with both pins exact', (context) => {
  const run = PinRun.execute(PinRequest.dark(2, new Map([['background', '#808080'], ['text', '#909090']])));
  PinDiagnostics.emit(context, 'R4', run);
  PinAssertions.pinsExact(run);
  PinAssertions.noFalsePass(run);
  PinAssertions.blocked(run);
  PinAssertions.blockedWith(run, 'text', 'background', 'pin');
});

await test('R5 light APCA pinned text #f59e0b keeps the pin and reports truthfully', (context) => {
  const run = PinRun.execute(PinRequest.light(2, new Map([['text', '#f59e0b']])));
  PinDiagnostics.emit(context, 'R5', run);
  PinAssertions.truthful(run);
});

await test('R6 light WCAG AA pinned text #f59e0b keeps the exact pin and is blocked on the text pairs', (context) => {
  const run = PinRun.execute(PinRequest.light(0, new Map([['text', '#f59e0b']])));
  PinDiagnostics.emit(context, 'R6', run);
  PinAssertions.truthful(run);
  PinAssertions.blockedWith(run, 'text', 'background', 'range');
});

await test('R7 dark APCA pinned text and surface at #808080 is blocked with both pins exact', (context) => {
  const run = PinRun.execute(PinRequest.dark(2, new Map([['surface', '#808080'], ['text', '#808080']])));
  PinDiagnostics.emit(context, 'R7', run);
  PinAssertions.pinsExact(run);
  PinAssertions.noFalsePass(run);
  PinAssertions.blocked(run);
  PinAssertions.blockedWith(run, 'text', 'surface', 'pin');
});

await test('strict compliance withholds an impossible pin set and keeps the problem pairs', () => {
  const run = PinRun.execute(PinRequest.dark(2, new Map([['surface', '#808080'], ['text', '#808080']]), true));
  assert.equal(run.report.disposition, 'withheld');
  assert.equal(run.report.problemPairs.length > 0, true);
  assert.deepEqual(Object.keys(run.state.roles), []);
});

await test('without strict compliance the same pin set renders its roles and is not withheld', () => {
  const run = PinRun.execute(PinRequest.dark(2, new Map([['surface', '#808080'], ['text', '#808080']]), false));
  assert.equal(run.report.disposition === 'withheld', false);
  assert.equal(run.report.problemPairs.length > 0, true);
  assert.equal(Object.keys(run.state.roles).length > 0, true);
});
