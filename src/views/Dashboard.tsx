import { useEffect, useMemo, useState } from "react";
import {
  catMeta,
  dailySeries,
  fmtDay,
  fmtTime,
  lowStock,
  paymentMix,
  peso,
  peso0,
  productAgg,
  startOfDay,
  timeAgo,
} from "../lib/data";
import { useStore } from "../lib/store";
import { Bars, Donut, HBars } from "../components/charts";
import { CountUp, Delta, Reveal } from "../components/ui";
import { CategoryGlyph, IconAlert, IconBasket, IconDown, IconPeso, IconUp, IconUsers } from "../components/Icons";

const TIPS = [
  "Restock Lucky Me! before Friday — it's your #1 seller two weeks running.",
  "GCash is now ~20% of revenue. Keep the QR code visible sa counter!",
  "Kuya Boy's utang is getting old — a friendly SMS reminder usually works.",
  "Weekend evenings (5–7 PM) are your rush hour. Extra stock sa drinks!",
  "Utang na nacobra is cash-in — record it under payments, hindi benta.",
];

function greeting(lang: "en" | "tl") {
  const h = new Date().getHours();
  const part = h < 12 ? 0 : h < 18 ? 1 : 2;
  const en = ["Good morning", "Good afternoon", "Good evening"][part];
  const tl = ["Magandang umaga", "Magandang hapon", "Magandang gabi"][part];
  return lang === "tl" ? tl : en;
}

