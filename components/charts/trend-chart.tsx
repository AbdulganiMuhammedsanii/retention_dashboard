import type { MonthlyRecord } from "@/lib/calc/retention";
import { hasData, retentionPct } from "@/lib/calc/retention";
import { MONTH_NAMES } from "@/lib/format/months";

const W = 800;
const H = 280;
const padL = 50;
const padR = 20;
const padT = 20;
const padB = 40;
const innerW = W - padL - padR;
const innerH = H - padT - padB;
const yMin = 70;
const yMax = 100;

function yScale(v: number): number {
  return padT + innerH - ((v - yMin) / (yMax - yMin)) * innerH;
}

export function TrendChart({ rows }: { rows: MonthlyRecord[] }) {
  const dataLen = rows.length;
  const xStep = innerW / Math.max(dataLen - 1, 1);

  type Point = { x: number; y: number; ret: number; row: MonthlyRecord; i: number };
  const points: Point[] = [];
  rows.forEach((row, i) => {
    const x = padL + i * xStep;
    if (hasData(row)) {
      const ret = retentionPct(row);
      if (ret !== null) {
        const y = yScale(Math.min(Math.max(ret, yMin), yMax));
        points.push({ x, y, ret, row, i });
      }
    }
  });

  const industryY = yScale(88);

  let areaPath = "";
  if (points.length > 1) {
    areaPath = `M ${points[0]?.x ?? 0} ${yScale(yMin)}`;
    points.forEach((p) => {
      areaPath += ` L ${p.x} ${p.y}`;
    });
    const last = points[points.length - 1];
    if (last) areaPath += ` L ${last.x} ${yScale(yMin)} Z`;
  }

  let linePath = "";
  if (points.length > 0) {
    linePath = `M ${points[0]?.x ?? 0} ${points[0]?.y ?? 0}`;
    for (let i = 1; i < points.length; i++) {
      const p = points[i];
      if (p) linePath += ` L ${p.x} ${p.y}`;
    }
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="h-auto w-full max-w-full"
      role="img"
      aria-label="Monthly retention trend"
    >
      {[70, 80, 90, 100].map((v) => {
        const y = yScale(v);
        return (
          <g key={v}>
            <line
              x1={padL}
              y1={y}
              x2={W - padR}
              y2={y}
              stroke="#23272F"
              strokeWidth={1}
              strokeDasharray="2,4"
            />
            <text
              x={padL - 8}
              y={y + 4}
              textAnchor="end"
              fill="#545A65"
              style={{ fontFamily: "var(--font-jetbrains), monospace", fontSize: 10 }}
            >
              {v}%
            </text>
          </g>
        );
      })}

      <line
        x1={padL}
        y1={industryY}
        x2={W - padR}
        y2={industryY}
        stroke="#545A65"
        strokeWidth={1}
        strokeDasharray="4,4"
        opacity={0.6}
      />

      {points.length > 1 ? (
        <>
          <defs>
            <linearGradient id="watchtowerTrendArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EA580C" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#EA580C" stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#watchtowerTrendArea)" />
        </>
      ) : null}

      {points.length > 0 ? (
        <path
          d={linePath}
          fill="none"
          stroke="#EA580C"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}

      {points.map((p) => (
        <circle
          key={`pt-${p.i}`}
          cx={p.x}
          cy={p.y}
          r={4}
          fill="#0A0B0D"
          stroke="#EA580C"
          strokeWidth={2}
        />
      ))}

      {rows.map((row, i) => {
        const x = padL + i * xStep;
        if (!hasData(row)) return null;
        const dep = row.departures;
        if (dep <= 0) return null;
        const r = Math.min(2 + dep, 8);
        return (
          <circle
            key={`dep-${row.year}-${row.month}`}
            cx={x}
            cy={H - padB + 12}
            r={r}
            fill="#10B981"
            opacity={0.6}
          />
        );
      })}

      {rows.map((row, i) => {
        if (i % 2 !== 0 && i !== dataLen - 1) return null;
        const x = padL + i * xStep;
        const label = MONTH_NAMES[row.month]?.toUpperCase() ?? "";
        return (
          <text
            key={`xl-${row.year}-${row.month}`}
            x={x}
            y={H - padB + 30}
            textAnchor="middle"
            fill="#545A65"
            style={{ fontFamily: "var(--font-jetbrains), monospace", fontSize: 10 }}
          >
            {label}
          </text>
        );
      })}

      {points.length === 0 ? (
        <text
          x={W / 2}
          y={H / 2}
          textAnchor="middle"
          fill="#545A65"
          style={{ fontFamily: "var(--font-manrope), sans-serif", fontSize: 13 }}
        >
          Enter monthly data to see your trend
        </text>
      ) : null}
    </svg>
  );
}
