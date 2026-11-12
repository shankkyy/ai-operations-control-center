import type { Pool } from "pg";
import type { Job } from "bullmq";
import { executeWorkflowStep } from "./aiServiceClient.js";
import { recordAudit } from "./auditService.js";
import { WORKFLOW_DEFINITIONS } from "./workflowDefinitions.js";

interface RunRow {
  id: string;
  workflow_type: string;
  status: string;
  input: Record<string, unknown>;
  current_step: number;
  max_steps: number;
  created_by: string | null;
}

async function getRun(pool: Pool, runId: string): Promise<RunRow | null> {
  const { rows } = await pool.query("SELECT * FROM workflow_runs WHERE id = $1", [runId]);
  return rows[0] ?? null;
}

async function priorStepOutputs(pool: Pool, runId: string): Promise<Record<string, unknown>> {
  const { rows } = await pool.query(
    "SELECT name, output FROM workflow_steps WHERE run_id = $1 AND status = 'completed' ORDER BY step_index",
    [runId]
  );
  const acc: Record<string, unknown> = {};
  for (const row of rows) acc[row.name] = row.output;
  return acc;
}

export async function runWorkflowSteps(pool: Pool, runId: string, job?: Job): Promise<void> {
  const run = await getRun(pool, runId);
  if (!run) throw new Error(`workflow run ${runId} not found`);
  if (run.status === "completed" || run.status === "failed") return;

  const definitions = WORKFLOW_DEFINITIONS[run.workflow_type];
  if (!definitions) throw new Error(`unknown workflow_type ${run.workflow_type}`);

  await pool.query("UPDATE workflow_runs SET status = 'running', updated_at = now() WHERE id = $1", [runId]);

  let context = { ...run.input, ...(await priorStepOutputs(pool, runId)) };

  for (let i = run.current_step; i < definitions.length; i++) {
    if (i >= run.max_steps) {
      await pool.query("UPDATE workflow_runs SET status = 'failed', updated_at = now() WHERE id = $1", [runId]);
      await recordAudit(pool, run.created_by, "workflow.max_steps_exceeded", "workflow_run", runId);
      return;
    }

    const step = definitions[i];
    const existing = await pool.query(
      "SELECT * FROM workflow_steps WHERE run_id = $1 AND step_index = $2",
      [runId, i]
    );

    if (step.requiresApproval && existing.rows[0]?.approved_by == null) {
      if (existing.rows.length === 0) {
        await pool.query(
          `INSERT INTO workflow_steps (run_id, step_index, name, status, tool_name, requires_approval, input)
           VALUES ($1, $2, $3, 'awaiting_approval', $4, true, $5)`,
          [runId, i, step.name, step.kind, JSON.stringify(context)]
        );
      }
      await pool.query("UPDATE workflow_runs SET status = 'awaiting_approval', updated_at = now() WHERE id = $1", [runId]);
      await recordAudit(pool, run.created_by, "workflow.step_awaiting_approval", "workflow_step", `${runId}:${i}`);
      return;
    }

    try {
      const output = step.kind === "apply" ? await applyStep(context) : (await executeWorkflowStep(run.workflow_type, step.name, context)).output;

      if (existing.rows.length === 0) {
        await pool.query(
          `INSERT INTO workflow_steps (run_id, step_index, name, status, tool_name, requires_approval, approved_by, input, output)
           VALUES ($1, $2, $3, 'completed', $4, $5, $6, $7, $8)`,
          [runId, i, step.name, step.kind, step.requiresApproval, existing.rows[0]?.approved_by ?? null, JSON.stringify(context), JSON.stringify(output)]
        );
      } else {
        await pool.query(
          "UPDATE workflow_steps SET status = 'completed', output = $2 WHERE id = $1",
          [existing.rows[0].id, JSON.stringify(output)]
        );
      }

      context = { ...context, [step.name]: output };
      await pool.query("UPDATE workflow_runs SET current_step = $2, updated_at = now() WHERE id = $1", [runId, i + 1]);
      await recordAudit(pool, run.created_by, "workflow.step_completed", "workflow_step", `${runId}:${i}`, { step: step.name });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await pool.query(
        `UPDATE workflow_steps SET status = 'failed', error = $2
         WHERE run_id = $1 AND step_index = $3`,
        [runId, message, i]
      );

      const attemptsMade = job?.attemptsMade ?? 0;
      const maxAttempts = job?.opts.attempts ?? 1;
      if (attemptsMade + 1 >= maxAttempts) {
        await pool.query("UPDATE workflow_runs SET status = 'failed', updated_at = now() WHERE id = $1", [runId]);
        await recordAudit(pool, run.created_by, "workflow.failed", "workflow_run", runId, { error: message });
      }
      throw err;
    }
  }

  await pool.query(
    "UPDATE workflow_runs SET status = 'completed', output = $2, updated_at = now() WHERE id = $1",
    [runId, JSON.stringify(context)]
  );
  await recordAudit(pool, run.created_by, "workflow.completed", "workflow_run", runId);
}

async function applyStep(context: Record<string, unknown>): Promise<Record<string, unknown>> {
  return { applied: true, action_taken: context.suggest ?? null };
}
