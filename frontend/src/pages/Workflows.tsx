import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "../lib/api.js";
import { useApiData } from "../hooks/useApi.js";
import { useAuth } from "../lib/auth.js";
import { Badge } from "../components/Badge.js";
import { Loading, ErrorState, Empty } from "../components/StateViews.js";
import type { WorkflowRun, WorkflowStep } from "../types/index.js";

const WORKFLOW_TYPES = [
  { value: "incident_summary", example: '{"events": ["gateway returned 503s at 10:00", "restarted pods at 10:05"]}' },
  { value: "anomaly_investigation", example: '{"anomaly": {"metric_name": "cpu_usage_pct", "value": 92, "z_score": 6.1}}' },
  { value: "report_generation", example: '{"metrics": [], "alerts": []}' },
  { value: "alert_prioritization", example: '{"alerts": [{"title": "disk full", "severity": "high"}]}' },
  { value: "remediation_suggestion", example: '{"anomaly": {"metric_name": "cpu_usage_pct", "value": 92, "z_score": 6.1}}' },
];

export function Workflows() {
  const { user } = useAuth();
  const canRun = user?.role === "admin" || user?.role === "operator";

  const [workflowType, setWorkflowType] = useState(WORKFLOW_TYPES[0].value);
  const [input, setInput] = useState(WORKFLOW_TYPES[0].example);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const listFetcher = useCallback(() => api.get<{ runs: WorkflowRun[] }>("/workflows/runs"), []);
  const { data: listData, refetch: refetchList } = useApiData(listFetcher);

  useEffect(() => {
    const interval = setInterval(refetchList, 4000);
    return () => clearInterval(interval);
  }, [refetchList]);

  async function createRun() {
    setCreating(true);
    setCreateError(null);
    try {
      const parsedInput = JSON.parse(input);
      const run = await api.postIdempotent<{ run: WorkflowRun }>(
        "/workflows/runs",
        { workflow_type: workflowType, input: parsedInput },
        crypto.randomUUID()
      );
      setSelectedRunId(run.run.id);
      refetchList();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : "invalid input JSON or request failed");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-slate-900">Agentic Workflows</h1>

        {canRun && (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <div>
              <label htmlFor="workflow-type" className="mb-1 block text-xs font-medium text-slate-600">
                Workflow type
              </label>
              <select
                id="workflow-type"
                value={workflowType}
                onChange={(e) => {
                  setWorkflowType(e.target.value);
                  setInput(WORKFLOW_TYPES.find((w) => w.value === e.target.value)?.example ?? "{}");
                }}
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
              >
                {WORKFLOW_TYPES.map((w) => (
                  <option key={w.value} value={w.value}>
                    {w.value.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="workflow-input" className="mb-1 block text-xs font-medium text-slate-600">
                Input (JSON)
              </label>
              <textarea
                id="workflow-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-slate-300 px-3 py-1.5 font-mono text-xs"
              />
            </div>
            {createError && <p className="text-sm text-red-600">{createError}</p>}
            <button
              onClick={createRun}
              disabled={creating}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {creating ? "Starting..." : "Run workflow"}
            </button>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Execution history</h2>
          {!listData || listData.runs.length === 0 ? (
            <Empty message="No workflow runs yet." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {listData.runs.map((r) => (
                <li
                  key={r.id}
                  onClick={() => setSelectedRunId(r.id)}
                  className={`cursor-pointer py-2 text-sm hover:bg-slate-50 ${selectedRunId === r.id ? "bg-slate-50" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span>{r.workflow_type.replace(/_/g, " ")}</span>
                    <Badge value={r.status} />
                  </div>
                  <span className="text-xs text-slate-400">
                    step {r.current_step}/{r.max_steps} · {new Date(r.created_at).toLocaleTimeString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <RunDetail runId={selectedRunId} canApprove={canRun} onApproved={refetchList} />
    </div>
  );
}

function RunDetail({ runId, canApprove, onApproved }: { runId: string | null; canApprove: boolean; onApproved: () => void }) {
  const fetcher = useCallback(
    () => (runId ? api.get<{ run: WorkflowRun; steps: WorkflowStep[] }>(`/workflows/runs/${runId}`) : Promise.resolve(null)),
    [runId]
  );
  const { data, loading, error, refetch } = useApiData(fetcher, [runId]);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    if (!runId) return;
    const interval = setInterval(refetch, 3000);
    return () => clearInterval(interval);
  }, [runId, refetch]);

  async function approve() {
    if (!runId) return;
    setApproving(true);
    try {
      await api.post(`/workflows/runs/${runId}/approve`);
      refetch();
      onApproved();
    } finally {
      setApproving(false);
    }
  }

  if (!runId) return <Empty message="Select a run to see its details." />;
  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!data) return null;

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">Run {data.run.id.slice(0, 8)}</h2>
        <Badge value={data.run.status} />
      </div>

      {data.run.status === "awaiting_approval" && canApprove && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          This workflow has a step requiring human approval before it modifies anything.
          <button
            onClick={approve}
            disabled={approving}
            className="ml-3 rounded-md bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {approving ? "Approving..." : "Approve"}
          </button>
        </div>
      )}

      <ol className="space-y-2">
        {data.steps.map((s) => (
          <li key={s.id} className="rounded-md border border-slate-100 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">{s.name}</span>
              <Badge value={s.status} />
            </div>
            {s.output && (
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-slate-500">
                {JSON.stringify(s.output, null, 2)}
              </pre>
            )}
            {s.error && <p className="mt-2 text-xs text-red-600">{s.error}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}
