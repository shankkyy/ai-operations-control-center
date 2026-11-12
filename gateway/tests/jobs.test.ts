import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { pool } from "../src/services/db.js";
import { workflowQueue } from "../src/queues/workflowQueue.js";
import { closeConnections, createTestUser, truncateAll } from "./testHelpers.js";

const app = createApp();

beforeEach(async () => {
  await truncateAll(pool);
  await workflowQueue.obliterate({ force: true });
});
afterAll(closeConnections);

describe("GET /api/v1/jobs", () => {
  it("lists queued workflow jobs", async () => {
    const operator = await createTestUser(pool, "operator");
    await request(app)
      .post("/api/v1/workflows/runs")
      .set("Authorization", `Bearer ${operator.token}`)
      .set("Idempotency-Key", "job-list-key")
      .send({ workflow_type: "alert_prioritization", input: { alerts: [] } });

    const res = await request(app).get("/api/v1/jobs").set("Authorization", `Bearer ${operator.token}`);
    expect(res.status).toBe(200);
    expect(res.body.jobs.length).toBeGreaterThan(0);
    expect(res.body.counts).toHaveProperty("waiting");
  });

  it("requires auth", async () => {
    const res = await request(app).get("/api/v1/jobs");
    expect(res.status).toBe(401);
  });
});
