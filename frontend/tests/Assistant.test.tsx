import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Assistant } from "../src/pages/Assistant.js";
import { renderWithProviders } from "./testUtils.js";

function sseResponse(events: Record<string, unknown>[]): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }
      controller.close();
    },
  });
  return new Response(stream, { status: 200 });
}

describe("Assistant", () => {
  it("streams the answer and shows source citations", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        sseResponse([
          { type: "conversation", conversation_id: "c1" },
          { type: "answer_chunk", text: "The " },
          { type: "answer_chunk", text: "gateway is healthy." },
          {
            type: "done",
            answer: "The gateway is healthy.",
            sources: [{ document_id: "d1", chunk_id: "ch1", title: "Runbook", similarity: 0.8, excerpt: "..." }],
            confidence: 0.8,
            insufficient_evidence: false,
          },
        ])
      )
    );

    renderWithProviders(<Assistant />);
    await userEvent.type(screen.getByPlaceholderText(/ask about/i), "is the gateway healthy?");
    await userEvent.click(screen.getByRole("button", { name: /ask/i }));

    expect(await screen.findByText("The gateway is healthy.")).toBeInTheDocument();
    expect(await screen.findByText(/Runbook/)).toBeInTheDocument();
  });

  it("shows an empty state before any question is asked", () => {
    renderWithProviders(<Assistant />);
    expect(screen.getByText(/ask a question/i)).toBeInTheDocument();
  });
});
