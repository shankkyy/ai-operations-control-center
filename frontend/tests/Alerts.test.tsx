import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Alerts } from "../src/pages/Alerts.js";
import { renderWithProviders, jsonResponse } from "./testUtils.js";

function loginAs(role: "admin" | "operator" | "viewer") {
  localStorage.setItem("aocc_user", JSON.stringify({ sub: "u1", email: "a@b.com", role }));
}

describe("Alerts", () => {
  it("shows an empty state when there are no alerts", async () => {
    loginAs("viewer");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ alerts: [] })));
    renderWithProviders(<Alerts />);
    expect(await screen.findByText(/no alerts/i)).toBeInTheDocument();
  });

  it("hides the status-change action for a viewer", async () => {
    loginAs("viewer");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ alerts: [{ id: "a1", title: "Disk full", severity: "high", status: "open", source: "infra", created_at: "2026-01-01" }] }))
    );
    renderWithProviders(<Alerts />);
    await screen.findByText("Disk full");
    expect(screen.queryByRole("button", { name: /mark/i })).not.toBeInTheDocument();
  });

  it("lets an operator advance an alert's status", async () => {
    loginAs("operator");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ alerts: [{ id: "a1", title: "Disk full", severity: "high", status: "open", source: "infra", created_at: "2026-01-01" }] }))
      .mockResolvedValueOnce(jsonResponse({ alert: { id: "a1", status: "acknowledged" } }))
      .mockResolvedValueOnce(jsonResponse({ alerts: [{ id: "a1", title: "Disk full", severity: "high", status: "acknowledged", source: "infra", created_at: "2026-01-01" }] }));
    vi.stubGlobal("fetch", fetchMock);

    renderWithProviders(<Alerts />);
    const button = await screen.findByRole("button", { name: /mark acknowledged/i });
    await userEvent.click(button);

    expect(await screen.findByRole("button", { name: /mark resolved/i })).toBeInTheDocument();
  });
});
