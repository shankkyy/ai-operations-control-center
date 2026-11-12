import type { Request, Response } from "express";
import { pool } from "../services/db.js";
import { workflowQueue } from "../queues/workflowQueue.js";
import { anomalyScan } from "../services/aiServiceClient.js";

export async function getSummary(_req: Request, res: Response): Promise<void> {
  const [eventsCount, recentAlerts, jobCounts, anomalies] = await Promise.all([
    pool.query("SELECT count(*)::int AS count FROM operational_metrics"),
    pool.query(
      "SELECT id, title, severity, status, created_at FROM alerts ORDER BY created_at DESC LIMIT 10"
    ),
    workflowQueue.getJobCounts("active", "completed", "failed", "waiting"),
    anomalyScan(undefined, 50, 2.5).catch(() => ({ anomalies: [], scanned_metrics: 0 })),
  ]);

  const completed = jobCounts.completed ?? 0;
  const failed = jobCounts.failed ?? 0;
  const total = completed + failed;

  res.json({
    totalOperationalEvents: eventsCount.rows[0].count,
    activeJobs: jobCounts.active ?? 0,
    failedJobs: failed,
    waitingJobs: jobCounts.waiting ?? 0,
    jobSuccessRate: total > 0 ? Number((completed / total).toFixed(3)) : 1,
    anomalyCount: anomalies.anomalies.length,
    recentIncidents: anomalies.anomalies.slice(0, 5),
    recentAlerts: recentAlerts.rows,
    systemHealth: "ok",
  });
}
