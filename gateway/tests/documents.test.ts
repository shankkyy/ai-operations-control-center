import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { pool } from "../src/services/db.js";
import { closeConnections, createTestUser, truncateAll } from "./testHelpers.js";

const app = createApp();

beforeEach(() => truncateAll(pool));
afterAll(closeConnections);

describe("documents", () => {
  it("rejects upload without auth", async () => {
    const res = await request(app).post("/api/v1/documents").attach("file", Buffer.from("hello"), "a.txt");
    expect(res.status).toBe(401);
  });

  it("rejects upload from a viewer (read-only role)", async () => {
    const viewer = await createTestUser(pool, "viewer");
    const res = await request(app)
      .post("/api/v1/documents")
      .set("Authorization", `Bearer ${viewer.token}`)
      .field("title", "Doc")
      .attach("file", Buffer.from("hello world"), "a.txt");
    expect(res.status).toBe(403);
  });

  it("uploads, ingests via the ai service, and lists the document", async () => {
    const operator = await createTestUser(pool, "operator");
    const upload = await request(app)
      .post("/api/v1/documents")
      .set("Authorization", `Bearer ${operator.token}`)
      .field("title", "Runbook")
      .attach("file", Buffer.from("payment gateway runbook content"), "runbook.txt");

    expect(upload.status).toBe(201);
    expect(upload.body.document.status).toBe("ready");
    expect(upload.body.chunksCreated).toBeGreaterThan(0);

    const list = await request(app).get("/api/v1/documents").set("Authorization", `Bearer ${operator.token}`);
    expect(list.status).toBe(200);
    expect(list.body.documents).toHaveLength(1);

    const detail = await request(app)
      .get(`/api/v1/documents/${upload.body.document.id}`)
      .set("Authorization", `Bearer ${operator.token}`);
    expect(detail.status).toBe(200);
    expect(detail.body.document.title).toBe("Runbook");
  });

  it("dedupes identical content on re-upload", async () => {
    const operator = await createTestUser(pool, "operator");
    const content = Buffer.from("duplicate content for dedup test");

    const first = await request(app)
      .post("/api/v1/documents")
      .set("Authorization", `Bearer ${operator.token}`)
      .field("title", "First")
      .attach("file", content, "a.txt");
    const second = await request(app)
      .post("/api/v1/documents")
      .set("Authorization", `Bearer ${operator.token}`)
      .field("title", "Second")
      .attach("file", content, "b.txt");

    expect(second.status).toBe(200);
    expect(second.body.deduped).toBe(true);
    expect(second.body.document.id).toBe(first.body.document.id);
  });

  it("404s for an unknown document id", async () => {
    const operator = await createTestUser(pool, "operator");
    const res = await request(app)
      .get("/api/v1/documents/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${operator.token}`);
    expect(res.status).toBe(404);
  });
});
