import { env } from "../config/env.js";

const BASE = env.AI_SERVICE_URL;

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const resp = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`AI service ${path} failed (${resp.status}): ${text}`);
  }
  return resp.json() as Promise<T>;
}

export interface IngestResponse {
  document_id: string;
  chunks_created: number;
  status: string;
  error: string | null;
}

export function ingestDocument(documentId: string, title: string, content: string, metadata: Record<string, unknown>) {
  return postJson<IngestResponse>("/ingest", { document_id: documentId, title, content, metadata });
}

export async function ragQueryStream(question: string, topK: number | undefined, filters: Record<string, unknown>) {
  const resp = await fetch(`${BASE}/rag/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, top_k: topK, filters }),
  });
  if (!resp.ok || !resp.body) {
    throw new Error(`AI service /rag/query failed (${resp.status})`);
  }
  return resp.body;
}

export interface Anomaly {
  metric_name: string;
  value: number;
  z_score: number;
  severity: string;
  recorded_at: string;
}

export function anomalyScan(metricName: string | undefined, window: number, zThreshold: number) {
  return postJson<{ anomalies: Anomaly[]; scanned_metrics: number }>("/anomalies/scan", {
    metric_name: metricName,
    window,
    z_threshold: zThreshold,
  });
}

export function executeWorkflowStep(workflowType: string, stepName: string, context: Record<string, unknown>) {
  return postJson<{ output: Record<string, unknown>; summary: string }>("/workflows/execute-step", {
    workflow_type: workflowType,
    step_name: stepName,
    context,
  });
}

export function runEval() {
  return postJson<{ metrics: Record<string, number>; provider: string }>("/eval/run", {});
}

export async function aiServiceHealthy(): Promise<boolean> {
  try {
    const resp = await fetch(`${BASE}/health`);
    return resp.ok;
  } catch {
    return false;
  }
}
