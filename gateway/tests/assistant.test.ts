import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { pool } from "../src/services/db.js";
import { closeConnections, createTestUser, truncateAll } from "./testHelpers.js";

const app = createApp();

beforeEach(() => truncateAll(pool));
afterAll(closeConnections);

function parseSse(body: string) {
  return body
    .split("\n\n")
    .filter((line) => line.startsWith("data: "))
    .map((line) => JSON.parse(line.slice("data: ".length)));
}

describe("POST /api/v1/assistant/ask", () => {
  it("streams a grounded answer and persists the conversation", async () => {
    const viewer = await createTestUser(pool, "viewer");
    const res = await request(app)
      .post("/api/v1/assistant/ask")
      .set("Authorization", `Bearer ${viewer.token}`)
      .send({ question: "what is the gateway error rate?" });

    expect(res.status).toBe(200);
    const events = parseSse(res.text);
    const convoEvent = events.find((e) => e.type === "conversation");
    const doneEvent = events.find((e) => e.type === "done");

    expect(convoEvent.conversation_id).toBeTypeOf("string");
    expect(doneEvent.insufficient_evidence).toBe(false);
    expect(doneEvent.sources.length).toBeGreaterThan(0);

    const history = await request(app)
      .get(`/api/v1/conversations/${convoEvent.conversation_id}`)
      .set("Authorization", `Bearer ${viewer.token}`);
    expect(history.body.messages.map((m: { role: string }) => m.role)).toEqual(["user", "assistant"]);
  });

  it("reports insufficient evidence for unanswerable questions", async () => {
    const viewer = await createTestUser(pool, "viewer");
    const res = await request(app)
      .post("/api/v1/assistant/ask")
      .set("Authorization", `Bearer ${viewer.token}`)
      .send({ question: "this is an unanswerable question" });

    const events = parseSse(res.text);
    const doneEvent = events.find((e) => e.type === "done");
    expect(doneEvent.insufficient_evidence).toBe(true);
    expect(doneEvent.sources).toEqual([]);
  });

  it("requires auth", async () => {
    const res = await request(app).post("/api/v1/assistant/ask").send({ question: "x" });
    expect(res.status).toBe(401);
  });
});
