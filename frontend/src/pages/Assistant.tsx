import { useState, type FormEvent } from "react";
import { streamAssistantAnswer, ApiError } from "../lib/api.js";
import type { ChatMessage, SourceRef } from "../types/index.js";

export function Assistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!question.trim() || streaming) return;

    const userMessage: ChatMessage = { role: "user", content: question };
    setMessages((prev) => [...prev, userMessage, { role: "assistant", content: "" }]);
    setQuestion("");
    setStreaming(true);
    setError(null);

    let answer = "";
    let sources: SourceRef[] = [];

    try {
      await streamAssistantAnswer(userMessage.content, conversationId, (event) => {
        if (event.type === "conversation") {
          setConversationId(event.conversation_id as string);
        } else if (event.type === "answer_chunk") {
          answer += event.text as string;
          setMessages((prev) => [...prev.slice(0, -1), { role: "assistant", content: answer }]);
        } else if (event.type === "done") {
          sources = event.sources as SourceRef[];
          setMessages((prev) => [...prev.slice(0, -1), { role: "assistant", content: event.answer as string, sources }]);
        }
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "the assistant request failed");
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] max-w-3xl flex-col">
      <h1 className="mb-4 text-xl font-semibold text-slate-900">AI Assistant</h1>

      <div className="flex-1 space-y-4 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4">
        {messages.length === 0 && (
          <p className="py-12 text-center text-sm text-slate-400">
            Ask a question about your operational data — answers are grounded in ingested documents with citations.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : ""}>
            <div
              className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                m.role === "user" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-800"
              }`}
            >
              {m.content || (streaming && i === messages.length - 1 ? "..." : "")}
            </div>
            {m.sources && m.sources.length > 0 && (
              <div className="mt-1 space-y-1 text-left">
                {m.sources.map((s) => (
                  <div key={s.chunk_id} className="text-xs text-slate-500">
                    📄 {s.title} <span className="text-slate-400">(similarity {s.similarity.toFixed(2)})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <form onSubmit={onSubmit} className="mt-4 flex gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about operational incidents, runbooks, metrics..."
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          disabled={streaming}
        />
        <button
          type="submit"
          disabled={streaming}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {streaming ? "Thinking..." : "Ask"}
        </button>
      </form>
    </div>
  );
}
