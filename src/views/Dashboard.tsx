import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  catMeta,
  dailySeries,
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
import { CategoryGlyph, IconAlert, IconBasket, IconCheck, IconChevR, IconClock, IconDown, IconPeso, IconUp } from "../components/Icons";
import { buildInsights } from "../lib/insights";

const TIPS = [
  "Tip: low-stock items show red under Inventory — restock before Friday rush.",
  "Tip: utang over 7 days gets flagged overdue. One-tap SMS reminder in the Utang Book.",
  "Tip: press / anywhere to jump to product search.",
  "Tip: GCash sales are tracked separately — check the payment mix daily.",
  "Tip: everything you record offline syncs automatically when signal returns.",
];

function greeting(lang: string) {
  const h = new Date().getHours();
  if (h < 12) return lang === "tl" ? "Magandang umaga" : "Good morning";
  if (h < 18) return lang === "tl" ? "Magandang hapon" : "Good afternoon";
  return lang === "tl" ? "Magandang gabi" : "Good evening";
}

function h12(h: number) {
  const hh = ((h % 24) + 24) % 24;
  return hh === 0 ? "12 AM" : hh < 12 ? `${hh} AM` : hh === 12 ? "12 PM" : `${hh - 12} PM`;
}

/** Progressive disclosure: collapsible card, animated via grid-rows. */
function CollapseCard({
  title,
  sub,
  right,
  children,
}: {
  title: string;
  sub?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  const [openState, setOpenState] = useState(true);
  return (
    <div className="h-full rounded-xl border border-line bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-bold">{title}</h2>
          {sub && <p className="text-xs text-ink-soft">{sub}</p>}
        </div>
        <div className="flex items-center gap-2">
          {right}
          <button
            onClick={() => setOpenState((o) => !o)}
            aria-expanded={openState}
            aria-label={openState ? `Collapse ${title}` : `Expand ${title}`}
            className="btn-press rounded-md p-1.5 text-ink-soft transition hover:bg-paper hover:text-pine"
          >
            <span
              className={`inline-flex transition-transform duration-300 ${openState ? "rotate-90" : ""}`}
              style={{ transitionTimingFunction: "var(--ease-standard)" }}
            >
              <IconChevR className="h-4 w-4" />
            </span>
          </button>
        </div>
      </div>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ${openState ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
        style={{ transitionTimingFunction: "var(--ease-standard)" }}
      >
        <div className="overflow-hidden">
          <div className="pt-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard({ go }: { go?: (v: string) => void }) {
  const { db, t, settings } = useStore();
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
      };
    };
    const collectedRange = (from: number, to: number) =>
      db.customers.reduce(
        (s, c) => s + c.history.filter((h) => h.type === "payment" && h.ts >= from && h.ts < to).reduce((a, h) => a + h.amount, 0),
        0,
      );
    const paySplit = (from: number, to: number) => {
      const list = db.sales.filter((s) => s.ts >= from && s.ts < to);
      return {
        cash: list.filter((s) => s.payment === "cash").reduce((s, x) => s + x.total, 0),
        gcash: list.filter((s) => s.payment === "gcash").reduce((s, x) => s + x.total, 0),
      };
    };
    const yp = paySplit(yest0, today0);
    return {
      today: sum(today0, now + 1),
      yest: sum(yest0, today0),
      collected: collectedRange(today0, now + 1),
      collectedYest: collectedRange(yest0, today0),
      yestCash: yp.cash,
      yestGcash: yp.gcash,
    };
  }, [db, today0, yest0, now]);

  const series = useMemo(() => dailySeries(db, 14), [db]);
  const mix = useMemo(() => paymentMix(db, 1), [db]);
  const agg7 = useMemo(() => productAgg(db, 7), [db]);
  const lows = lowStock(db);
  const deltaPct = stats.yest.total > 0 ? ((stats.today.total - stats.yest.total) / stats.yest.total) * 100 : 100;
  const tl = settings.lang === "tl";

  /* honest "AI" — plain arithmetic on the ledger, surfaced as chips.
     The full engine lives in lib/insights.ts: restock cues, overdue suki,
     peak-hour reads, weekly champions, weekend share, GCash drift. */
  const insights = useMemo(
    () =>
      buildInsights(db, settings.lang).map((ins) => ({
        text: ins.title,
        detail: ins.detail,
        view: ins.view,
        tint:
          ins.kind === "warn"
            ? "bg-cherry-soft text-cherry"
            : ins.kind === "ok"
              ? "bg-leaf-soft text-leaf"
              : "bg-gcash-soft text-gcash",
        icon:
          ins.kind === "warn" ? (
            <IconAlert className="h-4 w-4" />
          ) : ins.kind === "ok" ? (
            <IconCheck className="h-4 w-4" />
          ) : (
            <IconClock className="h-4 w-4" />
          ),
      })),
    [db, settings.lang],
  );

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
  const hour = new Date(clock).getHours();
  const open = hour >= 5 && hour < 22;
  const dayPct = Math.min(100, Math.max(2, ((clock - (today0 + 5 * 3600000)) / (17 * 3600000)) * 100));
  const recentSale = db.sales.length > 0 ? db.sales[tick % db.sales.length] : null;

  return (
    <div className="space-y-6">
      {/* ---- store masthead: the counter itself ---- */}
      <div className="@container relative overflow-hidden rounded-overlay border border-pine-deep/40 bg-pine text-card shadow-elev-3">
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(720px 320px at 88% 0%, color-mix(in srgb, var(--color-mango) 20%, transparent), transparent 60%)" }} />
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

        <div className="relative grid gap-7 px-5 py-6 @md:grid-cols-12 @md:px-8 @md:py-7">
          {/* the day's numbers, big */}
          <div className="@md:col-span-7">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-mango">
              {new Date(clock).toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <h1 className="mt-1.5 font-display text-2xl font-extrabold leading-tight md:text-3xl">
              {greeting(settings.lang)}, {settings.owner}
              <span className="text-mango">.</span>
            </h1>
            <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.24em] text-card/60">{t("totalSales")}</p>
            <p className="tnum font-display text-[clamp(2.7rem,8vw,4.75rem)] font-extrabold leading-none tracking-tight text-mango">
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
                { l: t("transactions"), v: String(stats.today.count), cur: stats.today.count, prev: stats.yest.count },
                { l: t("itemsSold"), v: String(stats.today.items), cur: stats.today.items, prev: stats.yest.items },
                { l: t("cash"), v: peso0(mix.cash), cur: mix.cash, prev: stats.yestCash },
                { l: "GCash", v: peso0(mix.gcash), cur: mix.gcash, prev: stats.yestGcash },
                { l: t("utangCollected"), v: peso0(stats.collected), cur: stats.collected, prev: stats.collectedYest },
              ].map((it) => {
                const pct = it.prev > 0 ? ((it.cur - it.prev) / it.prev) * 100 : null;
                return (
                  <div key={it.l} className="px-4 py-1 first:pl-0">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-card/50">{it.l}</p>
                    <p className="tnum flex items-baseline gap-1.5 font-mono text-sm font-bold">
                      {it.v}
                      {pct !== null && (
                        <span className={`font-mono text-[9px] font-extrabold ${pct >= 0 ? "text-leaf" : "text-[#f0b3ad]"}`} title={`vs ${t("yesterday").toLowerCase()}`}>
                          {pct >= 0 ? "▲" : "▼"}{Math.abs(pct).toFixed(0)}%
                        </span>
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* clock, open state, quick actions */}
          <div className="flex flex-col justify-between gap-6 @md:col-span-5">
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
                className="btn-press col-span-5 flex items-center justify-center gap-2.5 rounded-xl bg-mango py-3.5 font-display text-sm font-extrabold uppercase tracking-wide text-pine-deep shadow-lg shadow-mango/25 transition hover:bg-mango-deep @md:col-span-3"
              >
                <IconBasket className="h-5 w-5" /> {t("recordSale")}
              </button>
              <button
                onClick={() => go?.("stock")}
                className="btn-press col-span-2 flex items-center justify-center gap-2 rounded-xl border border-card/25 py-3.5 text-xs font-extrabold uppercase tracking-wide text-card transition hover:border-mango hover:text-mango @md:col-span-1 @md:flex-col @md:gap-1 @md:text-[10px]"
              >
                <IconUp className="h-4 w-4" /> Stock
              </button>
              <button
                onClick={() => go?.("utang")}
                className="btn-press col-span-3 flex items-center justify-center gap-2 rounded-xl border border-card/25 py-3.5 text-xs font-extrabold uppercase tracking-wide text-card transition hover:border-mango hover:text-mango @md:col-span-1 @md:flex-col @md:gap-1 @md:text-[10px]"
              >
                <IconPeso className="h-4 w-4" /> Utang
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* the ledger speaks — computed insights, each one a shortcut */}
      {insights.length > 0 && (
        <Reveal delay={40}>
          <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
            <span className="flex shrink-0 items-center rounded-xl bg-pine px-3.5 font-mono text-[10px] font-extrabold uppercase tracking-[0.18em] text-mango">
              {tl ? "Sabi ng datos" : "Data says"}
            </span>
            {insights.map((ins, i) => (
              <button
                key={i}
                onClick={() => go?.(ins.view)}
                className="btn-press group flex shrink-0 items-center gap-2.5 rounded-xl border border-line bg-card px-3.5 py-2.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-pine hover:shadow-elev-1"
              >
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${ins.tint}`}>{ins.icon}</span>
                <span className="text-xs font-semibold leading-snug">{ins.text}</span>
                <IconChevR className="h-3.5 w-3.5 shrink-0 text-ink-soft transition-transform group-hover:translate-x-0.5 group-hover:text-pine" />
              </button>
            ))}
          </div>
        </Reveal>
      )}

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
            <Bars data={series.map((s) => ({ label: new Date(s.ts).toLocaleDateString("en-PH", { month: "short", day: "numeric" }), value: s.revenue, sub: `${s.count} sales` }))} />
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
          <CollapseCard title={`${t("topSellers")} · 7d`} sub="By units sold this week">
            <HBars rows={topSellers} fmt={(n) => `${n}`} unit="pcs" />
          </CollapseCard>
        </Reveal>
        <Reveal delay={80}>
          <div className={`h-full rounded-xl border p-5 shadow-sm ${lows.length > 0 ? "border-cherry/30 bg-cherry-soft/40" : "border-line bg-card"}`}>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">{t("lowStock")}</h2>
              <span className={`tnum flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-xs font-bold ${lows.length > 0 ? "bg-cherry text-cherry-soft" : "bg-leaf-soft text-leaf"}`}>
                <IconAlert className="h-3.5 w-3.5" /> {lows.length} items
              </span>
            </div>
            <p className="mb-3 text-xs text-ink-soft">Below 5 units — restock before the rush</p>
            <ul className="space-y-2">
              {lows.slice(0, 5).map((p) => (
                <li key={p.id} className="flex items-center gap-2.5 rounded-lg bg-card/80 px-3 py-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-paper" style={{ color: catMeta(p.cat).color }}>
                    <CategoryGlyph cat={p.cat} className="h-4.5 w-4.5" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{p.name}</span>
                  <span className={`tnum font-mono text-xs font-bold ${p.stock === 0 ? "text-cherry" : "text-mango-deep"}`}>
                    {p.stock === 0 ? "out" : `${p.stock} left`}
                  </span>
                </li>
              ))}
              {lows.length === 0 && (
                <li className="rounded-lg bg-card px-3 py-4 text-center text-sm font-semibold text-leaf">All stocked up. Solid!</li>
              )}
            </ul>
          </div>
        </Reveal>
        <Reveal delay={160} className="md:col-span-2 lg:col-span-1">
          <CollapseCard title={t("activity")} sub={"Stock in & out, newest first"}>
            <ul className="space-y-1">
              {feed.map((m) => (
                <li key={m.id} className="flex items-center gap-2 rounded-md px-1.5 py-1.5 text-sm transition hover:bg-paper">
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${m.type === "restock" ? "bg-leaf-soft text-leaf" : "bg-cherry-soft text-cherry"}`}>
                    {m.type === "restock" ? <IconUp className="h-3.5 w-3.5" /> : <IconDown className="h-3.5 w-3.5" />}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs">
                    <span className="tnum font-mono font-bold" style={{ color: m.type === "restock" ? "#2f8f5b" : "#c9463d" }}>
                      {m.qty > 0 ? "+" : ""}{m.qty}
                    </span>{" "}
                    <span className="font-semibold">{m.name}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[10px] text-ink-soft">{timeAgo(m.ts)}</span>
                </li>
              ))}
            </ul>
          </CollapseCard>
        </Reveal>
      </div>

      {/* rotating tip */}
      <div key={tipIdx} className="rise flex items-center gap-3 rounded-xl border border-dashed border-mango-deep/40 bg-mango-soft/50 px-5 py-3.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mango font-display text-sm font-extrabold text-pine-deep">₱</span>
        <p className="text-sm font-medium text-mango-deep">{TIPS[tipIdx]}</p>
      </div>
    </div>
  );
}
