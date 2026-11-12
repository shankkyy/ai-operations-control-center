import { afterAll, describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import request from "supertest";
import { createApp } from "../src/app.js";
import { closeConnections } from "./testHelpers.js";

const app = createApp();
afterAll(closeConnections);

describe("auth middleware", () => {
  it("rejects an expired token", async () => {
    const expired = jwt.sign(
      { sub: "u1", email: "a@b.com", role: "admin", exp: Math.floor(Date.now() / 1000) - 60 },
      process.env.JWT_SECRET!
    );
    const res = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${expired}`);
    expect(res.status).toBe(401);
  });

  it("rejects a token signed with the wrong secret", async () => {
    const forged = jwt.sign({ sub: "u1", email: "a@b.com", role: "admin" }, "wrong-secret");
    const res = await request(app).get("/api/v1/auth/me").set("Authorization", `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });

  it("rejects a missing Authorization header format", async () => {
    const res = await request(app).get("/api/v1/auth/me").set("Authorization", "not-bearer-format");
    expect(res.status).toBe(401);
  });
});

describe("unknown routes", () => {
  it("404s", async () => {
    const res = await request(app).get("/api/v1/does-not-exist");
    expect(res.status).toBe(404);
  });
});
