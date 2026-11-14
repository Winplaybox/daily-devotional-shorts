export const APPROVED_WEEKLY_ALLOCATION = Object.freeze({
  daily_panchang: 7,
  muhurat_explainer: 2,
  vrat_festival: 2,
  panchang_knowledge: 2,
  quiz_mythology: 1,
});

const SECONDARY_CATEGORY_CYCLE = Object.freeze([
  'muhurat_explainer',
  'vrat_festival',
  'panchang_knowledge',
  'muhurat_explainer',
  'vrat_festival',
  'panchang_knowledge',
  'quiz_mythology',
]);

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const EPOCH_MONDAY_UTC = Date.UTC(1970, 0, 5);

function parseMonday(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new TypeError('weekStartDate must be an ISO date (YYYY-MM-DD).');
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new RangeError('weekStartDate is not a valid calendar date.');
  }
  if (parsed.getUTCDay() !== 1) {
    throw new RangeError('weekStartDate must be a Monday in the Asia/Kolkata editorial calendar.');
  }
  return parsed;
}

function dateString(value) {
  return value.toISOString().slice(0, 10);
}

function categoryCounts(items) {
  return Object.fromEntries(
    Object.keys(APPROVED_WEEKLY_ALLOCATION).map((category) => [
      category,
      items.filter((item) => item.category === category).length,
    ]),
  );
}

/**
 * Build a planning-only seven-day calendar from the approved 14-Shorts
 * allocation. This module does not publish, render or modify YouTube slots.
 *
 * The secondary-category sequence rotates by week so the same category is
 * not permanently tied to one weekday. Weekly category counts never change.
 */
export function buildWeeklyEditorialPlan(weekStartDate) {
  const monday = parseMonday(weekStartDate);
  const weekIndex = Math.floor((monday.getTime() - EPOCH_MONDAY_UTC) / WEEK_MS);
  const rotation = ((weekIndex % SECONDARY_CATEGORY_CYCLE.length) + SECONDARY_CATEGORY_CYCLE.length)
    % SECONDARY_CATEGORY_CYCLE.length;

  const items = [];
  for (let day = 0; day < 7; day += 1) {
    const date = dateString(new Date(monday.getTime() + day * DAY_MS));
    items.push({
      date,
      category: 'daily_panchang',
      slot: 'daily',
    });
    items.push({
      date,
      category: SECONDARY_CATEGORY_CYCLE[(day + rotation) % SECONDARY_CATEGORY_CYCLE.length],
      slot: 'secondary',
    });
  }

  // One weekly long-form guide (Saturday) built from the same verified 7-day
  // Panchang data. It carries the public watch-hour goal; Shorts carry reach.
  const saturday = dateString(new Date(monday.getTime() + 5 * DAY_MS));
  const plan = {
    longForm: {
      date: saturday,
      format: 'weekly_panchang_guide',
      targetMinutes: [5, 8],
      status: 'planned_not_automated',
    },
    timezone: 'Asia/Kolkata',
    weekStartDate: dateString(monday),
    weekEndDate: dateString(new Date(monday.getTime() + 6 * DAY_MS)),
    plannedShorts: items.length,
    allocation: categoryCounts(items),
    items,
    publishingIntegration: 'disabled_preview_only',
  };

  validateWeeklyEditorialPlan(plan);
  return plan;
}

export function validateWeeklyEditorialPlan(plan) {
  if (!plan || !Array.isArray(plan.items)) {
    throw new TypeError('A weekly editorial plan with an items array is required.');
  }
  if (plan.items.length !== 14) {
    throw new RangeError(`The approved weekly plan must contain exactly 14 Shorts; received ${plan.items.length}.`);
  }

  const actual = categoryCounts(plan.items);
  for (const [category, expected] of Object.entries(APPROVED_WEEKLY_ALLOCATION)) {
    if (actual[category] !== expected) {
      throw new RangeError(`Approved allocation mismatch for ${category}: expected ${expected}, received ${actual[category]}.`);
    }
  }

  const dates = [...new Set(plan.items.map((item) => item.date))];
  if (dates.length !== 7) {
    throw new RangeError(`The weekly plan must cover exactly seven dates; received ${dates.length}.`);
  }

  for (const date of dates) {
    const daily = plan.items.filter((item) => item.date === date);
    if (daily.length !== 2
      || daily.filter((item) => item.category === 'daily_panchang' && item.slot === 'daily').length !== 1
      || daily.filter((item) => item.slot === 'secondary').length !== 1) {
      throw new RangeError(`Each date must contain one daily Panchang and one secondary Short: ${date}.`);
    }
  }

  return true;
}
