import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { pool } from "../src/services/db.js";
import { closeConnections, createTestUser, truncateAll } from "./testHelpers.js";

const app = createApp();

beforeEach(() => truncateAll(pool));
afterAll(closeConnections);

describe("GET /api/v1/audit-logs", () => {
  it("paginates audit log entries", async () => {
    const viewer = await createTestUser(pool, "viewer");
    for (let i = 0; i < 5; i++) {
      await pool.query("INSERT INTO audit_logs (action, resource_type) VALUES ($1, 'test')", [`action-${i}`]);
    }

    const page1 = await request(app)
      .get("/api/v1/audit-logs?page=1&pageSize=2")
      .set("Authorization", `Bearer ${viewer.token}`);
    expect(page1.body.logs).toHaveLength(2);
    expect(page1.body.total).toBe(5);

    const page3 = await request(app)
      .get("/api/v1/audit-logs?page=3&pageSize=2")
      .set("Authorization", `Bearer ${viewer.token}`);
    expect(page3.body.logs).toHaveLength(1);
  });

  it("requires auth", async () => {
    const res = await request(app).get("/api/v1/audit-logs");
    expect(res.status).toBe(401);
  });
});
