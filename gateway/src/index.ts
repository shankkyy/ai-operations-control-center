import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { startWorkflowWorker } from "./workers/workflowWorker.js";

const app = createApp();

app.listen(env.PORT, () => {
  console.log(JSON.stringify({ event: "gateway.started", port: env.PORT }));
});

if (env.RUN_WORKER_INLINE) {
  const worker = startWorkflowWorker();
  worker.on("completed", (job) => console.log(JSON.stringify({ event: "job.completed", jobId: job.id })));
  worker.on("failed", (job, err) => console.error(JSON.stringify({ event: "job.failed", jobId: job?.id, error: err.message })));
}
