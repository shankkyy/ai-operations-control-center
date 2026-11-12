import { useCallback, useEffect } from "react";
import { api } from "../lib/api.js";
import { useApiData } from "../hooks/useApi.js";
import { Badge } from "../components/Badge.js";
import { Loading, ErrorState, Empty } from "../components/StateViews.js";
import type { JobSummary } from "../types/index.js";

export function Jobs() {
  const fetcher = useCallback(() => api.get<{ jobs: JobSummary[]; counts: Record<string, number> }>("/jobs"), []);
  const { data, loading, error, refetch } = useApiData(fetcher);

  useEffect(() => {
    const interval = setInterval(refetch, 4000);
    return () => clearInterval(interval);
  }, [refetch]);

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">Job Execution Monitoring</h1>

      {data?.counts && (
        <div className="flex gap-4 text-sm text-slate-600">
          {Object.entries(data.counts).map(([state, count]) => (
            <span key={state}>
              {state}: <strong>{count}</strong>
            </span>
          ))}
        </div>
      )}

      {!data || data.jobs.length === 0 ? (
        <Empty message="No jobs queued." />
      ) : (
        <table className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Job</th>
              <th className="px-4 py-2">State</th>
              <th className="px-4 py-2">Attempts</th>
              <th className="px-4 py-2">Failure reason</th>
            </tr>
          </thead>
          <tbody>
            {data.jobs.map((j) => (
              <tr key={j.id} className="border-t border-slate-100">
                <td className="px-4 py-2 font-mono text-xs">{j.id}</td>
                <td className="px-4 py-2">
                  <Badge value={j.state} />
                </td>
                <td className="px-4 py-2">{j.attemptsMade}</td>
                <td className="px-4 py-2 text-red-600">{j.failedReason ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
