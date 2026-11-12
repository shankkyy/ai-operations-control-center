import type { Pool } from "pg";
import { signToken, hashPassword, type Role } from "../src/services/authService.js";

const TABLES = [
  "conversation_messages",
  "conversations",
  "workflow_steps",
  "workflow_runs",
  "audit_logs",
  "alerts",
  "operational_metrics",
  "document_chunks",
  "documents",
  "users",
];

export async function truncateAll(pool: Pool): Promise<void> {
  await pool.query(`TRUNCATE ${TABLES.join(", ")} RESTART IDENTITY CASCADE`);
}

export async function createTestUser(pool: Pool, role: Role, email = `${role}-${Date.now()}@test.local`) {
  const passwordHash = await hashPassword("password123");
  const { rows } = await pool.query(
    "INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id",
    [email, passwordHash, role]
  );
  const token = signToken({ sub: rows[0].id, email, role });
  return { id: rows[0].id as string, email, token };
}

export async function closeConnections(): Promise<void> {
  const { pool } = await import("../src/services/db.js");
  const { redis } = await import("../src/services/redis.js");
  const { workflowQueue } = await import("../src/queues/workflowQueue.js");
  await workflowQueue.close();
  await pool.end();
  if (redis.status !== "end") {
    await redis.quit().catch(() => {});
  }
}
