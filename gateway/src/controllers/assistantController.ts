import type { Request, Response } from "express";
import { Readable } from "node:stream";
import { pool } from "../services/db.js";
import { ragQueryStream } from "../services/aiServiceClient.js";
import { askSchema } from "../validators/assistant.js";

export async function ask(req: Request, res: Response): Promise<void> {
  const { question, conversation_id, top_k, filters } = askSchema.parse(req.body);

  let conversationId = conversation_id;
  if (!conversationId) {
    const { rows } = await pool.query(
      "INSERT INTO conversations (user_id, title) VALUES ($1, $2) RETURNING id",
      [req.user?.sub ?? null, question.slice(0, 80)]
    );
    conversationId = rows[0].id;
  }
  await pool.query(
    "INSERT INTO conversation_messages (conversation_id, role, content) VALUES ($1, 'user', $2)",
    [conversationId, question]
  );

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  res.write(`data: ${JSON.stringify({ type: "conversation", conversation_id: conversationId })}\n\n`);

  const webStream = await ragQueryStream(question, top_k, filters);
  const nodeStream = Readable.fromWeb(webStream as never);
  const decoder = new TextDecoder();
  let buffer = "";
  let finalPayload: { answer: string; sources: unknown[] } | null = null;

  for await (const chunk of nodeStream) {
    buffer += decoder.decode(chunk as Buffer, { stream: true });
    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      if (block.startsWith("data: ")) {
        res.write(block + "\n\n");
        const payload = JSON.parse(block.slice("data: ".length));
        if (payload.type === "done") {
          finalPayload = { answer: payload.answer, sources: payload.sources };
        }
      }
      boundary = buffer.indexOf("\n\n");
    }
  }

  if (finalPayload) {
    await pool.query(
      "INSERT INTO conversation_messages (conversation_id, role, content, sources) VALUES ($1, 'assistant', $2, $3)",
      [conversationId, finalPayload.answer, JSON.stringify(finalPayload.sources)]
    );
  }
  res.end();
}

export async function getConversation(req: Request, res: Response): Promise<void> {
  const { rows } = await pool.query(
    "SELECT role, content, sources, created_at FROM conversation_messages WHERE conversation_id = $1 ORDER BY created_at",
    [req.params.id]
  );
  res.json({ messages: rows });
}
