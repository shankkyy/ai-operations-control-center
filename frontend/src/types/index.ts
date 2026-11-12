export type Role = "admin" | "operator" | "viewer";

export interface User {
  sub: string;
  email: string;
  role: Role;
}

export interface Document {
  id: string;
  title: string;
  status: "pending" | "ready" | "failed";
  error?: string | null;
  created_at: string;
}

export interface Alert {
  id: string;
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "acknowledged" | "resolved";
  source: string;
  created_at: string;
}

export interface Anomaly {
  metric_name: string;
  value: number;
  z_score: number;
  severity: string;
  recorded_at: string;
}

export interface WorkflowStep {
  id: string;
  step_index: number;
  name: string;
  status: string;
  tool_name: string;
  requires_approval: boolean;
  approved_by: string | null;
  output: Record<string, unknown> | null;
  error: string | null;
}

export interface WorkflowRun {
  id: string;
  workflow_type: string;
  status: string;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  current_step: number;
  max_steps: number;
  created_at: string;
  updated_at: string;
}

export interface JobSummary {
  id: string;
  name: string;
  state: string;
  attemptsMade: number;
  failedReason: string | null;
  timestamp: number;
  data: { runId: string };
}

export interface AuditLog {
  id: string;
  actor: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

export interface SourceRef {
  document_id: string;
  chunk_id: string;
  title: string;
  similarity: number;
  excerpt: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: SourceRef[];
}

export interface DashboardSummary {
  totalOperationalEvents: number;
  activeJobs: number;
  failedJobs: number;
  waitingJobs: number;
  jobSuccessRate: number;
  anomalyCount: number;
  recentIncidents: Anomaly[];
  recentAlerts: Alert[];
  systemHealth: string;
}
