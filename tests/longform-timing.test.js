import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveWeekStart, resolveWeeklyPublishAt, computeSceneTiming } from '../src/longform/timing.js';

test('week start is the next Monday in IST, never today', () => {
  // Sat 14 Nov 2026 06:00 IST
  assert.equal(resolveWeekStart(new Date('2026-11-14T00:30:00Z')), '2026-11-16');
  // Mon 16 Nov 2026 10:00 IST -> following Monday
  assert.equal(resolveWeekStart(new Date('2026-11-16T04:30:00Z')), '2026-11-23');
  // Sun 15 Nov 23:30 UTC is already Mon 16 Nov 05:00 IST -> 23 Nov
  assert.equal(resolveWeekStart(new Date('2026-11-15T23:30:00Z')), '2026-11-23');
});

test('week start override must be a real Monday', () => {
  assert.equal(resolveWeekStart(new Date(), '2026-11-16'), '2026-11-16');
  assert.throws(() => resolveWeekStart(new Date(), '2026-11-17'), /Monday/);
  assert.throws(() => resolveWeekStart(new Date(), '2026-02-30'), /real date/);
});

test('publish is Sunday 18:00 IST before the week, or +60min when already late', () => {
  const normal = resolveWeeklyPublishAt('2026-11-16', new Date('2026-11-14T00:30:00Z'));
  assert.equal(normal.toISOString(), '2026-11-15T12:30:00.000Z');
  const late = new Date('2026-11-15T12:10:00Z');
  assert.equal(resolveWeeklyPublishAt('2026-11-16', late).getTime(), late.getTime() + 3_600_000);
  assert.equal(resolveWeeklyPublishAt('2026-11-16', late, '2026-11-15T14:00:00Z').toISOString(), '2026-11-15T14:00:00.000Z');
});

test('scene timing is cumulative, gap-aware and frame-exact', () => {
  const t = computeSceneTiming([10, 20, 5], { gapSeconds: 0.5, tailSeconds: 1, fps: 30 });
  assert.deepEqual(t.startsSeconds, [0, 10.5, 31]);
  assert.equal(t.totalSeconds, 37);
  assert.equal(t.frames.reduce((a, b) => a + b, 0), t.totalFrames);
  assert.equal(t.totalFrames, 1110);
  assert.deepEqual(t.frames, [315, 615, 180]);
});
