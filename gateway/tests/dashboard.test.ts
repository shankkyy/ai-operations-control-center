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

describe("GET /api/v1/dashboard/summary", () => {
  it("aggregates real counts from postgres, bullmq, and the ai service", async () => {
    const viewer = await createTestUser(pool, "viewer");
    await pool.query("INSERT INTO operational_metrics (metric_name, value) VALUES ('cpu_usage_pct', 50)");
    await pool.query("INSERT INTO alerts (title, severity, status) VALUES ('a', 'high', 'open')");

    const res = await request(app).get("/api/v1/dashboard/summary").set("Authorization", `Bearer ${viewer.token}`);

    expect(res.status).toBe(200);
    expect(res.body.totalOperationalEvents).toBe(1);
    expect(res.body.recentAlerts).toHaveLength(1);
    expect(res.body.anomalyCount).toBe(1);
    expect(res.body).toHaveProperty("jobSuccessRate");
  });

  it("requires auth", async () => {
    const res = await request(app).get("/api/v1/dashboard/summary");
    expect(res.status).toBe(401);
  });
});
