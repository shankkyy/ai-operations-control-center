import type { Request, Response } from "express";
import { workflowQueue } from "../queues/workflowQueue.js";

export async function listJobs(_req: Request, res: Response): Promise<void> {
  const [jobs, counts] = await Promise.all([
    workflowQueue.getJobs(["waiting", "active", "completed", "failed"], 0, 100),
    workflowQueue.getJobCounts("waiting", "active", "completed", "failed"),
  ]);

  const serialized = await Promise.all(
    jobs.map(async (job) => ({
      id: job.id,
      name: job.name,
      data: job.data,
      state: await job.getState(),
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason,
      timestamp: job.timestamp,
    }))
  );

  res.json({ jobs: serialized, counts });
}
