import { useCallback, useState } from "react";
import { api } from "../lib/api.js";
import { useApiData } from "../hooks/useApi.js";
import { Loading, ErrorState, Empty } from "../components/StateViews.js";
import type { AuditLog } from "../types/index.js";

const PAGE_SIZE = 20;

export function AuditLogs() {
  const [page, setPage] = useState(1);
  const fetcher = useCallback(
    () => api.get<{ logs: AuditLog[]; total: number }>(`/audit-logs?page=${page}&pageSize=${PAGE_SIZE}`),
    [page]
  );
  const { data, loading, error, refetch } = useApiData(fetcher, [page]);

  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">Audit Logs</h1>

      {!data || data.logs.length === 0 ? (
        <Empty message="No audit events recorded yet." />
      ) : (
        <>
          <table className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Action</th>
                <th className="px-4 py-2">Resource</th>
                <th className="px-4 py-2">Actor</th>
                <th className="px-4 py-2">When</th>
              </tr>
            </thead>
            <tbody>
              {data.logs.map((log) => (
                <tr key={log.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{log.action}</td>
                  <td className="px-4 py-2 text-slate-500">
                    {log.resource_type} {log.resource_id ? `(${log.resource_id.slice(0, 8)})` : ""}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-500">{log.actor?.slice(0, 8) ?? "system"}</td>
                  <td className="px-4 py-2 text-slate-500">{new Date(log.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between text-sm">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md border border-slate-200 px-3 py-1 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-slate-500">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-md border border-slate-200 px-3 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
