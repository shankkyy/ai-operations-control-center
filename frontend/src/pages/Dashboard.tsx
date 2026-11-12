import { useCallback } from "react";
import { api } from "../lib/api.js";
import { useApiData } from "../hooks/useApi.js";
import { StatTile } from "../components/Card.js";
import { Badge } from "../components/Badge.js";
import { Loading, ErrorState, Empty } from "../components/StateViews.js";
import type { DashboardSummary } from "../types/index.js";

export function Dashboard() {
  const fetcher = useCallback(() => api.get<DashboardSummary>("/dashboard/summary"), []);
  const { data, loading, error, refetch } = useApiData(fetcher);

  if (loading) return <Loading label="Loading dashboard..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!data) return <Empty message="No dashboard data yet." />;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Overview</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Operational events" value={data.totalOperationalEvents} />
        <StatTile label="Active jobs" value={data.activeJobs} />
        <StatTile label="Failed jobs" value={data.failedJobs} tone={data.failedJobs > 0 ? "danger" : "default"} />
        <StatTile label="Anomalies detected" value={data.anomalyCount} tone={data.anomalyCount > 0 ? "danger" : "success"} />
        <StatTile label="Job success rate" value={`${Math.round(data.jobSuccessRate * 100)}%`} />
        <StatTile label="System health" value={data.systemHealth} tone="success" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Recent incidents (anomalies)</h2>
          {data.recentIncidents.length === 0 ? (
            <Empty message="No anomalies detected." />
          ) : (
            <ul className="space-y-2">
              {data.recentIncidents.map((a, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{a.metric_name}</span>
                  <Badge value={a.severity} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Recent alerts</h2>
          {data.recentAlerts.length === 0 ? (
            <Empty message="No alerts yet." />
          ) : (
            <ul className="space-y-2">
              {data.recentAlerts.map((a) => (
                <li key={a.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{a.title}</span>
                  <div className="flex gap-2">
                    <Badge value={a.severity} />
                    <Badge value={a.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
