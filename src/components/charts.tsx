import { memo, useRef, useState } from "react";
import { fmtDay, peso0, type DayAgg } from "../lib/data";

/* ------------------------------- Spark ------------------------------ */

/** Inline 7-day trend — stroke takes currentColor so it sits in any theme. */
export function Spark({ points, className = "h-6 w-20" }: { points: number[]; className?: string }) {
  if (points.length < 2) return null;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const span = Math.max(max - min, 1);
  const W = 80;
  const H = 24;
  const pts = points.map((v, i) => ({
    x: (i / (points.length - 1)) * (W - 4) + 2,
    y: H - 3 - ((v - min) / span) * (H - 6),
  }));
  const d = `M${pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L")}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} aria-hidden="true" preserveAspectRatio="none">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
      <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="2.4" fill="currentColor" />
    </svg>
  );
}

/* ------------------------------- Bars ------------------------------ */

export function Bars({
  data,
  highlightLast = true,
  className = "h-44",
}: {
  data: { label: string; value: number; sub?: string }[];
  highlightLast?: boolean;
  className?: string;
}) {
  const [hov, setHov] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.value), 1);
  const active = hov !== null ? data[hov] : null;
  return (
    <div>
      <div className="mb-2 flex h-6 items-center justify-between">
        {active ? (
          <p className="rise text-sm font-semibold">
            {active.label}
            <span className="tnum ml-2 font-mono text-pine">{peso0(active.value)}</span>
            {active.sub && <span className="ml-2 text-xs font-normal text-ink-soft">{active.sub}</span>}
          </p>
        ) : (
          <p className="text-xs text-ink-soft">Hover a bar for daily detail</p>
        )}
        <p className="tnum font-mono text-[11px] text-ink-soft">peak {peso0(max)}</p>
      </div>
      <div className={`flex items-end gap-1 ${className}`}>
        {data.map((d, i) => {
          const isLast = highlightLast && i === data.length - 1;
          return (
            <div
              key={i}
              className="group flex h-full flex-1 cursor-pointer items-end"
              onMouseEnter={() => setHov(i)}
              onMouseLeave={() => setHov(null)}
            >
              <div
                className={`bar-grow w-full rounded-t-[4px] transition-colors ${
                  isLast
                    ? "bg-mango group-hover:bg-mango-deep"
                    : hov === i
                      ? "bg-pine"
                      : "bg-pine/75 group-hover:bg-pine"
                }`}
                style={{ height: `${Math.max(3, (d.value / max) * 100)}%`, animationDelay: `${i * 26}ms` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[10px] text-ink-soft">
        <span>{data[0]?.label}</span>
        <span>{data[Math.floor(data.length / 2)]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

/* Catmull-Rom → cubic Bézier: smooth, monotone-ish curves through real points. */
function smoothPath(pts: [number, number][]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

/* ----------------------------- AreaChart --------------------------- */

export function AreaChart({
  series,
  prev,
  height = 220,
}: {
  series: DayAgg[];
  prev?: DayAgg[];
  height?: number;
}) {
  const [hov, setHov] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const W = 640;
  const H = height;
  const pad = 14;
  const max = Math.max(...series.map((s) => s.revenue), ...(prev ?? []).map((s) => s.revenue), 1);
  const x = (i: number) => pad + (i / Math.max(series.length - 1, 1)) * (W - pad * 2);
  const y = (v: number) => H - 26 - (v / max) * (H - 52);
  const line = (arr: DayAgg[]) => smoothPath(arr.map((s, i) => [x(i), y(s.revenue)] as [number, number]));
  const area = `${line(series)} L${x(series.length - 1).toFixed(1)},${H - 24} L${x(0).toFixed(1)},${H - 24} Z`;

  const onMove = (e: React.MouseEvent) => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const rel = (e.clientX - r.left) / r.width;
    const idx = Math.round(rel * (series.length - 1));
    setHov(Math.max(0, Math.min(series.length - 1, idx)));
  };

  const hv = hov !== null ? series[hov] : null;
  const hp = hov !== null && prev ? prev[hov] : null;

  return (
    <div ref={wrapRef} className="relative" onMouseMove={onMove} onMouseLeave={() => setHov(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-pine)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--color-pine)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={pad} x2={W - pad} y1={y(max * f)} y2={y(max * f)} stroke="var(--color-line)" strokeDasharray="3 5" />
        ))}
        <line x1={pad} x2={W - pad} y1={H - 24} y2={H - 24} stroke="var(--color-line)" />
        {prev && <path d={line(prev)} fill="none" stroke="var(--color-mango-deep)" strokeWidth="2" strokeDasharray="5 5" opacity="0.8" />}
        <path d={area} fill="url(#areaFill)" />
        <path d={line(series)} pathLength={1} className="draw-in" fill="none" stroke="var(--color-pine)" strokeWidth="2.4" strokeLinejoin="round" />
        {hv && (
          <>
            <line x1={x(hov!)} x2={x(hov!)} y1={20} y2={H - 24} stroke="var(--color-mango)" strokeWidth="1.5" />
            <circle cx={x(hov!)} cy={y(hv.revenue)} r="5" fill="var(--color-mango)" stroke="var(--color-pine)" strokeWidth="2" />
          </>
        )}
      </svg>
      <div className="absolute inset-x-3 bottom-0 flex justify-between font-mono text-[10px] text-ink-soft">
        <span>{fmtDay(series[0]?.ts ?? 0)}</span>
        <span>{fmtDay(series[Math.floor(series.length / 2)]?.ts ?? 0)}</span>
        <span>{fmtDay(series[series.length - 1]?.ts ?? 0)}</span>
      </div>
      {hv && (
        <div
          className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 rounded-md border border-pine/30 bg-pine px-3 py-2 text-card shadow-lg"
          style={{ left: `${(hov! / Math.max(series.length - 1, 1)) * 100}%` }}
        >
          <p className="font-mono text-[10px] text-card/70">{fmtDay(hv.ts)}</p>
          <p className="tnum font-mono text-sm font-bold">{peso0(hv.revenue)}</p>
          {hp && <p className="tnum font-mono text-[10px] text-mango">prev {peso0(hp.revenue)}</p>}
        </div>
      )}
    </div>
  );
}

/* ------------------------------- Donut ----------------------------- */

export function Donut({
  segments,
  centerLabel,
  centerValue,
}: {
  segments: { label: string; value: number; color: string }[];
  centerLabel: string;
  centerValue: string;
}) {
  const total = Math.max(segments.reduce((s, x) => s + x.value, 0), 1);
  const R = 52;
  const C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="flex items-center gap-5">
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
          <circle cx="70" cy="70" r={R} fill="none" stroke="var(--color-paper)" strokeWidth="17" />
          {segments.map((s, i) => {
            const frac = s.value / total;
            const off = acc;
            acc += frac;
            return (
              <circle
                key={i}
                cx="70"
                cy="70"
                r={R}
                fill="none"
                stroke={s.color}
                strokeWidth="17"
                strokeDasharray={`${Math.max(frac * C - 2, 0)} ${C}`}
                strokeDashoffset={-off * C}
                className="transition-all duration-700"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="tnum font-mono text-lg font-bold leading-none">{centerValue}</span>
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-ink-soft">{centerLabel}</span>
        </div>
      </div>
      <ul className="flex-1 space-y-2.5">
        {segments.map((s, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: s.color }} />
            <span className="flex-1 font-medium">{s.label}</span>
            <span className="tnum font-mono font-semibold">{peso0(s.value)}</span>
            <span className="tnum w-10 text-right font-mono text-[11px] text-ink-soft">
              {Math.round((s.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------ Heatmap ---------------------------- */

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Memoized cell — the grid never re-renders its 119 cells on hover. */
const HeatCell = memo(function HeatCell({ day, hour, value, max }: { day: string; hour: number; value: number; max: number }) {
  return (
    <div
      title={`${day} ${hour}:00 — ${peso0(value)}`}
      className="h-6 cursor-pointer rounded-[3px] transition-transform hover:scale-110 hover:ring-1 hover:ring-mango"
      style={{
        background:
          value === 0
            ? "var(--color-paper)"
            : `color-mix(in srgb, var(--color-pine) ${Math.round(14 + (value / max) * 86)}%, var(--color-card))`,
      }}
    />
  );
});

export function Heatmap({ grid }: { grid: number[][] }) {
  const max = Math.max(...grid.flat(), 1);
  const hours = Array.from({ length: 17 }, (_, i) => i + 5);
  return (
    <div>
      <div className="grid gap-[3px]" style={{ gridTemplateColumns: "44px repeat(17, 1fr)" }}>
        <div />
        {hours.map((h) => (
          <div key={h} className="pb-1 text-center font-mono text-[9px] text-ink-soft">
            {h % 3 === 0 ? (h < 12 ? `${h}a` : h === 12 ? "12p" : `${h - 12}p`) : ""}
          </div>
        ))}
        {grid.map((row, r) => (
          <div key={r} className="contents">
            <div className="flex items-center font-mono text-[10px] font-semibold text-ink-soft">{DAYS[r]}</div>
            {row.map((v, c) => (
              <HeatCell key={c} day={DAYS[r]} hour={hours[c]} value={v} max={max} />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[10px] font-medium text-ink-soft">
        Less
        {[12, 30, 50, 72, 100].map((a) => (
          <span key={a} className="h-3 w-5 rounded-[3px]" style={{ background: `color-mix(in srgb, var(--color-pine) ${a}%, var(--color-card))` }} />
        ))}
        More
        <span className="ml-3 rounded bg-mango-soft px-2 py-0.5 font-semibold text-mango-deep">Peak: Fri &amp; Sat, 5–7 PM</span>
      </div>
    </div>
  );
}

/* ------------------------------- HBars ----------------------------- */

export function HBars({
  rows,
  fmt = peso0,
  unit = "",
}: {
  rows: { label: string; value: number; sub?: string; color?: string }[];
  fmt?: (n: number) => string;
  unit?: string;
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-3">
      {rows.map((r, i) => (
        <li key={i}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate font-semibold">
              <span className="tnum mr-2 font-mono text-[11px] text-ink-soft">#{i + 1}</span>
              {r.label}
            </span>
            <span className="tnum shrink-0 font-mono font-bold">
              {fmt(r.value)}
              {unit && <span className="ml-1 text-[11px] font-medium text-ink-soft">{unit}</span>}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-paper">
            <div
              className="width-grow h-full rounded-full"
              style={{
                width: `${(r.value / max) * 100}%`,
                background: r.color ?? "var(--color-pine)",
                animationDelay: `${i * 70}ms`,
              }}
            />
          </div>
          {r.sub && <p className="mt-0.5 text-[11px] text-ink-soft">{r.sub}</p>}
        </li>
      ))}
    </ul>
  );
}
