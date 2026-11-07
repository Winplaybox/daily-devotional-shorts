import test from 'node:test';
import assert from 'node:assert/strict';
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
