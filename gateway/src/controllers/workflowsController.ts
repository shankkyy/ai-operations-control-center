import type { Request, Response } from "express";
import { pool } from "../services/db.js";
import { createWorkflowRunSchema } from "../validators/workflows.js";
import { enqueueWorkflowRun, enqueueWorkflowResume } from "../queues/workflowQueue.js";
import { recordAudit } from "../services/auditService.js";
import { HttpError } from "../middleware/errorHandler.js";

export async function createRun(req: Request, res: Response): Promise<void> {
  const idempotencyKey = req.header("Idempotency-Key");
  if (!idempotencyKey) throw new HttpError(400, "Idempotency-Key header is required");

  const { workflow_type, input, max_steps } = createWorkflowRunSchema.parse(req.body);

  const existing = await pool.query("SELECT * FROM workflow_runs WHERE idempotency_key = $1", [idempotencyKey]);
  if (existing.rows[0]) {
    res.status(200).json({ run: existing.rows[0], deduped: true });
    return;
  }

  const { rows } = await pool.query(
    `INSERT INTO workflow_runs (workflow_type, idempotency_key, input, max_steps, created_by)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [workflow_type, idempotencyKey, JSON.stringify(input), max_steps, req.user?.sub ?? null]
  );
  const run = rows[0];

  await enqueueWorkflowRun(run.id, idempotencyKey);
  await recordAudit(pool, req.user?.sub ?? null, "workflow.run_created", "workflow_run", run.id, { workflow_type });

  res.status(201).json({ run });
}

export async function listRuns(req: Request, res: Response): Promise<void> {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const { rows } = await pool.query(
    status
      ? "SELECT * FROM workflow_runs WHERE status = $1 ORDER BY created_at DESC LIMIT 100"
      : "SELECT * FROM workflow_runs ORDER BY created_at DESC LIMIT 100",
    status ? [status] : []
  );
  res.json({ runs: rows });
}

export async function getRun(req: Request, res: Response): Promise<void> {
  const run = await pool.query("SELECT * FROM workflow_runs WHERE id = $1", [req.params.id]);
  if (!run.rows[0]) throw new HttpError(404, "workflow run not found");
  const steps = await pool.query("SELECT * FROM workflow_steps WHERE run_id = $1 ORDER BY step_index", [req.params.id]);
  res.json({ run: run.rows[0], steps: steps.rows });
}

export async function approveRun(req: Request, res: Response): Promise<void> {
  const run = await pool.query("SELECT * FROM workflow_runs WHERE id = $1", [req.params.id]);
  if (!run.rows[0]) throw new HttpError(404, "workflow run not found");
  if (run.rows[0].status !== "awaiting_approval") {
    throw new HttpError(409, `run is not awaiting approval (status: ${run.rows[0].status})`);
  }

  const pendingStep = await pool.query(
    "SELECT * FROM workflow_steps WHERE run_id = $1 AND status = 'awaiting_approval' ORDER BY step_index LIMIT 1",
    [req.params.id]
  );
  if (!pendingStep.rows[0]) throw new HttpError(409, "no pending step found to approve");

  await pool.query("UPDATE workflow_steps SET approved_by = $2 WHERE id = $1", [pendingStep.rows[0].id, req.user!.sub]);
  await recordAudit(pool, req.user!.sub, "workflow.step_approved", "workflow_step", pendingStep.rows[0].id);

  await enqueueWorkflowResume(req.params.id);
  res.json({ run: run.rows[0], approvedStep: pendingStep.rows[0].name });
}
