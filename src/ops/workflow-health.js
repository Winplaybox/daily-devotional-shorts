export const WORKFLOW_EXPECTATIONS = [
  {
    file: 'daily-shorts-publisher.yml',
    label: 'Daily Shorts Publisher',
    maxAgeMinutes: 30 * 60,
  },
  {
    file: 'youtube-analytics.yml',
    label: 'YouTube Analytics Report',
    maxAgeMinutes: 30 * 60,
  },
  {
    file: 'youtube-comment-intake.yml',
    label: 'YouTube Comment Intake',
    maxAgeMinutes: 45,
  },
];

function timestamp(value) {
  const parsed = Date.parse(value ?? '');
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Evaluate only scheduled runs from the default branch. Manual dispatches and
 * workflow_run fan-out jobs must not make a missed cron appear healthy.
 */
export function evaluateWorkflowHealth({ expectation, runs, now = new Date() }) {
  if (!expectation || !Array.isArray(runs) || !(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new TypeError('expectation, runs and a valid now Date are required.');
  }

  const scheduledRuns = runs
    .filter((run) => run?.event === 'schedule' && run?.head_branch === 'main')
    .sort((left, right) => (timestamp(right.created_at) ?? -Infinity) - (timestamp(left.created_at) ?? -Infinity));

  const latest = scheduledRuns[0];
  if (!latest) {
    return {
      workflow: expectation.label,
      file: expectation.file,
      state: 'missing',
      ageMinutes: null,
      runId: null,
      message: 'No scheduled run from main was found in the returned history.',
    };
  }

  const createdAt = timestamp(latest.created_at);
  if (createdAt === null) {
    return {
      workflow: expectation.label,
      file: expectation.file,
      state: 'invalid',
      ageMinutes: null,
      runId: latest.id ?? null,
      message: 'The latest scheduled run has an invalid created_at timestamp.',
    };
  }

  const ageMinutes = Math.max(0, Math.floor((now.getTime() - createdAt) / 60_000));
  const base = {
    workflow: expectation.label,
    file: expectation.file,
    runId: latest.id ?? null,
    createdAt: latest.created_at,
    ageMinutes,
    conclusion: latest.conclusion ?? null,
  };

  if (latest.status === 'completed' && latest.conclusion !== 'success') {
    return { ...base, state: 'failed', message: `Latest scheduled run concluded ${latest.conclusion ?? 'without a conclusion'}.` };
  }

  if (ageMinutes > expectation.maxAgeMinutes) {
    return {
      ...base,
      state: 'stale',
      message: `Latest scheduled run is ${ageMinutes} minutes old; threshold is ${expectation.maxAgeMinutes} minutes.`,
    };
  }

  if (latest.status !== 'completed') {
    return { ...base, state: 'running', message: `Latest scheduled run is currently ${latest.status ?? 'not completed'}.` };
  }

  return { ...base, state: 'healthy', message: 'Latest scheduled run from main completed successfully within the expected window.' };
}
