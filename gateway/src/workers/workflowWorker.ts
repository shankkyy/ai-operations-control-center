import { Worker, type Job } from "bullmq";
import { redis } from "../services/redis.js";
import { pool } from "../services/db.js";
import { runWorkflowSteps } from "../services/workflowService.js";
import { WORKFLOW_QUEUE_NAME } from "../queues/workflowQueue.js";

export function startWorkflowWorker(): Worker {
  return new Worker(
    WORKFLOW_QUEUE_NAME,
    async (job: Job) => {
      const { runId } = job.data as { runId: string };
      await runWorkflowSteps(pool, runId, job);
    },
    { connection: redis, concurrency: 5 }
  );
}
