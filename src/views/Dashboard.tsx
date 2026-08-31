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
import { CategoryGlyph, IconAlert, IconBasket, IconDown, IconPeso, IconUp } from "../components/Icons";

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

export default function Dashboard({ go }: { go?: (v: string) => void }) {
  const { db, t, settings, addStock } = useStore();
  const [tipIdx, setTipIdx] = useState(0);
  const [clock, setClock] = useState(Date.now());
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setTick((i) => i + 1), 3000);
    return () => window.clearInterval(id);
  }, []);

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

  const feed = db.movements.slice(0, 9);

  /* live store state */
  const hour = new Date(clock).getHours();
  const open = hour >= 5 && hour < 22;
  const dayPct = Math.min(100, Math.max(2, ((clock - (today0 + 5 * 3600000)) / (17 * 3600000)) * 100));
  const recentSale = db.sales[tick % Math.max(db.sales.length, 1)];

  return (
    <div className="space-y-6">
      {/* ---- store masthead: the counter itself ---- */}
      <div className="relative overflow-hidden rounded-2xl border border-pine-deep/40 bg-pine text-card shadow-[0_24px_60px_-24px_rgba(11,39,27,0.55)]">
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(720px 320px at 88% 0%, rgba(246,168,28,0.20), transparent 60%)" }} />
        <div className="stripes-soft absolute inset-x-0 top-0 h-1.5" />
        <p className="pointer-events-none absolute -bottom-14 right-0 select-none font-display text-[190px] font-extrabold leading-none text-card/[0.05]">₱</p>

        {/* receipt ticker — most recent sale, live */}
        <div className="relative flex items-center gap-3 border-b border-dashed border-card/20 px-5 py-2.5 font-mono text-[11px] text-card/70">
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-card/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-mango">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-mango" /> live
          </span>
          {recentSale ? (
            <p key={tick} className="ticker-fade min-w-0 flex-1 truncate">
              {fmtTime(recentSale.ts)} · <span className="font-bold text-card">{peso(recentSale.total)}</span> ·{" "}
              {recentSale.payment === "gcash" ? "GCash" : recentSale.payment === "utang" ? "Utang" : "Cash"} ·{" "}
              {recentSale.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}
            </p>
          ) : (
            <p className="min-w-0 flex-1 truncate">Wala pang benta ngayon — i-record ang una sa baba.</p>
          )}
          <span className="tnum hidden shrink-0 sm:block">
            {db.sales.filter((s) => s.ts >= today0).length} sales {t("today").toLowerCase()}
          </span>
        </div>

        <div className="relative grid gap-7 px-5 py-6 md:grid-cols-12 md:px-8 md:py-7">
          {/* the day's numbers, big */}
          <div className="md:col-span-7">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-mango">
              {new Date(clock).toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <h1 className="mt-1.5 font-display text-2xl font-extrabold leading-tight md:text-3xl">
              {greeting(settings.lang)}, {settings.owner}
              <span className="text-mango">.</span>
            </h1>
            <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.24em] text-card/60">{t("totalSales")}</p>
            <p className="tnum font-display text-6xl font-extrabold leading-none tracking-tight text-mango md:text-7xl">
              <CountUp value={stats.today.total} fmt={peso0} />
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
              <Delta pct={deltaPct} />
              <span className="text-xs text-card/60">
                vs {t("yesterday").toLowerCase()} · {peso0(stats.yest.total)}
              </span>
            </div>
            <div className="mt-6 flex flex-wrap divide-x divide-dashed divide-card/20">
              {[
                [t("transactions"), String(stats.today.count)],
                [t("itemsSold"), String(stats.today.items)],
                [t("cash"), peso0(mix.cash)],
                ["GCash", peso0(mix.gcash)],
                [t("utangCollected"), peso0(stats.collected)],
              ].map(([l, v]) => (
                <div key={l} className="px-4 py-1 first:pl-0">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-card/50">{l}</p>
                  <p className="tnum font-mono text-sm font-bold">{v}</p>
                </div>
              ))}
            </div>
          </div>

          {/* clock, open state, quick actions */}
          <div className="flex flex-col justify-between gap-6 md:col-span-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="tnum font-mono text-4xl font-bold tracking-tight">{fmtTime(clock)}</p>
                <div className="mt-2.5 h-1.5 w-44 overflow-hidden rounded-full bg-card/15">
                  <div className="h-full rounded-full bg-mango transition-[width] duration-1000 ease-linear" style={{ width: `${dayPct}%` }} />
                </div>
                <p className="mt-1.5 font-mono text-[10px] tracking-wide text-card/50">bukas 5:00 AM – 10:00 PM</p>
              </div>
              <span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-widest ${open ? "bg-leaf text-card" : "bg-card/10 text-card/60"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${open ? "pulse-dot bg-card" : "bg-card/40"}`} />
                {open ? "Open" : "Sarado"}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              <button
                onClick={() => go?.("sales")}
                className="btn-press col-span-5 flex items-center justify-center gap-2.5 rounded-xl bg-mango py-3.5 font-display text-sm font-extrabold uppercase tracking-wide text-pine-deep shadow-lg shadow-mango/25 transition hover:bg-mango-deep md:col-span-3"
              >
                <IconBasket className="h-5 w-5" /> {t("recordSale")}
              </button>
              <button
                onClick={() => go?.("stock")}
                className="btn-press col-span-2 flex items-center justify-center gap-2 rounded-xl border border-card/25 py-3.5 text-xs font-extrabold uppercase tracking-wide text-card transition hover:border-mango hover:text-mango md:col-span-1 md:flex-col md:gap-1 md:text-[10px]"
              >
                <IconUp className="h-4 w-4" /> Stock
              </button>
              <button
                onClick={() => go?.("utang")}
                className="btn-press col-span-3 flex items-center justify-center gap-2 rounded-xl border border-card/25 py-3.5 text-xs font-extrabold uppercase tracking-wide text-card transition hover:border-mango hover:text-mango md:col-span-1 md:flex-col md:gap-1 md:text-[10px]"
              >
                <IconPeso className="h-4 w-4" /> Utang
              </button>
            </div>
          </div>
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
