import type { Request, Response } from "express";
import { pool } from "../services/db.js";

export async function listAuditLogs(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Number(req.query.pageSize) || 50);
  const offset = (page - 1) * pageSize;

  const [rows, count] = await Promise.all([
    pool.query(
      "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2",
      [pageSize, offset]
    ),
    pool.query("SELECT count(*)::int AS count FROM audit_logs"),
  ]);

  res.json({ logs: rows.rows, page, pageSize, total: count.rows[0].count });
}
