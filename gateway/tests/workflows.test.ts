import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { pool } from "../src/services/db.js";
import { runWorkflowSteps } from "../src/services/workflowService.js";
import { closeConnections, createTestUser, truncateAll } from "./testHelpers.js";

const app = createApp();

beforeEach(() => truncateAll(pool));
afterAll(closeConnections);

describe("POST /api/v1/workflows/runs", () => {
  it("requires an Idempotency-Key header", async () => {
    const operator = await createTestUser(pool, "operator");
    const res = await request(app)
      .post("/api/v1/workflows/runs")
      .set("Authorization", `Bearer ${operator.token}`)
      .send({ workflow_type: "alert_prioritization", input: { alerts: [] } });
    expect(res.status).toBe(400);
  });

  it("is idempotent on repeated Idempotency-Key", async () => {
    const operator = await createTestUser(pool, "operator");
    const body = { workflow_type: "alert_prioritization", input: { alerts: [] } };

    const first = await request(app)
      .post("/api/v1/workflows/runs")
      .set("Authorization", `Bearer ${operator.token}`)
      .set("Idempotency-Key", "key-1")
      .send(body);
    const second = await request(app)
      .post("/api/v1/workflows/runs")
      .set("Authorization", `Bearer ${operator.token}`)
      .set("Idempotency-Key", "key-1")
      .send(body);

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.deduped).toBe(true);
    expect(second.body.run.id).toBe(first.body.run.id);

    const count = await pool.query("SELECT count(*)::int AS c FROM workflow_runs");
    expect(count.rows[0].c).toBe(1);
  });

  it("forbids a viewer from creating a run", async () => {
    const viewer = await createTestUser(pool, "viewer");
    const res = await request(app)
      .post("/api/v1/workflows/runs")
      .set("Authorization", `Bearer ${viewer.token}`)
      .set("Idempotency-Key", "key-viewer")
      .send({ workflow_type: "alert_prioritization", input: {} });
    expect(res.status).toBe(403);
  });
});

describe("workflow execution", () => {
  it("runs a single-step workflow to completion", async () => {
    const operator = await createTestUser(pool, "operator");
    const create = await request(app)
      .post("/api/v1/workflows/runs")
      .set("Authorization", `Bearer ${operator.token}`)
      .set("Idempotency-Key", "run-complete")
      .send({ workflow_type: "alert_prioritization", input: { alerts: [{ title: "a", severity: "low" }] } });

    await runWorkflowSteps(pool, create.body.run.id);

    const detail = await request(app)
      .get(`/api/v1/workflows/runs/${create.body.run.id}`)
      .set("Authorization", `Bearer ${operator.token}`);
    expect(detail.body.run.status).toBe("completed");
    expect(detail.body.steps).toHaveLength(1);
    expect(detail.body.steps[0].status).toBe("completed");
  });

  it("pauses a remediation workflow for approval, then resumes once approved", async () => {
    const operator = await createTestUser(pool, "operator");
    const create = await request(app)
      .post("/api/v1/workflows/runs")
      .set("Authorization", `Bearer ${operator.token}`)
      .set("Idempotency-Key", "run-approval")
      .send({ workflow_type: "remediation_suggestion", input: { anomaly: { metric_name: "cpu_usage_pct" } } });
    const runId = create.body.run.id;

    await runWorkflowSteps(pool, runId);
    let detail = await request(app)
      .get(`/api/v1/workflows/runs/${runId}`)
      .set("Authorization", `Bearer ${operator.token}`);
    expect(detail.body.run.status).toBe("awaiting_approval");
    expect(detail.body.steps.find((s: { name: string }) => s.name === "suggest").status).toBe("completed");
    expect(detail.body.steps.find((s: { name: string }) => s.name === "apply").status).toBe("awaiting_approval");

    const approve = await request(app)
      .post(`/api/v1/workflows/runs/${runId}/approve`)
      .set("Authorization", `Bearer ${operator.token}`);
    expect(approve.status).toBe(200);

    await runWorkflowSteps(pool, runId);
    detail = await request(app)
      .get(`/api/v1/workflows/runs/${runId}`)
      .set("Authorization", `Bearer ${operator.token}`);
    expect(detail.body.run.status).toBe("completed");
    expect(detail.body.steps.find((s: { name: string }) => s.name === "apply").output.applied).toBe(true);
  });

  it("rejects approval when the run is not awaiting approval", async () => {
    const operator = await createTestUser(pool, "operator");
    const create = await request(app)
      .post("/api/v1/workflows/runs")
      .set("Authorization", `Bearer ${operator.token}`)
      .set("Idempotency-Key", "run-no-approval-needed")
      .send({ workflow_type: "alert_prioritization", input: { alerts: [] } });

    const res = await request(app)
      .post(`/api/v1/workflows/runs/${create.body.run.id}/approve`)
      .set("Authorization", `Bearer ${operator.token}`);
    expect(res.status).toBe(409);
  });

  it("fails the run once max_steps is exceeded", async () => {
    const operator = await createTestUser(pool, "operator");
    const create = await request(app)
      .post("/api/v1/workflows/runs")
      .set("Authorization", `Bearer ${operator.token}`)
      .set("Idempotency-Key", "run-max-steps")
      .send({ workflow_type: "remediation_suggestion", input: { anomaly: {} }, max_steps: 1 });

    await runWorkflowSteps(pool, create.body.run.id).catch(() => {});

    const detail = await request(app)
      .get(`/api/v1/workflows/runs/${create.body.run.id}`)
      .set("Authorization", `Bearer ${operator.token}`);
    expect(detail.body.run.status).toBe("failed");
  });
});
