import { Queue } from "bullmq";
import { redis } from "../services/redis.js";

export const WORKFLOW_QUEUE_NAME = "workflow-runs";

export const workflowQueue = new Queue(WORKFLOW_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 100 },
  },
});

export function enqueueWorkflowRun(runId: string, idempotencyKey: string) {
  // jobId = idempotencyKey makes re-enqueuing the same run a no-op if already queued.
  return workflowQueue.add("run", { runId }, { jobId: idempotencyKey });
}

export function enqueueWorkflowResume(runId: string) {
  return workflowQueue.add("run", { runId }, { jobId: `${runId}:resume:${Date.now()}` });
}
