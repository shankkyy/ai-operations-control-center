import { useCallback, useRef, useState, type FormEvent } from "react";
import { api, ApiError } from "../lib/api.js";
import { useApiData } from "../hooks/useApi.js";
import { useAuth } from "../lib/auth.js";
import { Badge } from "../components/Badge.js";
import { Loading, ErrorState, Empty } from "../components/StateViews.js";
import type { Document } from "../types/index.js";

export function Documents() {
  const { user } = useAuth();
  const canUpload = user?.role === "admin" || user?.role === "operator";
  const fetcher = useCallback(() => api.get<{ documents: Document[] }>("/documents"), []);
  const { data, loading, error, refetch } = useApiData(fetcher);

  const titleRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function onUpload(e: FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file || !titleRef.current?.value) return;

    const form = new FormData();
    form.append("title", titleRef.current.value);
    form.append("file", file);

    setUploading(true);
    setUploadError(null);
    try {
      await api.upload("/documents", form);
      titleRef.current.value = "";
      if (fileRef.current) fileRef.current.value = "";
      refetch();
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : "upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Documents</h1>

      {canUpload && (
        <form onSubmit={onUpload} className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <div>
            <label htmlFor="doc-title" className="mb-1 block text-xs font-medium text-slate-600">
              Title
            </label>
            <input id="doc-title" ref={titleRef} required className="rounded-md border border-slate-300 px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label htmlFor="doc-file" className="mb-1 block text-xs font-medium text-slate-600">
              File
            </label>
            <input id="doc-file" ref={fileRef} type="file" required accept=".txt,.md" className="text-sm" />
          </div>
          <button
            type="submit"
            disabled={uploading}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {uploading ? "Ingesting..." : "Upload & Ingest"}
          </button>
          {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
        </form>
      )}

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : !data || data.documents.length === 0 ? (
        <Empty message="No documents ingested yet." />
      ) : (
        <table className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2">Title</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Uploaded</th>
            </tr>
          </thead>
          <tbody>
            {data.documents.map((d) => (
              <tr key={d.id} className="border-t border-slate-100">
                <td className="px-4 py-2">{d.title}</td>
                <td className="px-4 py-2">
                  <Badge value={d.status} />
                </td>
                <td className="px-4 py-2 text-slate-500">{new Date(d.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
