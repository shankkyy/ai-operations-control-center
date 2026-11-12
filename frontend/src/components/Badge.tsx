const COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-slate-100 text-slate-600",
  open: "bg-red-100 text-red-700",
  acknowledged: "bg-amber-100 text-amber-700",
  resolved: "bg-emerald-100 text-emerald-700",
  pending: "bg-slate-100 text-slate-600",
  ready: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
  running: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  awaiting_approval: "bg-amber-100 text-amber-700",
};

export function Badge({ value }: { value: string }) {
  const color = COLORS[value] ?? "bg-slate-100 text-slate-600";
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>{value.replace(/_/g, " ")}</span>;
}
