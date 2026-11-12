export function Sparkline({ values, width = 320, height = 80 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return <div className="text-xs text-slate-400">not enough data</div>;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (values.length - 1);

  const points = values
    .map((v, i) => `${i * stepX},${height - ((v - min) / range) * height}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-20 w-full" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke="#0f172a" strokeWidth={2} />
    </svg>
  );
}
