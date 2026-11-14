import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveDailySlots } from '../src/pipeline.js';

test('default daily plan is morning + evening only', () => {
  assert.deepEqual(resolveDailySlots(undefined).map((s) => s.slot), ['morning', 'evening']);
  assert.deepEqual(resolveDailySlots('').map((s) => s.slot), ['morning', 'evening']);
});

test('slot list is ordered, trimmed, case-insensitive and keeps durations', () => {
  const plan = resolveDailySlots(' Evening , afternoon,morning ');
  assert.deepEqual(plan, [
    { slot: 'morning', durationSeconds: 40 },
    { slot: 'afternoon', durationSeconds: 40 },
    { slot: 'evening', durationSeconds: 60 },
  ]);
});

test('unknown slot names fail loudly instead of silently skipping uploads', () => {
  assert.throws(() => resolveDailySlots('morning,night'), /unknown slot/);
});
