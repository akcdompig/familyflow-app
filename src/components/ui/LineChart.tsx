/** Kleine lijngrafiek, schaal 0–10, één punt per week. */
export function LineChart({ series, colors, dashed, label }: { series: number[][]; colors: string[]; dashed?: number[]; label: string }) {
  const n = Math.max(1, ...series.map((s) => s.length), dashed?.length ?? 0);
  const W = 340, H = 180, L = 26, R = 12, T = 12, B = 24;
  const w = W - L - R, h = H - T - B;
  const x = (i: number) => L + (n <= 1 ? w / 2 : (i * w) / (n - 1));
  const y = (v: number) => T + h - (v / 10) * h;
  const line = (vals: number[], color: string, dash: boolean, key: string) => {
    const pts = vals.map((v, i) => (Number.isFinite(v) ? [x(i), y(v)] : null)).filter(Boolean) as number[][];
    if (!pts.length) return null;
    return (
      <g key={key}>
        <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={color} strokeWidth={dash ? 2 : 3} strokeDasharray={dash ? "5 5" : undefined} strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 5 : 3.5} fill={color} />)}
      </g>
    );
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={label} style={{ maxWidth: 460, display: "block" }}>
      {[0, 5, 10].map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#ece4dc" />
          <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize="10" fill="#5f5b8a">{v}</text>
        </g>
      ))}
      {Array.from({ length: n }, (_, i) => (
        <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="#5f5b8a">Wk {i + 1}</text>
      ))}
      {series.map((s, i) => line(s, colors[i % colors.length], false, `s${i}`))}
      {dashed && line(dashed, "#8b86b3", true, "d")}
    </svg>
  );
}
