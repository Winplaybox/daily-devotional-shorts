import test from 'node:test';
import assert from 'node:assert/strict';
import {
  APPROVED_WEEKLY_ALLOCATION,
  buildWeeklyEditorialPlan,
  validateWeeklyEditorialPlan,
} from '../src/editorial/weekly-plan.js';

test('builds exactly fourteen Shorts with the approved category allocation', () => {
  const plan = buildWeeklyEditorialPlan('2026-11-09');
  assert.equal(plan.plannedShorts, 14);
  assert.deepEqual(plan.allocation, APPROVED_WEEKLY_ALLOCATION);
  assert.equal(validateWeeklyEditorialPlan(plan), true);
  assert.equal(plan.publishingIntegration, 'disabled_preview_only');
});

test('places one daily Panchang and one secondary Short on each of seven dates', () => {
  const plan = buildWeeklyEditorialPlan('2026-11-09');
  const dates = [...new Set(plan.items.map((item) => item.date))];
  assert.equal(dates.length, 7);
  for (const date of dates) {
    const items = plan.items.filter((item) => item.date === date);
    assert.equal(items.length, 2);
    assert.equal(items.filter((item) => item.category === 'daily_panchang').length, 1);
    assert.equal(items.filter((item) => item.slot === 'secondary').length, 1);
  }
});

test('rotates weekday placement between weeks without changing weekly counts', () => {
  const first = buildWeeklyEditorialPlan('2026-11-09');
  const second = buildWeeklyEditorialPlan('2026-11-16');
  assert.deepEqual(first.allocation, second.allocation);
  const firstMondaySecondary = first.items.find((item) => item.date === '2026-11-09' && item.slot === 'secondary');
  const secondMondaySecondary = second.items.find((item) => item.date === '2026-11-16' && item.slot === 'secondary');
  assert.notEqual(firstMondaySecondary.category, secondMondaySecondary.category);
});

test('rejects invalid dates and non-Monday week starts', () => {
  assert.throws(() => buildWeeklyEditorialPlan('2026-02-30'), RangeError);
  assert.throws(() => buildWeeklyEditorialPlan('2026-11-10'), RangeError);
  assert.throws(() => buildWeeklyEditorialPlan('not-a-date'), TypeError);
});

test('rejects plans that drift from the approved allocation', () => {
  const plan = buildWeeklyEditorialPlan('2026-11-09');
  const changed = {
    ...plan,
    items: plan.items.map((item, index) => (
      index === 1 ? { ...item, category: 'quiz_mythology' } : item
    )),
  };
  assert.throws(() => validateWeeklyEditorialPlan(changed), /allocation mismatch/);
});
