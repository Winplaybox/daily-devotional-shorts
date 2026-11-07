export const WORKFLOW_EXPECTATIONS = [
  {
    file: 'daily-shorts-publisher.yml',
    label: 'Daily Shorts Publisher',
    dailyScheduleUtc: { hour: 0, minute: 30 },
    graceMinutes: 120,
  },
  {
    file: 'youtube-analytics.yml',
    label: 'YouTube Analytics Report',
    dailyScheduleUtc: { hour: 4, minute: 0 },
    graceMinutes: 120,
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

function latestDailyOccurrence(now, schedule) {
  const { hour, minute } = schedule ?? {};
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) {
    throw new TypeError('dailyScheduleUtc must contain a valid UTC hour and minute.');
  }

  const expected = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    hour,
    minute,
    0,
    0,
  ));
  if (expected.getTime() > now.getTime()) expected.setUTCDate(expected.getUTCDate() - 1);
  return expected;
}

/**
 * Evaluate only scheduled runs from the default branch. Manual dispatches and
 * workflow_run fan-out jobs must not make a missed cron appear healthy.
 *
 * Daily workflows are checked against their expected UTC cron time plus a
 * bounded grace window. High max-age thresholds alone hide late starts.
 */
export function evaluateWorkflowHealth({ expectation, runs, now = new Date() }) {
  if (!expectation || !Array.isArray(runs) || !(now instanceof Date) || !Number.isFinite(now.getTime())) {
    throw new TypeError('expectation, runs and a valid now Date are required.');
  }

  const scheduledRuns = runs
    .filter((run) => run?.event === 'schedule' && run?.head_branch === 'main')
    .sort((left, right) => (timestamp(right.created_at) ?? -Infinity) - (timestamp(left.created_at) ?? -Infinity));

  const latest = scheduledRuns[0];

  if (expectation.dailyScheduleUtc) {
    const expectedAt = latestDailyOccurrence(now, expectation.dailyScheduleUtc);
    const graceMinutes = Number(expectation.graceMinutes);
    if (!Number.isFinite(graceMinutes) || graceMinutes < 0) {
      throw new TypeError('Daily workflow graceMinutes must be a non-negative number.');
    }
    const graceEndsAt = expectedAt.getTime() + graceMinutes * 60_000;

    if (!latest) {
      const state = now.getTime() <= graceEndsAt ? 'pending' : 'missing';
      return {
        workflow: expectation.label,
        file: expectation.file,
        state,
        ageMinutes: null,
        runId: null,
        expectedAt: expectedAt.toISOString(),
        message: state === 'pending'
          ? 'The latest daily cron is within its grace window; waiting for GitHub Actions.'
          : 'No scheduled run from main was found after the latest expected daily cron and its grace window.',
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
        expectedAt: expectedAt.toISOString(),
        message: 'The latest scheduled run has an invalid created_at timestamp.',
      };
    }

    const ageMinutes = Math.max(0, Math.floor((now.getTime() - createdAt) / 60_000));
    const scheduleDelayMinutes = Math.floor((createdAt - expectedAt.getTime()) / 60_000);
    const base = {
      workflow: expectation.label,
      file: expectation.file,
      runId: latest.id ?? null,
      createdAt: latest.created_at,
      expectedAt: expectedAt.toISOString(),
      ageMinutes,
      scheduleDelayMinutes,
      conclusion: latest.conclusion ?? null,
    };

    if (createdAt < expectedAt.getTime()) {
      const state = now.getTime() <= graceEndsAt ? 'pending' : 'stale';
      return {
        ...base,
        state,
        message: state === 'pending'
          ? 'The latest daily cron is within its grace window; the previous scheduled run predates it.'
          : 'The latest expected daily cron was missed; the most recent scheduled run predates it.',
      };
    }

    if (latest.status === 'completed' && latest.conclusion !== 'success') {
      return { ...base, state: 'failed', message: `Latest scheduled run concluded ${latest.conclusion ?? 'without a conclusion'}.` };
    }

    if (scheduleDelayMinutes > graceMinutes) {
      return {
        ...base,
        state: 'late',
        message: `Latest daily run started ${scheduleDelayMinutes} minutes after its expected cron; grace is ${graceMinutes} minutes.`,
      };
    }

    if (latest.status !== 'completed') {
      return { ...base, state: 'running', message: `Latest scheduled run is currently ${latest.status ?? 'not completed'}.` };
    }

    return { ...base, state: 'healthy', message: 'Latest daily scheduled run started within its configured grace window and completed successfully.' };
  }

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
