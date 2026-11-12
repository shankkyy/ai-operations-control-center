import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { closeConnections } from "./testHelpers.js";

afterAll(closeConnections);

describe("GET /api/v1/health", () => {
  it("reports ok when postgres, redis, and the ai service are reachable", async () => {
    const app = createApp();
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "ok", postgres: true, redis: true, aiService: true });
  });
});
