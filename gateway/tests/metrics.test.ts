import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { pool } from "../src/services/db.js";
import { closeConnections, createTestUser, truncateAll } from "./testHelpers.js";

const app = createApp();

beforeEach(() => truncateAll(pool));
afterAll(closeConnections);

describe("GET /api/v1/metrics", () => {
  it("groups points by metric name", async () => {
    const viewer = await createTestUser(pool, "viewer");
    await pool.query(
      "INSERT INTO operational_metrics (metric_name, value) VALUES ('cpu_usage_pct', 50), ('cpu_usage_pct', 55), ('queue_depth', 10)"
    );

    const res = await request(app).get("/api/v1/metrics").set("Authorization", `Bearer ${viewer.token}`);
    expect(res.status).toBe(200);
    const names = res.body.series.map((s: { metric_name: string }) => s.metric_name).sort();
    expect(names).toEqual(["cpu_usage_pct", "queue_depth"]);
    const cpu = res.body.series.find((s: { metric_name: string }) => s.metric_name === "cpu_usage_pct");
    expect(cpu.points).toHaveLength(2);
  });

  it("requires auth", async () => {
    const res = await request(app).get("/api/v1/metrics");
    expect(res.status).toBe(401);
  });
});
