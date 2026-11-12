import { evaluateWorkflowHealth, evaluateWorkflowRegistration, fetchWorkflowMetadata, WORKFLOW_EXPECTATIONS } from '../src/ops/workflow-health.js';

const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const apiBase = (process.env.GITHUB_API_URL || 'https://api.github.com').replace(/\/$/, '');

if (!repository || !token) {
  throw new Error('GITHUB_REPOSITORY and GITHUB_TOKEN are required.');
}

async function fetchScheduledRuns(workflowFile) {
  const url = new URL(
    `${apiBase}/repos/${repository}/actions/workflows/${encodeURIComponent(workflowFile)}/runs`,
  );
  url.searchParams.set('branch', 'main');
  url.searchParams.set('event', 'schedule');
  url.searchParams.set('per_page', '20');

  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub Actions API returned ${response.status} for ${workflowFile}: ${body.slice(0, 500)}`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload.workflow_runs)) {
    throw new Error(`GitHub Actions API response for ${workflowFile} did not contain workflow_runs.`);
  }
  return payload.workflow_runs;
}

const now = new Date();
const results = [];

for (const expectation of WORKFLOW_EXPECTATIONS) {
  const [metadata, runs] = await Promise.all([
    fetchWorkflowMetadata({ apiBase, repository, workflowFile: expectation.file, token }),
    fetchScheduledRuns(expectation.file),
  ]);
  const registration = evaluateWorkflowRegistration({ expectation, ...metadata });
  const health = evaluateWorkflowHealth({ expectation, runs, now });
  results.push(registration.state === 'active'
    ? { ...health, workflowState: registration.workflowState }
    : {
        ...health,
        state: registration.state,
        workflowState: registration.workflowState,
        message: `${registration.message} Scheduled-run check: ${health.state}; ${health.message}`,
      });
}

for (const result of results) {
  const marker = ['healthy', 'running', 'pending'].includes(result.state) && result.workflowState === 'active' ? 'OK' : 'ALERT';
  console.log(`[${marker}] ${result.workflow}: ${result.state}; workflowState=${result.workflowState ?? 'unknown'}; run=${result.runId ?? 'none'}; ageMinutes=${result.ageMinutes ?? 'n/a'}; ${result.message}`);
}

const unhealthy = results.filter((result) => !['healthy', 'running', 'pending'].includes(result.state) || result.workflowState !== 'active');
if (unhealthy.length) {
  console.error(`Workflow schedule health check failed for ${unhealthy.length} workflow(s).`);
  process.exitCode = 1;
} else {
  console.log('All monitored scheduled workflows are within their configured freshness windows.');
}
