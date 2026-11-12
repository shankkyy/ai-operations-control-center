import { pool } from "../services/db.js";
import { env } from "../config/env.js";
import { hashPassword } from "../services/authService.js";

const DEMO_USERS = [
  { email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD, role: "admin" },
  { email: "operator@aocc.local", password: "Operator123!", role: "operator" },
  { email: "viewer@aocc.local", password: "Viewer123!", role: "viewer" },
] as const;

const DEMO_DOCUMENTS = [
  {
    title: "Payment Gateway Outage Runbook",
    content:
      "When the payment gateway returns elevated 503 errors, first check the upstream processor status page. " +
      "Restart the gateway pods if error rate exceeds 5 percent for more than 3 minutes. Escalate to the " +
      "payments on-call engineer if the restart does not resolve the issue.",
  },
  {
    title: "Database Connection Pool Exhaustion",
    content:
      "Connection pool exhaustion on the primary Postgres instance is usually caused by long-running queries " +
      "holding connections open. Check pg_stat_activity for queries running longer than 60 seconds and " +
      "terminate them if they are not part of a scheduled batch job.",
  },
  {
    title: "Nightly Batch Job Failure Procedure",
    content:
      "If the nightly reconciliation batch job fails, check the job logs for a stack trace. Most failures are " +
      "caused by malformed upstream feed files. Re-run the job with --skip-malformed after quarantining the " +
      "bad records.",
  },
];

const DEMO_ALERTS = [
  { title: "Payment gateway error rate above threshold", severity: "critical", status: "open", source: "monitoring" },
  { title: "API latency p95 elevated", severity: "high", status: "acknowledged", source: "monitoring" },
  { title: "Nightly batch job completed with warnings", severity: "medium", status: "resolved", source: "batch" },
  { title: "Disk usage on worker-3 above 80%", severity: "low", status: "open", source: "infra" },
];

const METRIC_SERIES: { name: string; baseline: number; spread: number; spikeAt?: number }[] = [
  { name: "cpu_usage_pct", baseline: 45, spread: 5, spikeAt: 92 },
  { name: "api_latency_ms", baseline: 180, spread: 20, spikeAt: 1400 },
  { name: "error_rate_pct", baseline: 0.5, spread: 0.2 },
  { name: "queue_depth", baseline: 12, spread: 4, spikeAt: 95 },
];

async function seedUsers() {
  for (const user of DEMO_USERS) {
    const passwordHash = await hashPassword(user.password);
    await pool.query(
      `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING`,
      [user.email, passwordHash, user.role]
    );
  }
  console.log(`seeded ${DEMO_USERS.length} users`);
}

async function seedAlerts() {
  for (const alert of DEMO_ALERTS) {
    await pool.query(
      "INSERT INTO alerts (title, severity, status, source) VALUES ($1, $2, $3, $4)",
      [alert.title, alert.severity, alert.status, alert.source]
    );
  }
  console.log(`seeded ${DEMO_ALERTS.length} alerts`);
}

async function seedMetrics() {
  const now = Date.now();
  let total = 0;
  for (const series of METRIC_SERIES) {
    const points = 40;
    for (let i = points; i >= 1; i--) {
      const isLatest = i === 1;
      const value =
        isLatest && series.spikeAt !== undefined
          ? series.spikeAt
          : series.baseline + (Math.random() - 0.5) * series.spread;
      const recordedAt = new Date(now - i * 5 * 60_000);
      await pool.query(
        "INSERT INTO operational_metrics (metric_name, value, recorded_at) VALUES ($1, $2, $3)",
        [series.name, Number(value.toFixed(2)), recordedAt]
      );
      total++;
    }
  }
  console.log(`seeded ${total} metric points across ${METRIC_SERIES.length} series`);
}

async function seedDocuments() {
  for (const doc of DEMO_DOCUMENTS) {
    const contentHash = `seed-${doc.title}`;
    const existing = await pool.query("SELECT id FROM documents WHERE content_hash = $1", [contentHash]);
    if (existing.rows[0]) continue;

    const inserted = await pool.query(
      "INSERT INTO documents (title, content_hash, status) VALUES ($1, $2, 'pending') RETURNING id",
      [doc.title, contentHash]
    );
    const documentId = inserted.rows[0].id;

    const resp = await fetch(`${env.AI_SERVICE_URL}/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document_id: documentId, title: doc.title, content: doc.content, metadata: {} }),
    });
    if (!resp.ok) {
      console.error(`failed to ingest seed document "${doc.title}": ${resp.status}`);
      continue;
    }
    console.log(`ingested seed document "${doc.title}"`);
  }
}

async function main() {
  await seedUsers();
  await seedAlerts();
  await seedMetrics();
  await seedDocuments();
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
