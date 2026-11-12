import { z } from "zod";

export const WORKFLOW_TYPES = [
  "incident_summary",
  "anomaly_investigation",
  "report_generation",
  "alert_prioritization",
  "remediation_suggestion",
] as const;

export const createWorkflowRunSchema = z.object({
  workflow_type: z.enum(WORKFLOW_TYPES),
  input: z.record(z.string(), z.unknown()).default({}),
  max_steps: z.number().int().min(1).max(50).default(10),
});
