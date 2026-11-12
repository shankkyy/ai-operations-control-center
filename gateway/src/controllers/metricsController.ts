import type { Request, Response } from "express";
import { pool } from "../services/db.js";

export async function listMetricSeries(_req: Request, res: Response): Promise<void> {
  const names = await pool.query("SELECT DISTINCT metric_name FROM operational_metrics ORDER BY metric_name");
  const series = await Promise.all(
    names.rows.map(async (row) => {
      const points = await pool.query(
        "SELECT value, recorded_at FROM operational_metrics WHERE metric_name = $1 ORDER BY recorded_at ASC LIMIT 200",
        [row.metric_name]
      );
      return { metric_name: row.metric_name, points: points.rows };
    })
  );
  res.json({ series });
}
