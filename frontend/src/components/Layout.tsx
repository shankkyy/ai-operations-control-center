import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth.js";

const NAV_ITEMS = [
  { to: "/", label: "Overview", end: true },
  { to: "/analytics", label: "Analytics" },
  { to: "/assistant", label: "AI Assistant" },
  { to: "/documents", label: "Documents" },
  { to: "/anomalies", label: "Anomalies" },
  { to: "/workflows", label: "Workflows" },
  { to: "/jobs", label: "Jobs" },
  { to: "/alerts", label: "Alerts" },
  { to: "/audit-logs", label: "Audit Logs" },
  { to: "/settings", label: "Settings" },
];

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 border-r border-slate-200 bg-white p-4">
        <div className="mb-6 px-2 text-lg font-semibold text-slate-900">AOCC</div>
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block rounded-md px-3 py-2 text-sm font-medium ${
                  isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <div className="text-sm text-slate-500">Operations Control Center</div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-600">
              {user?.email} <span className="text-slate-400">({user?.role})</span>
            </span>
            <button onClick={logout} className="rounded-md border border-slate-200 px-3 py-1 text-slate-600 hover:bg-slate-50">
              Log out
            </button>
          </div>
        </header>
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
