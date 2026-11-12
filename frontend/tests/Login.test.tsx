import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Login } from "../src/pages/Login.js";
import { renderWithProviders, jsonResponse } from "./testUtils.js";

describe("Login", () => {
  it("logs in successfully and stores the token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ token: "abc123", user: { id: "u1", email: "admin@aocc.local", role: "admin" } }))
    );

    renderWithProviders(<Login />, { route: "/login" });
    await userEvent.clear(screen.getByLabelText(/email/i));
    await userEvent.type(screen.getByLabelText(/email/i), "admin@aocc.local");
    await userEvent.type(screen.getByLabelText(/password/i), "ChangeMe123!");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(localStorage.getItem("aocc_token")).toBe("abc123"));
  });

  it("shows an error message on invalid credentials", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "invalid email or password" }, 401)));

    renderWithProviders(<Login />, { route: "/login" });
    await userEvent.type(screen.getByLabelText(/password/i), "wrong");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
  });
});
