import { buildWeeklyEditorialPlan } from '../src/editorial/weekly-plan.js';

const weekStartDate = process.argv[2];
if (!weekStartDate) {
  console.error('Usage: npm run editorial:preview -- YYYY-MM-DD  # Monday in Asia/Kolkata');
  process.exit(2);
}

const plan = buildWeeklyEditorialPlan(weekStartDate);
process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
