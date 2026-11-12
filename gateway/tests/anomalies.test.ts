import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { pool } from "../src/services/db.js";
import { redis } from "../src/services/redis.js";
import { closeConnections, createTestUser, truncateAll } from "./testHelpers.js";

const app = createApp();

beforeEach(async () => {
  await truncateAll(pool);
  await redis.flushdb();
});
afterAll(closeConnections);

describe("GET /api/v1/anomalies", () => {
  it("returns anomalies from the ai service and caches the result", async () => {
    const viewer = await createTestUser(pool, "viewer");
    const res = await request(app).get("/api/v1/anomalies").set("Authorization", `Bearer ${viewer.token}`);

    expect(res.status).toBe(200);
    expect(res.body.anomalies).toHaveLength(1);

    const cached = await redis.get("anomalies:all");
    expect(cached).not.toBeNull();
    expect(JSON.parse(cached!)).toEqual(res.body);
  });

  it("requires auth", async () => {
    const res = await request(app).get("/api/v1/anomalies");
    expect(res.status).toBe(401);
  });
});
