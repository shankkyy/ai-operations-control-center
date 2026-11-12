import { useCallback } from "react";
import { api } from "../lib/api.js";
import { useApiData } from "../hooks/useApi.js";
import { useAuth } from "../lib/auth.js";
import { Card } from "../components/Card.js";
import { Loading, ErrorState } from "../components/StateViews.js";

interface SettingsInfo {
  llmProvider: string;
  embeddingProvider: string;
  openaiKeyConfigured: boolean;
  anthropicKeyConfigured: boolean;
  aiServiceHealthy: boolean;
}

export function Settings() {
  const { user } = useAuth();
  const fetcher = useCallback(() => api.get<SettingsInfo>("/settings"), []);
  const { data, loading, error, refetch } = useApiData(fetcher);

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Settings</h1>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Account</h2>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Email</dt>
            <dd>{user?.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Role</dt>
            <dd>{user?.role}</dd>
          </div>
        </dl>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">AI provider configuration</h2>
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : data ? (
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">LLM provider</dt>
              <dd className="font-medium">{data.llmProvider}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Embedding provider</dt>
              <dd className="font-medium">{data.embeddingProvider}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">OpenAI key configured</dt>
              <dd>{data.openaiKeyConfigured ? "yes" : "no"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Anthropic key configured</dt>
              <dd>{data.anthropicKeyConfigured ? "yes" : "no"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">AI service reachable</dt>
              <dd>{data.aiServiceHealthy ? "yes" : "no"}</dd>
            </div>
          </dl>
        ) : null}
        <p className="mt-3 text-xs text-slate-400">
          Provider mode is set via environment variables (LLM_PROVIDER / EMBEDDING_PROVIDER) and is not changeable from the UI.
        </p>
      </Card>
    </div>
  );
}
