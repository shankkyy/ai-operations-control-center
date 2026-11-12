import type { Pool } from "pg";

export async function recordAudit(
  pool: Pool,
  actor: string | null,
  action: string,
  resourceType: string,
  resourceId: string | null,
  details: Record<string, unknown> = {}
): Promise<void> {
  await pool.query(
    `INSERT INTO audit_logs (actor, action, resource_type, resource_id, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [actor, action, resourceType, resourceId, JSON.stringify(details)]
  );
}
