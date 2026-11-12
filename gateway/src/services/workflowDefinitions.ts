export type StepKind = "ai" | "apply";

export interface StepDefinition {
  name: string;
  kind: StepKind;
  requiresApproval: boolean;
}

export const WORKFLOW_DEFINITIONS: Record<string, StepDefinition[]> = {
  incident_summary: [{ name: "summarize", kind: "ai", requiresApproval: false }],
  anomaly_investigation: [{ name: "analyze", kind: "ai", requiresApproval: false }],
  report_generation: [{ name: "compose_report", kind: "ai", requiresApproval: false }],
  alert_prioritization: [{ name: "rank", kind: "ai", requiresApproval: false }],
  remediation_suggestion: [
    { name: "suggest", kind: "ai", requiresApproval: false },
    // Consequential step: never runs without a role-checked human approval.
    { name: "apply", kind: "apply", requiresApproval: true },
  ],
};
