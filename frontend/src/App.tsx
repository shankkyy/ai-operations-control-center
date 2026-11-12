import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./lib/auth.js";
import { ProtectedRoute } from "./components/ProtectedRoute.js";
import { Layout } from "./components/Layout.js";
import { Login } from "./pages/Login.js";
import { Dashboard } from "./pages/Dashboard.js";
import { Analytics } from "./pages/Analytics.js";
import { Assistant } from "./pages/Assistant.js";
import { Documents } from "./pages/Documents.js";
import { Anomalies } from "./pages/Anomalies.js";
import { Workflows } from "./pages/Workflows.js";
import { Jobs } from "./pages/Jobs.js";
import { Alerts } from "./pages/Alerts.js";
import { AuditLogs } from "./pages/AuditLogs.js";
import { Settings } from "./pages/Settings.js";

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/assistant" element={<Assistant />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/anomalies" element={<Anomalies />} />
              <Route path="/workflows" element={<Workflows />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/audit-logs" element={<AuditLogs />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
