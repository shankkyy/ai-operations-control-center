import http from "node:http";

/** Minimal stand-in for the FastAPI AI service, for gateway unit tests.
 * Real integration with the actual service is covered by the ai-service's
 * own pytest suite and by docker-compose E2E tests — see TESTING_STRATEGY.md.
 */
export function startMockAiService(port: number): http.Server {
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const parsed = body ? JSON.parse(body) : {};
      handle(req.url ?? "", parsed, res);
    });
  });
  server.listen(port);
  return server;
}

function handle(url: string, body: Record<string, unknown>, res: http.ServerResponse): void {
  if (url === "/health") {
    json(res, 200, { status: "ok" });
    return;
  }

  if (url === "/ingest") {
    json(res, 200, { document_id: body.document_id, chunks_created: 2, status: "ready", error: null });
    return;
  }

  if (url === "/rag/query") {
    res.writeHead(200, { "Content-Type": "text/event-stream" });
    const question = String(body.question ?? "");
    const insufficient = question.includes("unanswerable");
    res.write(`data: ${JSON.stringify({ type: "answer_chunk", text: "mock " })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: "answer_chunk", text: "answer" })}\n\n`);
    res.write(
      `data: ${JSON.stringify({
        type: "done",
        answer: "mock answer",
        sources: insufficient ? [] : [{ document_id: "doc-1", chunk_id: "chunk-1", title: "Mock Source", similarity: 0.9, excerpt: "..." }],
        confidence: insufficient ? 0.0 : 0.9,
        insufficient_evidence: insufficient,
      })}\n\n`
    );
    res.end();
    return;
  }

  if (url === "/anomalies/scan") {
    json(res, 200, {
      anomalies: [
        { metric_name: "cpu_usage_pct", value: 95, z_score: 3.2, severity: "high", recorded_at: new Date().toISOString() },
      ],
      scanned_metrics: 1,
    });
    return;
  }

  if (url === "/workflows/execute-step") {
    const stepName = String(body.step_name ?? "");
    const outputs: Record<string, Record<string, unknown>> = {
      summarize: { summary: "mock incident summary" },
      analyze: { analysis: "mock anomaly analysis" },
      compose_report: { report: "mock report" },
      rank: { ranked_alerts: (body.context as Record<string, unknown[]>)?.alerts ?? [] },
      suggest: { suggested_action: "restart the affected service" },
    };
    const output = outputs[stepName] ?? {};
    json(res, 200, { output, summary: JSON.stringify(output).slice(0, 200) });
    return;
  }

  if (url === "/eval/run") {
    json(res, 200, {
      metrics: {
        answer_relevance: 1,
        groundedness: 1,
        retrieval_precision: 1,
        retrieval_recall: 1,
        hallucination_resistance: 1,
        structure_validity: 1,
        avg_latency_ms: 5,
        cases_run: 5,
      },
      provider: "mock",
    });
    return;
  }

  json(res, 404, { error: "not found in mock ai service" });
}

function json(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}
