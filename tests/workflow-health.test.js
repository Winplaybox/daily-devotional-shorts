import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluateWorkflowHealth, WORKFLOW_EXPECTATIONS } from '../src/ops/workflow-health.js';

const expectation = {
  file: 'youtube-comment-intake.yml',
  label: 'YouTube Comment Intake',
  maxAgeMinutes: 45,
};
const now = new Date('2026-11-07T07:30:00.000Z');

function run(overrides = {}) {
  return {
    id: 123,
    event: 'schedule',
    head_branch: 'main',
    status: 'completed',
    conclusion: 'success',
    created_at: '2026-11-07T07:00:00.000Z',
    ...overrides,
  };
}

test('configures a 45-minute freshness threshold for the 15-minute comment intake schedule', () => {
  const configured = WORKFLOW_EXPECTATIONS.find((item) => item.file === 'youtube-comment-intake.yml');
  assert.ok(configured);
  assert.equal(configured.maxAgeMinutes, 45);
});

test('marks a recent successful main-branch scheduled run healthy', () => {
  const result = evaluateWorkflowHealth({ expectation, runs: [run()], now });
  assert.equal(result.state, 'healthy');
  assert.equal(result.runId, 123);
  assert.equal(result.ageMinutes, 30);
});

test('ignores manual dispatches and workflow_run fan-out events', () => {
  const result = evaluateWorkflowHealth({
    expectation,
    runs: [
      run({ event: 'workflow_dispatch', id: 999, created_at: '2026-11-07T07:29:00.000Z' }),
      run({ event: 'workflow_run', id: 998, created_at: '2026-11-07T07:28:00.000Z' }),
    ],
    now,
  });
  assert.equal(result.state, 'missing');
  assert.equal(result.runId, null);
});

test('ignores scheduled runs from feature branches', () => {
  const result = evaluateWorkflowHealth({
    expectation,
    runs: [run({ head_branch: 'feat/monitor' })],
    now,
  });
  assert.equal(result.state, 'missing');
});

test('marks a missed scheduled run stale after its freshness threshold', () => {
  const result = evaluateWorkflowHealth({
    expectation,
    runs: [run({ created_at: '2026-11-07T06:44:00.000Z' })],
    now,
  });
  assert.equal(result.state, 'stale');
  assert.equal(result.ageMinutes, 46);
});

test('keeps a comment-intake run healthy at the 45-minute grace boundary', () => {
  const result = evaluateWorkflowHealth({
    expectation,
    runs: [run({ created_at: '2026-11-07T06:45:00.000Z' })],
    now,
  });
  assert.equal(result.state, 'healthy');
  assert.equal(result.ageMinutes, 45);
});

test('marks the latest failed scheduled run as failed even when an older run succeeded', () => {
  const result = evaluateWorkflowHealth({
    expectation,
    runs: [
      run({ id: 1, created_at: '2026-11-07T06:00:00.000Z' }),
      run({ id: 2, created_at: '2026-11-07T07:00:00.000Z', conclusion: 'failure' }),
    ],
    now,
  });
  assert.equal(result.state, 'failed');
  assert.equal(result.runId, 2);
});

test('reports a recent in-progress scheduled run without treating it as a failure', () => {
  const result = evaluateWorkflowHealth({
    expectation,
    runs: [run({ status: 'in_progress', conclusion: null })],
    now,
  });
  assert.equal(result.state, 'running');
});

test('rejects invalid evaluator inputs', () => {
  assert.throws(() => evaluateWorkflowHealth({ expectation, runs: [], now: 'not-a-date' }), TypeError);
  assert.throws(() => evaluateWorkflowHealth({ expectation, runs: null, now }), TypeError);
});

test('sorts by scheduled run creation time, not API response order', () => {
  const result = evaluateWorkflowHealth({
    expectation,
    runs: [
      run({ id: 1, created_at: '2026-11-07T06:00:00.000Z' }),
      run({ id: 2, created_at: '2026-11-07T07:00:00.000Z' }),
    ],
    now,
  });
  assert.equal(result.runId, 2);
});

const publisherExpectation = WORKFLOW_EXPECTATIONS.find((item) => item.file === 'daily-shorts-publisher.yml');
const dailyNow = new Date('2026-11-07T10:30:00.000Z');

