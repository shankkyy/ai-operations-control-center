import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { Dashboard } from "../src/pages/Dashboard.js";
import { renderWithProviders, jsonResponse } from "./testUtils.js";

const SUMMARY = {
  totalOperationalEvents: 42,
  activeJobs: 1,
  failedJobs: 0,
  waitingJobs: 0,
  jobSuccessRate: 1,
  anomalyCount: 1,
  recentIncidents: [{ metric_name: "cpu_usage_pct", value: 90, z_score: 3, severity: "high", recorded_at: "2026-01-01" }],
  recentAlerts: [{ id: "a1", title: "Disk full", severity: "high", status: "open", source: "infra", created_at: "2026-01-01" }],
  systemHealth: "ok",
};

describe("Dashboard", () => {
  it("renders real API data once loaded", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(SUMMARY)));
    renderWithProviders(<Dashboard />);

    expect(await screen.findByText("42")).toBeInTheDocument();
    expect(await screen.findByText("Disk full")).toBeInTheDocument();
    expect(await screen.findByText("cpu_usage_pct")).toBeInTheDocument();
  });

  it("shows an error state with a retry button on failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "db unreachable" }, 503)));
    renderWithProviders(<Dashboard />);

    expect(await screen.findByText(/db unreachable/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});
