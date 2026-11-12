import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { Workflows } from "../src/pages/Workflows.js";
import { renderWithProviders, jsonResponse } from "./testUtils.js";

function loginAs(role: "admin" | "operator" | "viewer") {
  localStorage.setItem("aocc_user", JSON.stringify({ sub: "u1", email: "a@b.com", role }));
}

describe("Workflows", () => {
  it("hides the run-creation form for a viewer", async () => {
    loginAs("viewer");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ runs: [] })));
    renderWithProviders(<Workflows />);
    await screen.findByText(/no workflow runs yet/i);
    expect(screen.queryByText(/workflow type/i)).not.toBeInTheDocument();
  });

  it("shows execution history for an operator", async () => {
    loginAs("operator");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          runs: [
            {
              id: "run-1",
              workflow_type: "alert_prioritization",
              status: "completed",
              input: {},
              output: null,
              current_step: 1,
              max_steps: 1,
              created_at: "2026-01-01T00:00:00Z",
              updated_at: "2026-01-01T00:00:00Z",
            },
          ],
        })
      )
    );
    renderWithProviders(<Workflows />);
    expect(await screen.findByText(/alert prioritization/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/workflow type/i)).toBeInTheDocument();
  });
});
