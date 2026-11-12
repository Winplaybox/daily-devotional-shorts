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
  {
    file: 'workflow-health-monitor.yml',
    label: 'Workflow Schedule Health Monitor',
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


/**
 * Check the Actions workflow metadata state separately from scheduled-run
 * freshness. A disabled workflow can otherwise look like a scheduler outage.
 */
/**
 * Fetch workflow enablement metadata without allowing transient network or
 * response errors to abort the entire monitor. Callers treat errors as unknown.
 */
export async function fetchWorkflowMetadata({
  apiBase,
  repository,
  workflowFile,
  token,
  fetchImpl = fetch,
}) {
  try {
    if (![apiBase, repository, workflowFile, token].every((value) => typeof value === 'string' && value.trim())) {
      throw new TypeError('apiBase, repository, workflowFile and token are required.');
    }

    const url = new URL(
      `${apiBase.replace(/\\/+$/, '')}/repos/${repository}/actions/workflows/${encodeURIComponent(workflowFile)}`,
    );
    const response = await fetchImpl(url, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!response.ok) {
      const body = await response.text();
      return {
        error: `GitHub Actions workflow metadata API returned ${response.status}: ${body.slice(0, 300)}`,
      };
    }

    return { workflow: await response.json() };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { error: `GitHub Actions workflow metadata request failed: ${message}` };
  }
}

export function evaluateWorkflowRegistration({ expectation, workflow, error = null }) {
  if (!expectation || (workflow != null && typeof workflow !== 'object') || (error !== null && typeof error !== 'string')) {
    throw new TypeError('expectation, workflow metadata and an optional error are required.');
  }

  const base = {
    workflow: expectation.label,
    file: expectation.file,
  };

  if (error) {
    return {
      ...base,
      state: 'unknown',
      workflowState: null,
      message: `Unable to retrieve workflow enablement state: ${error}`,
    };
  }

  const state = workflow?.state;
  if (state === 'active') {
    return {
      ...base,
      state: 'active',
      workflowState: state,
      message: 'Workflow is enabled in GitHub Actions.',
    };
  }

  if (state === 'disabled_manually' || state === 'disabled_inactivity') {
    return {
      ...base,
      state: 'disabled',
      workflowState: state,
      message: `Workflow is disabled (${state}). Re-enable it in repository Actions settings after owner review.`,
    };
  }

  return {
    ...base,
    state: 'unknown',
    workflowState: typeof state === 'string' ? state : null,
    message: typeof state === 'string'
      ? `GitHub returned an unrecognized workflow state: ${state}.`
      : 'GitHub workflow metadata did not include a state.',
  };
}
