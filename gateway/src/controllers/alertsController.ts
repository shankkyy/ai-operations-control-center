import type { Request, Response } from "express";
import { pool } from "../services/db.js";
import { patchAlertSchema } from "../validators/alerts.js";
import { recordAudit } from "../services/auditService.js";
import { HttpError } from "../middleware/errorHandler.js";

export async function listAlerts(req: Request, res: Response): Promise<void> {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const { rows } = await pool.query(
    status
      ? "SELECT * FROM alerts WHERE status = $1 ORDER BY created_at DESC LIMIT 200"
      : "SELECT * FROM alerts ORDER BY created_at DESC LIMIT 200",
    status ? [status] : []
  );
  res.json({ alerts: rows });
}

export async function patchAlert(req: Request, res: Response): Promise<void> {
  const { status } = patchAlertSchema.parse(req.body);
  const { rows } = await pool.query("UPDATE alerts SET status = $2 WHERE id = $1 RETURNING *", [req.params.id, status]);
  if (!rows[0]) throw new HttpError(404, "alert not found");
  await recordAudit(pool, req.user?.sub ?? null, "alert.status_changed", "alert", req.params.id, { status });
  res.json({ alert: rows[0] });
}
