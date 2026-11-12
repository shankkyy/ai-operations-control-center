import { useCallback } from "react";
import { api } from "../lib/api.js";
import { useApiData } from "../hooks/useApi.js";
import { Card } from "../components/Card.js";
import { Sparkline } from "../components/Sparkline.js";
import { Loading, ErrorState, Empty } from "../components/StateViews.js";

interface MetricSeries {
  metric_name: string;
  points: { value: string; recorded_at: string }[];
}

export function Analytics() {
  const fetcher = useCallback(() => api.get<{ series: MetricSeries[] }>("/metrics"), []);
  const { data, loading, error, refetch } = useApiData(fetcher);

  if (loading) return <Loading label="Loading analytics..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!data || data.series.length === 0) return <Empty message="No operational metrics recorded yet." />;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Operational Analytics</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {data.series.map((s) => {
          const values = s.points.map((p) => Number(p.value));
          const latest = values[values.length - 1];
          return (
            <Card key={s.metric_name}>
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="text-sm font-medium text-slate-700">{s.metric_name}</h2>
                <span className="text-lg font-semibold text-slate-900">{latest?.toFixed(1)}</span>
              </div>
              <Sparkline values={values} />
              <p className="mt-1 text-xs text-slate-400">{s.points.length} points</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
