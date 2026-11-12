import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { pool } from "../src/services/db.js";
import { hashPassword } from "../src/services/authService.js";
import { closeConnections, truncateAll } from "./testHelpers.js";

const app = createApp();

beforeEach(() => truncateAll(pool));
afterAll(closeConnections);

describe("POST /api/v1/auth/login", () => {
  it("returns a token for correct credentials", async () => {
    const passwordHash = await hashPassword("correct-password");
    await pool.query("INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'admin')", [
      "admin@test.local",
      passwordHash,
    ]);

    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "admin@test.local", password: "correct-password" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTypeOf("string");
    expect(res.body.user).toMatchObject({ email: "admin@test.local", role: "admin" });
  });

  it("rejects an unknown email", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({ email: "nope@test.local", password: "x" });
    expect(res.status).toBe(401);
  });

  it("rejects a wrong password", async () => {
    const passwordHash = await hashPassword("correct-password");
    await pool.query("INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'viewer')", [
      "viewer@test.local",
      passwordHash,
    ]);
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "viewer@test.local", password: "wrong" });
    expect(res.status).toBe(401);
  });

  it("rejects malformed input", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({ email: "not-an-email" });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/auth/me", () => {
  it("requires a bearer token", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
  });

  it("rejects a garbage token", async () => {
    const res = await request(app).get("/api/v1/auth/me").set("Authorization", "Bearer not-a-real-token");
    expect(res.status).toBe(401);
  });
});
