import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { pool } from "../src/services/db.js";
import { closeConnections, createTestUser, truncateAll } from "./testHelpers.js";

const app = createApp();

beforeEach(() => truncateAll(pool));
afterAll(closeConnections);

describe("GET /api/v1/settings", () => {
  it("reports provider mode without leaking secrets", async () => {
    const viewer = await createTestUser(pool, "viewer");
    const res = await request(app).get("/api/v1/settings").set("Authorization", `Bearer ${viewer.token}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ llmProvider: "mock", embeddingProvider: "mock" });
    expect(res.body).not.toHaveProperty("openaiApiKey");
    expect(res.body).toHaveProperty("openaiKeyConfigured");
  });

  it("requires auth", async () => {
    const res = await request(app).get("/api/v1/settings");
    expect(res.status).toBe(401);
  });
});
