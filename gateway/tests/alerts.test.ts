import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { pool } from "../src/services/db.js";
import { closeConnections, createTestUser, truncateAll } from "./testHelpers.js";

const app = createApp();

beforeEach(() => truncateAll(pool));
afterAll(closeConnections);

describe("alerts", () => {
  it("lists and filters by status", async () => {
    const viewer = await createTestUser(pool, "viewer");
    await pool.query("INSERT INTO alerts (title, severity, status) VALUES ('a', 'low', 'open'), ('b', 'high', 'resolved')");

    const all = await request(app).get("/api/v1/alerts").set("Authorization", `Bearer ${viewer.token}`);
    expect(all.body.alerts).toHaveLength(2);

    const open = await request(app)
      .get("/api/v1/alerts?status=open")
      .set("Authorization", `Bearer ${viewer.token}`);
    expect(open.body.alerts).toHaveLength(1);
    expect(open.body.alerts[0].title).toBe("a");
  });

  it("forbids a viewer from patching an alert", async () => {
    const viewer = await createTestUser(pool, "viewer");
    const inserted = await pool.query(
      "INSERT INTO alerts (title, severity, status) VALUES ('a', 'low', 'open') RETURNING id"
    );
    const res = await request(app)
      .patch(`/api/v1/alerts/${inserted.rows[0].id}`)
      .set("Authorization", `Bearer ${viewer.token}`)
      .send({ status: "resolved" });
    expect(res.status).toBe(403);
  });

  it("lets an operator update alert status and logs the audit trail", async () => {
    const operator = await createTestUser(pool, "operator");
    const inserted = await pool.query(
      "INSERT INTO alerts (title, severity, status) VALUES ('a', 'low', 'open') RETURNING id"
    );
    const res = await request(app)
      .patch(`/api/v1/alerts/${inserted.rows[0].id}`)
      .set("Authorization", `Bearer ${operator.token}`)
      .send({ status: "resolved" });
    expect(res.status).toBe(200);
    expect(res.body.alert.status).toBe("resolved");

    const audit = await pool.query("SELECT * FROM audit_logs WHERE action = 'alert.status_changed'");
    expect(audit.rows).toHaveLength(1);
  });

  it("404s for an unknown alert", async () => {
    const operator = await createTestUser(pool, "operator");
    const res = await request(app)
      .patch("/api/v1/alerts/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${operator.token}`)
      .send({ status: "resolved" });
    expect(res.status).toBe(404);
  });

  it("rejects an invalid status value", async () => {
    const operator = await createTestUser(pool, "operator");
    const inserted = await pool.query(
      "INSERT INTO alerts (title, severity, status) VALUES ('a', 'low', 'open') RETURNING id"
    );
    const res = await request(app)
      .patch(`/api/v1/alerts/${inserted.rows[0].id}`)
      .set("Authorization", `Bearer ${operator.token}`)
      .send({ status: "not-a-real-status" });
    expect(res.status).toBe(400);
  });
});
