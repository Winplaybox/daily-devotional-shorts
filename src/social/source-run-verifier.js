import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const PUBLISHER_WORKFLOW_PATH = ".github/workflows/daily-shorts-publisher.yml";
const PUBLISHER_JOB_NAME = "render-and-publish";
const ALLOWED_SOURCE_EVENTS = new Set(["schedule", "workflow_dispatch"]);

export function validatePublisherRunMetadata(run, expectedRepository) {
  if (!run || typeof run !== "object") {
    throw new Error("Source GitHub Actions run metadata is missing.");
  }
  if (run.path !== PUBLISHER_WORKFLOW_PATH) {
    throw new Error("Source run is not the canonical Daily Shorts Publisher workflow.");
  }
  if (run.head_branch !== "main") {
    throw new Error("Source publisher run must come from the main branch.");
  }
  if (run.conclusion !== "success") {
    throw new Error("Source publisher run did not complete successfully.");
  }
  if (!ALLOWED_SOURCE_EVENTS.has(run.event)) {
    throw new Error("Source run must be a scheduled or manually dispatched publisher run.");
  }
  const actualRepository = run.repository?.full_name || run.head_repository?.full_name;
  if (expectedRepository) {
    if (typeof actualRepository !== "string" || actualRepository.trim().length === 0) {
      throw new Error("Source publisher run repository identity is missing.");
    }
    if (actualRepository.toLowerCase() !== expectedRepository.toLowerCase()) {
      throw new Error("Source publisher run belongs to a different repository.");
    }
  }
  if (!Number.isInteger(Number(run.run_number)) || Number(run.run_number) < 1) {
    throw new Error("Source publisher run has no valid run number.");
  }
  return true;
}

function collectVerifiedUploadTags(logText) {
  const log = String(logText || "");
  const tags = new Set();
  const patterns = [
    /\[UPLOAD VERIFIED\]\s+(pp365_job_(\d{8})_(morning|afternoon|evening)):\s+YouTube upload and schedule verified!/g,
    /\[IDEMPOTENCY\] Existing upload found for (pp365_job_(\d{8})_(morning|afternoon|evening)); skipping duplicate\./g,
  ];

  for (const pattern of patterns) {
    for (const match of log.matchAll(pattern)) tags.add(match[1]);
  }
  return [...tags];
}

export function countVerifiedUploadOutcomes(logText) {
  return collectVerifiedUploadTags(logText).length;
}

export function assertThreeVerifiedUploadOutcomes(logText) {
  const tags = collectVerifiedUploadTags(logText);
  const parsed = tags.map((tag) => /^pp365_job_(\d{8})_(morning|afternoon|evening)$/.exec(tag));
  const dates = new Set(parsed.map((match) => match[1]));
  const slots = new Set(parsed.map((match) => match[2]));
  const expectedSlots = ["morning", "afternoon", "evening"];
  const complete = tags.length === 3
    && dates.size === 1
    && expectedSlots.every((slot) => slots.has(slot));

  if (!complete) {
    throw new Error(
      "Expected one verified YouTube upload/read-back outcome for each morning, afternoon, and evening slot on one Panchang date; found " +
      tags.length + " distinct slot tags. Social distribution is blocked."
    );
  }
  return 3;
}

async function fetchJson(fetchImpl, url, headers) {
  const response = await fetchImpl(url, { headers });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error("GitHub API request failed (" + response.status + ") for " + url + ": " + detail.slice(0, 300));
  }
  return response.json();
}

function readRunLogsWithGh(repository, runId, token) {
  return execFileSync(
    "gh",
    ["run", "view", String(runId), "--repo", repository, "--log"],
    {
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024,
      env: { ...process.env, GH_TOKEN: token },
    },
  );
}

export async function verifyPublisherSourceRun({
  repository,
  runId,
  expectedRunNumber,
  token,
  fetchImpl = fetch,
  readLogs = readRunLogsWithGh,
}) {
  if (!repository || !/^[^/]+\/[^/]+$/.test(repository)) {
    throw new Error("GITHUB_REPOSITORY must be in owner/repository format.");
  }
  if (!/^\d+$/.test(String(runId || ""))) {
    throw new Error("SOURCE_RUN_ID must be a numeric GitHub Actions run ID.");
  }
  if (!token) throw new Error("A read-only GitHub Actions token is required.");

  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: "Bearer " + token,
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const apiRoot = "https://api.github.com/repos/" + repository;
  const run = await fetchJson(fetchImpl, apiRoot + "/actions/runs/" + runId, headers);
  validatePublisherRunMetadata(run, repository);

  if (expectedRunNumber && Number(expectedRunNumber) !== Number(run.run_number)) {
    throw new Error("SOURCE_RUN_NUMBER does not match the run ID; refusing to download a different artifact.");
  }

  const jobsResponse = await fetchJson(
    fetchImpl,
    apiRoot + "/actions/runs/" + runId + "/jobs?per_page=100",
    headers,
  );
  const publisherJob = (jobsResponse.jobs || []).find(
    (job) => job.name === PUBLISHER_JOB_NAME && job.conclusion === "success",
  );
  if (!publisherJob) {
    throw new Error("The source run has no successful render-and-publish job.");
  }

  const logText = await readLogs(repository, runId, token);
  const verifiedUploads = assertThreeVerifiedUploadOutcomes(logText);
  const result = {
    runId: String(runId),
    runNumber: Number(run.run_number),
    event: run.event,
    jobId: publisherJob.id,
    verifiedUploads,
  };

  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, "run_number=" + result.runNumber + "\n");
  }
  return result;
}

async function main() {
  const result = await verifyPublisherSourceRun({
    repository: process.env.GITHUB_REPOSITORY,
    runId: process.env.SOURCE_RUN_ID,
    expectedRunNumber: process.env.SOURCE_RUN_NUMBER,
    token: process.env.GH_TOKEN || process.env.GITHUB_TOKEN,
  });
  console.log(
    "[SOURCE] Verified publisher run #" + result.runNumber + ": all " + result.verifiedUploads +
    " YouTube upload/schedule outcomes were confirmed by platform read-back.",
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error("[SOURCE VERIFICATION] " + error.message);
    process.exitCode = 1;
  });
}