export default function Dashboard() {
  const { db, t, settings, addStock, sync } = useStore();
  const [tipIdx, setTipIdx] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTipIdx((i) => (i + 1) % TIPS.length), 6000);
    return () => window.clearInterval(id);
  }, []);

  const now = Date.now();
  const today0 = startOfDay(now);
  const yest0 = today0 - 86400000;

  const stats = useMemo(() => {
    const sum = (from: number, to: number) => {
      const list = db.sales.filter((s) => s.ts >= from && s.ts < to);
      return {
        total: list.reduce((s, x) => s + x.total, 0),
        count: list.length,
        items: list.reduce((s, x) => s + x.items.reduce((a, i) => a + i.qty, 0), 0),
        profit: list.reduce((s, x) => s + x.items.reduce((a, i) => a + (i.price - i.cost) * i.qty, 0), 0),
      };
    };
    const today = sum(today0, now + 1);
    const yest = sum(yest0, today0);
    const collected = db.customers.reduce(
      (s, c) => s + c.history.filter((h) => h.type === "payment" && h.ts >= today0).reduce((a, h) => a + h.amount, 0),
      0,
    );
    const payers = db.customers.filter((c) => c.history.some((h) => h.type === "payment" && h.ts >= today0));
    return { today, yest, collected, payers };
  }, [db, today0, yest0, now]);

  const series = useMemo(() => dailySeries(db, 14), [db]);
  const mix = useMemo(() => paymentMix(db, 1), [db]);
  const agg7 = useMemo(() => productAgg(db, 7), [db]);
  const lows = lowStock(db);
  const deltaPct = stats.yest.total > 0 ? ((stats.today.total - stats.yest.total) / stats.yest.total) * 100 : 100;

  const topSellers = useMemo(
    () =>
      [...agg7.entries()]
        .map(([id, a]) => ({ p: db.products.find((x) => x.id === id), a }))
        .filter((x) => x.p && x.a.units > 0)
        .sort((x, y) => y.a.units - x.a.units)
        .slice(0, 6)
        .map(({ p, a }) => ({
          label: p!.name,
          value: a.units,
          sub: `${peso0(a.revenue)} revenue`,
          color: catMeta(p!.cat).color,
        })),
    [agg7, db.products],
  );

  const spark = useMemo(() => {
    const max = Math.max(...series.map((s) => s.revenue), 1);
    return series.map((s, i) => `${(i / (series.length - 1)) * 200},${44 - (s.revenue / max) * 38}`).join(" ");
  }, [series]);

  const feed = db.movements.slice(0, 9);

  return (
    <div className="space-y-6">
      {/* greeting */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-mango-deep">
            {new Date().toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="font-display text-3xl font-extrabold leading-tight md:text-4xl">
            {greeting(settings.lang)}, {settings.owner}
            <span className="text-mango-deep">.</span>
          </h1>
        </div>
        <p className="max-w-xs text-right text-sm text-ink-soft">
          {settings.storeName} · ledger is{" "}
          <span className={sync.status === "syncing" ? "font-semibold text-mango-deep" : "font-semibold text-leaf"}>
            {sync.status === "syncing" ? "syncing…" : "up to date"}
          </span>
        </p>
      </div>

      {/* ledger strip */}
      <div className="grid gap-4 lg:grid-cols-12">
        <Reveal className="lg:col-span-7">
          <div className="relative h-full overflow-hidden rounded-xl border border-pine bg-pine p-6 text-card shadow-lg">
            <IconPeso className="pointer-events-none absolute -right-6 -top-8 h-48 w-48 text-card/[0.06]" />
            <div className="absolute inset-x-0 top-0 h-1.5 stripes-soft" />
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-mango">
              {t("totalSales")} · {t("today").toLowerCase()}
            </p>
            <div className="mt-2 flex flex-wrap items-end gap-3">
              <CountUp
                value={stats.today.total}
                fmt={peso0}
                className="font-mono text-5xl font-bold tracking-tight text-mango"
              />
              <Delta pct={deltaPct} />
              <span className="pb-1 text-xs text-card/60">vs yesterday</span>
            </div>
            <div className="mt-3 flex items-center gap-4">
              <svg viewBox="0 0 200 48" className="h-12 w-48 shrink-0" preserveAspectRatio="none">
                <polyline points={spark} fill="none" stroke="#f6a81c" strokeWidth="2" opacity="0.9" />
                <polyline points={`0,48 ${spark} 200,48`} fill="rgba(246,168,28,0.14)" stroke="none" />
              </svg>
              <p className="text-[11px] leading-relaxed text-card/60">
                14-day trend
                <br />
                <span className="font-mono text-card/90">{peso0(series.reduce((s, x) => s + x.revenue, 0))} total</span>
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-card/10 pt-4 text-xs">
              {(
                [
                  ["Cash", mix.cash, "bg-leaf"],
                  ["GCash", mix.gcash, "bg-gcash"],
                  ["Utang", mix.utang, "bg-cherry"],
                ] as const
              ).map(([label, v, dot]) => (
                <span key={label} className="inline-flex items-center gap-1.5 rounded-full bg-card/10 px-3 py-1.5 font-semibold">
                  <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                  {label}
                  <span className="tnum font-mono">{peso0(v)}</span>
                </span>
              ))}
            </div>
          </div>
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1">
          <Reveal delay={80}>
            <div className="flex h-full items-center justify-between rounded-xl border border-line bg-card p-5 shadow-sm">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">{t("transactions")}</p>
                <p className="mt-1 font-mono text-3xl font-bold">
                  <CountUp value={stats.today.count} />
                </p>
                <p className="mt-1 text-xs text-ink-soft">
                  avg basket <span className="tnum font-mono font-semibold text-ink">{peso(stats.today.count ? stats.today.total / stats.today.count : 0)}</span>
                </p>
              </div>
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-pine-soft text-pine">
                <IconBasket className="h-6 w-6" />
              </span>
            </div>
          </Reveal>
          <Reveal delay={140}>
            <div className="flex h-full items-center justify-between rounded-xl border border-line bg-card p-5 shadow-sm">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">{t("utangCollected")}</p>
                <p className="mt-1 font-mono text-3xl font-bold text-leaf">
                  <CountUp value={stats.collected} fmt={peso0} />
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-ink-soft">
                  <IconUsers className="h-3.5 w-3.5" />
                  {stats.payers.length} suki paid · {stats.today.items} items moved
                </p>
              </div>
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-leaf-soft text-leaf">
                <IconPeso className="h-6 w-6" />
              </span>
            </div>
          </Reveal>
        </div>
      </div>

      {/* charts row */}
      <div className="grid gap-4 lg:grid-cols-12">
        <Reveal className="lg:col-span-8">
          <div className="rounded-xl border border-line bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-bold">Paninda revenue — last 14 days</h2>
                <p className="text-xs text-ink-soft">Daily gross sales across cash, GCash &amp; utang</p>
              </div>
              <span className="tnum rounded-md bg-mango-soft px-2.5 py-1 font-mono text-xs font-bold text-mango-deep">
                {peso0(series.reduce((s, x) => s + x.revenue, 0))}
              </span>
            </div>
            <Bars data={series.map((s) => ({ label: fmtDay(s.ts), value: s.revenue, sub: `${s.count} sales` }))} />
          </div>
        </Reveal>
        <Reveal delay={100} className="lg:col-span-4">
          <div className="flex h-full flex-col rounded-xl border border-line bg-card p-5 shadow-sm">
            <h2 className="font-display text-lg font-bold">Payment mix · today</h2>
            <p className="mb-4 text-xs text-ink-soft">How sukis are paying right now</p>
            <div className="flex-1">
              <Donut
                segments={[
                  { label: "Cash", value: mix.cash, color: "#2f8f5b" },
                  { label: "GCash", value: mix.gcash, color: "#2e6fd0" },
                  { label: "Utang", value: mix.utang, color: "#c9463d" },
                ]}
                centerLabel="today"
                centerValue={peso0(mix.cash + mix.gcash + mix.utang)}
              />
            </div>
          </div>
        </Reveal>
      </div>

      {/* insight row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Reveal>
          <div className="h-full rounded-xl border border-line bg-card p-5 shadow-sm">
            <h2 className="font-display text-lg font-bold">{t("topSellers")} · 7d</h2>
            <p className="mb-4 text-xs text-ink-soft">By units sold this week</p>
            <HBars rows={topSellers} fmt={(n) => `${n}`} unit="pcs" />
          </div>
        </Reveal>
        <Reveal delay={80}>
          <div className="flex h-full flex-col rounded-xl border border-line bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">{t("lowStock")}</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-cherry-soft px-2.5 py-1 text-[11px] font-bold text-cherry">
                <IconAlert className="h-3.5 w-3.5" /> {lows.length} items
              </span>
            </div>
            {lows.length === 0 ? (
              <p className="text-sm text-ink-soft">All stocked up — ayos!</p>
            ) : (
              <ul className="flex-1 space-y-2.5">
                {lows.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 rounded-lg border border-cherry/20 bg-cherry-soft/50 px-3 py-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-card" style={{ color: catMeta(p.cat).color }}>
                      <CategoryGlyph cat={p.cat} className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{p.name}</p>
                      <p className="font-mono text-[11px] font-bold text-cherry">{p.stock} left</p>
                    </div>
                    <button
                      onClick={() => addStock(p.id, 24)}
                      className="btn-press rounded-md bg-pine px-2.5 py-1.5 text-[11px] font-bold text-mango transition hover:bg-pine-deep"
                    >
                      +24
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Reveal>
        <Reveal delay={160}>
          <div className="flex h-full flex-col rounded-xl border border-line bg-card p-5 shadow-sm">
            <h2 className="font-display text-lg font-bold">{t("activity")}</h2>
            <p className="mb-4 text-xs text-ink-soft">Live stock movements</p>
            <ul className="flex-1 space-y-1">
              {feed.map((m) => (
                <li key={m.id} className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5 text-sm transition hover:bg-paper">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${m.type === "restock" ? "bg-leaf-soft text-leaf" : "bg-cherry-soft text-cherry"}`}>
                    {m.type === "restock" ? <IconUp className="h-3.5 w-3.5" /> : <IconDown className="h-3.5 w-3.5" />}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    <span className="tnum font-mono font-bold" style={{ color: m.type === "restock" ? "#2f8f5b" : "#c9463d" }}>
                      {m.qty > 0 ? "+" : ""}{m.qty}
                    </span>{" "}
                    {m.name}
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-ink-soft">{timeAgo(m.ts)}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>

      {/* tip ticker */}
      <Reveal>
        <div className="flex items-center gap-4 overflow-hidden rounded-xl border border-mango/40 bg-mango-soft px-5 py-4">
          <span className="shrink-0 rounded-md bg-mango px-2.5 py-1 font-display text-xs font-extrabold uppercase tracking-wider text-pine-deep">
            {settings.lang === "tl" ? "Alam mo ba?" : "Store tip"}
          </span>
          <p key={tipIdx} className="ticker-fade truncate text-sm font-semibold text-ink">
            {TIPS[tipIdx]}
          </p>
          <span className="ml-auto hidden shrink-0 font-mono text-[10px] text-ink-soft sm:block">
            {fmtTime(Date.now())} · auto-rotating
          </span>
        </div>
      </Reveal>
    </div>
  );
}
