import { useCallback, useState } from "react";
import { api } from "../lib/api.js";
import { useApiData } from "../hooks/useApi.js";
import { useAuth } from "../lib/auth.js";
import { Badge } from "../components/Badge.js";
import { Loading, ErrorState, Empty } from "../components/StateViews.js";
import type { Alert } from "../types/index.js";

const NEXT_STATUS: Record<Alert["status"], Alert["status"] | null> = {
  open: "acknowledged",
  acknowledged: "resolved",
  resolved: null,
};

export function Alerts() {
  const { user } = useAuth();
  const canManage = user?.role === "admin" || user?.role === "operator";
  const fetcher = useCallback(() => api.get<{ alerts: Alert[] }>("/alerts"), []);
  const { data, loading, error, refetch } = useApiData(fetcher);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function advance(alert: Alert) {
    const next = NEXT_STATUS[alert.status];
    if (!next) return;
    setUpdatingId(alert.id);
    try {
      await api.patch(`/alerts/${alert.id}`, { status: next });
      refetch();
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">Alert Management</h1>

      {!data || data.alerts.length === 0 ? (
        <Empty message="No alerts." />
      ) : (
        <table className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Severity</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Source</th>
              {canManage && <th className="px-4 py-2" />}
            </tr>
          </thead>
          <tbody>
            {data.alerts.map((a) => (
              <tr key={a.id} className="border-t border-slate-100">
                <td className="px-4 py-2">{a.title}</td>
                <td className="px-4 py-2">
                  <Badge value={a.severity} />
                </td>
                <td className="px-4 py-2">
                  <Badge value={a.status} />
                </td>
                <td className="px-4 py-2 text-slate-500">{a.source}</td>
                {canManage && (
                  <td className="px-4 py-2">
                    {NEXT_STATUS[a.status] && (
                      <button
                        onClick={() => advance(a)}
                        disabled={updatingId === a.id}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50"
                      >
                        Mark {NEXT_STATUS[a.status]}
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
