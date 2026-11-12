import crypto from "node:crypto";
import type { Request, Response } from "express";
import { pool } from "../services/db.js";
import { ingestDocument } from "../services/aiServiceClient.js";
import { recordAudit } from "../services/auditService.js";
import { uploadDocumentSchema } from "../validators/documents.js";
import { HttpError } from "../middleware/errorHandler.js";

export async function listDocuments(_req: Request, res: Response): Promise<void> {
  const { rows } = await pool.query(
    "SELECT id, title, status, error, created_at FROM documents ORDER BY created_at DESC LIMIT 200"
  );
  res.json({ documents: rows });
}

export async function getDocument(req: Request, res: Response): Promise<void> {
  const { rows } = await pool.query("SELECT * FROM documents WHERE id = $1", [req.params.id]);
  if (!rows[0]) throw new HttpError(404, "document not found");
  res.json({ document: rows[0] });
}

export async function uploadDocument(req: Request, res: Response): Promise<void> {
  if (!req.file) throw new HttpError(400, "file is required");

  let metadata: Record<string, unknown> = {};
  if (typeof req.body.metadata === "string" && req.body.metadata.length > 0) {
    try {
      metadata = JSON.parse(req.body.metadata);
    } catch {
      throw new HttpError(400, "metadata must be valid JSON");
    }
  }
  const { title } = uploadDocumentSchema.parse({ title: req.body.title, metadata });

  const content = req.file.buffer.toString("utf-8");
  const contentHash = crypto.createHash("sha256").update(content).digest("hex");

  const existing = await pool.query("SELECT id, status FROM documents WHERE content_hash = $1", [contentHash]);
  if (existing.rows[0]) {
    res.status(200).json({ document: existing.rows[0], deduped: true });
    return;
  }

  const inserted = await pool.query(
    "INSERT INTO documents (title, content_hash, uploaded_by) VALUES ($1, $2, $3) RETURNING id, title, status, created_at",
    [title, contentHash, req.user?.sub ?? null]
  );
  const document = inserted.rows[0];

  const ingestResult = await ingestDocument(document.id, title, content, metadata);
  await recordAudit(pool, req.user?.sub ?? null, "document.ingested", "document", document.id, {
    chunks_created: ingestResult.chunks_created,
    status: ingestResult.status,
  });

  res.status(201).json({ document: { ...document, status: ingestResult.status }, chunksCreated: ingestResult.chunks_created });
}
