import { startWorkflowWorker } from "./workflowWorker.js";

const worker = startWorkflowWorker();

worker.on("completed", (job) => console.log(JSON.stringify({ event: "job.completed", jobId: job.id })));
worker.on("failed", (job, err) => console.error(JSON.stringify({ event: "job.failed", jobId: job?.id, error: err.message })));

process.on("SIGTERM", async () => {
  await worker.close();
  process.exit(0);
});
