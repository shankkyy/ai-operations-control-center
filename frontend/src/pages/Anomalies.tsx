import { useCallback } from "react";
import { api } from "../lib/api.js";
import { useApiData } from "../hooks/useApi.js";
import { Badge } from "../components/Badge.js";
import { Loading, ErrorState, Empty } from "../components/StateViews.js";
import type { Anomaly } from "../types/index.js";

export function Anomalies() {
  const fetcher = useCallback(() => api.get<{ anomalies: Anomaly[]; scanned_metrics: number }>("/anomalies"), []);
  const { data, loading, error, refetch } = useApiData(fetcher);

  if (loading) return <Loading label="Scanning for anomalies..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Anomaly Detection</h1>
        <button onClick={refetch} className="rounded-md border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50">
          Rescan
        </button>
      </div>
      {data?.scanned_metrics != null && (
        <p className="text-sm text-slate-500">Scanned {data.scanned_metrics} metric series.</p>
      )}

      {!data || data.anomalies.length === 0 ? (
        <Empty message="No anomalies detected right now." />
      ) : (
        <table className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Metric</th>
              <th className="px-4 py-2">Value</th>
              <th className="px-4 py-2">Z-score</th>
              <th className="px-4 py-2">Severity</th>
              <th className="px-4 py-2">Recorded</th>
            </tr>
          </thead>
          <tbody>
            {data.anomalies.map((a, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="px-4 py-2">{a.metric_name}</td>
                <td className="px-4 py-2">{a.value}</td>
                <td className="px-4 py-2">{a.z_score}</td>
                <td className="px-4 py-2">
                  <Badge value={a.severity} />
                </td>
                <td className="px-4 py-2 text-slate-500">{new Date(a.recorded_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