test('configures the publisher expected UTC cron and a two-hour grace window', () => {
  assert.deepEqual(publisherExpectation.dailyScheduleUtc, { hour: 0, minute: 30 });
  assert.equal(publisherExpectation.graceMinutes, 120);
});

test('marks a daily publisher run late when it starts several hours after cron', () => {
  const result = evaluateWorkflowHealth({
    expectation: publisherExpectation,
    runs: [run({ created_at: '2026-11-07T06:18:00.000Z' })],
    now: dailyNow,
  });
  assert.equal(result.state, 'late');
  assert.equal(result.scheduleDelayMinutes, 348);
});

test('marks a daily workflow missing after the expected cron grace expires', () => {
  const result = evaluateWorkflowHealth({
    expectation: publisherExpectation,
    runs: [run({ created_at: '2026-11-06T00:30:00.000Z' })],
    now: dailyNow,
  });
  assert.equal(result.state, 'stale');
  assert.equal(result.expectedAt, '2026-11-07T00:30:00.000Z');
});

test('keeps a daily workflow pending while the expected cron is inside its grace window', () => {
  const result = evaluateWorkflowHealth({
    expectation: publisherExpectation,
    runs: [run({ created_at: '2026-11-06T00:30:00.000Z' })],
    now: new Date('2026-11-07T01:30:00.000Z'),
  });
  assert.equal(result.state, 'pending');
});

test('marks an on-time daily run healthy', () => {
  const result = evaluateWorkflowHealth({
    expectation: publisherExpectation,
    runs: [run({ created_at: '2026-11-07T00:35:00.000Z' })],
    now: dailyNow,
  });
  assert.equal(result.state, 'healthy');
  assert.equal(result.scheduleDelayMinutes, 5);
});

test('marks a daily analytics run missing when no scheduled run follows today\'s cron', () => {
  const analyticsExpectation = WORKFLOW_EXPECTATIONS.find((item) => item.file === 'youtube-analytics.yml');
  const result = evaluateWorkflowHealth({
    expectation: analyticsExpectation,
    runs: [run({ created_at: '2026-11-06T04:00:00.000Z' })],
    now: new Date('2026-11-07T10:30:00.000Z'),
  });
  assert.equal(result.state, 'stale');
  assert.equal(result.expectedAt, '2026-11-07T04:00:00.000Z');
});

test('runs the schedule monitor every 30 minutes so intake staleness is checked promptly', () => {
  const workflow = readFileSync(
    new URL('../.github/workflows/workflow-health-monitor.yml', import.meta.url),
    'utf8',
  );
  assert.match(workflow, /cron:\s*["']\*\/30 \* \* \* \*["']/);
});

test('keeps Make distribution gated by a successful publisher run or explicit manual confirmation', () => {
  const workflow = readFileSync(
    new URL('../.github/workflows/make-social-publisher.yml', import.meta.url),
    'utf8',
  );
  const verifier = readFileSync(
    new URL('../src/social/source-run-verifier.js', import.meta.url),
    'utf8',
  );

  assert.match(workflow, /github\.event_name == 'workflow_run' && github\.event\.workflow_run\.conclusion == 'success'/);
  assert.match(workflow, /github\.event_name == 'workflow_dispatch' && inputs\.publish == true/);
  assert.doesNotMatch(workflow, /^  dispatch:\r?\n    if:\s*false\b/m);

  const verificationStep = workflow.indexOf('node src/social/source-run-verifier.js');
  const dispatchStep = workflow.indexOf('node scripts/publish_make_social.js');
  assert.notEqual(verificationStep, -1);
  assert.notEqual(dispatchStep, -1);
  assert.ok(verificationStep < dispatchStep, 'source upload read-back must precede Make distribution');
  assert.match(verifier, /assertThreeVerifiedUploadOutcomes\(logText\)/);
});

test('keeps Meta publishing hard-disabled until a separately approved change', () => {
  const workflow = readFileSync(
    new URL('../.github/workflows/meta-social-publisher.yml', import.meta.url),
    'utf8',
  );
  assert.match(workflow, /^  publish:\r?\n    if:\s*false\b/m);
});
