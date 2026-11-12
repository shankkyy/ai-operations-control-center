import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render } from "@testing-library/react";
import { AuthProvider } from "../src/lib/auth.js";
import { ProtectedRoute } from "../src/components/ProtectedRoute.js";

function Secret() {
  return <div>secret content</div>;
}
function LoginStub() {
  return <div>login page</div>;
}

describe("ProtectedRoute", () => {
  it("redirects to /login when no user is authenticated", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginStub />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Secret />} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByText("login page")).toBeInTheDocument();
    expect(screen.queryByText("secret content")).not.toBeInTheDocument();
  });

  it("renders the protected content when a user is authenticated", () => {
    localStorage.setItem("aocc_user", JSON.stringify({ sub: "u1", email: "a@b.com", role: "viewer" }));
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginStub />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Secret />} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByText("secret content")).toBeInTheDocument();
  });
});
