import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>;
}

export function StatTile({ label, value, tone = "default" }: { label: string; value: string | number; tone?: "default" | "danger" | "success" }) {
  const toneClass = tone === "danger" ? "text-red-600" : tone === "success" ? "text-emerald-600" : "text-slate-900";
  return (
    <Card>
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</div>
    </Card>
  );
}
