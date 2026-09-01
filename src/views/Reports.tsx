import { useMemo, useState } from "react";
import {
  catMeta,
  dailySeries,
  downloadCSV,
  fmtDay,
  fmtTime,
  heatmap,
  paymentMix,
  peso0,
  prevDailySeries,
  productAgg,
  type Cat,
} from "../lib/data";
import { useStore } from "../lib/store";
import { AreaChart, Donut, HBars, Heatmap } from "../components/charts";
import { Delta, Reveal, Seg } from "../components/ui";
import { IconDownload, IconPrint, IconShield } from "../components/Icons";

type Period = "7" | "14" | "30";

export default function ReportsView() {
  const { db, settings } = useStore();
  const [period, setPeriod] = useState<Period>("14");
  const days = parseInt(period, 10);
  const hideProfit = settings.role === "helper";

  const series = useMemo(() => dailySeries(db, days), [db, days]);
  const prev = useMemo(() => prevDailySeries(db, days), [db, days]);
  const agg = useMemo(() => productAgg(db, days), [db, days]);
  const mix = useMemo(() => paymentMix(db, days), [db, days]);
  const grid = useMemo(() => heatmap(db), [db]);

  const totals = useMemo(() => {
    const revenue = series.reduce((s, x) => s + x.revenue, 0);
    const profit = series.reduce((s, x) => s + x.profit, 0);
    const count = series.reduce((s, x) => s + x.count, 0);
    const prevRevenue = prev.reduce((s, x) => s + x.revenue, 0);
    return {
      revenue,
      profit,
      count,
      margin: revenue > 0 ? (profit / revenue) * 100 : 0,
      avg: count > 0 ? revenue / count : 0,
      delta: prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0,
    };
  }, [series, prev]);

  const topByRevenue = useMemo(
    () =>
      [...agg.entries()]
        .map(([id, a]) => ({ p: db.products.find((x) => x.id === id), a }))
        .filter((x) => x.p && x.a.revenue > 0)
        .sort((x, y) => y.a.revenue - x.a.revenue)
        .slice(0, 8)
        .map(({ p, a }) => ({
          label: p!.name,
          value: a.revenue,
          sub: `${a.units} pcs · ${p!.price > 0 ? Math.round(((p!.price - p!.cost) / p!.price) * 100) : 0}% margin`,
          color: catMeta(p!.cat).color,
        })),
    [agg, db.products],
  );

  const catProfit = useMemo(() => {
    const map = new Map<Cat, number>();
    for (const [id, a] of agg.entries()) {
      const p = db.products.find((x) => x.id === id);
      if (!p) continue;
      map.set(p.cat, (map.get(p.cat) ?? 0) + a.profit);
    }
    return [...map.entries()]
      .sort((x, y) => y[1] - x[1])
      .map(([c, v]) => ({ label: catMeta(c).en, value: v, color: catMeta(c).color }));
  }, [agg, db.products]);

  const exportSales = () =>
    downloadCSV("sukibook-sales.csv", [
      ["Date", "Time", "Items", "Qty", "Payment", "Customer", "Total"],
      ...db.sales.map((s) => [
        fmtDay(s.ts),
        fmtTime(s.ts),
        s.items.map((i) => i.name).join(" | "),
        s.items.reduce((a, i) => a + i.qty, 0),
        s.payment,
        s.customerId ? db.customers.find((c) => c.id === s.customerId)?.name ?? "" : "",
        s.total,
      ]),
    ]);

  const exportUtang = () =>
    downloadCSV("sukibook-utang.csv", [
      ["Customer", "Phone", "Balance"],
      ...db.customers.map((c) => [c.name, c.phone, c.balance]),
    ]);

  const statCards: { label: string; value: string; extra?: React.ReactNode; locked?: boolean }[] = [
    { label: "Revenue", value: peso0(totals.revenue), extra: <Delta pct={totals.delta} /> },
    { label: "Profit", value: hideProfit ? "₱ ••••" : peso0(totals.profit), locked: hideProfit },
    { label: "Margin", value: hideProfit ? "•••%" : `${totals.margin.toFixed(1)}%`, locked: hideProfit },
    { label: "Transactions", value: totals.count.toLocaleString() },
    { label: "Avg basket", value: peso0(totals.avg) },
  ];

  return (
    <div className="space-y-5">
      <div className="hidden print:block">
        <h1 className="font-display text-2xl font-extrabold">{settings.storeName}</h1>
        <p className="text-sm text-ink-soft">Sales report · last {days} days · generated {fmtDay(Date.now())}</p>
      </div>

      <Reveal>
        <div className="no-print flex flex-wrap items-center gap-3">
          <Seg<Period>
            value={period}
            onChange={setPeriod}
            options={[
              { key: "7", label: "7 days" },
              { key: "14", label: "14 days" },
              { key: "30", label: "30 days" },
            ]}
          />
          <span className="hidden text-xs text-ink-soft sm:block">vs previous {days} days</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <button onClick={() => window.print()} className="btn-press inline-flex items-center gap-2 rounded-lg border border-line bg-card px-3 py-1.5 text-xs font-bold transition hover:border-pine hover:bg-pine-soft">
              <IconPrint className="h-4 w-4" /> Print / PDF
            </button>
            <button onClick={exportSales} className="btn-press inline-flex items-center gap-2 rounded-lg border border-line bg-card px-3 py-1.5 text-xs font-bold transition hover:border-pine hover:bg-pine-soft">
              <IconDownload className="h-4 w-4" /> Sales CSV
            </button>
            <button onClick={exportUtang} className="btn-press inline-flex items-center gap-2 rounded-lg border border-line bg-card px-3 py-1.5 text-xs font-bold transition hover:border-pine hover:bg-pine-soft">
              <IconDownload className="h-4 w-4" /> Utang CSV
            </button>
          </div>
        </div>
      </Reveal>

      <Reveal delay={60}>
        <div className="flex flex-wrap gap-3">
          {statCards.map((s, i) => (
            <div key={i} className="min-w-36 flex-1 rounded-xl border border-line bg-card px-4 py-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-soft">
                {s.label}
                {s.locked && <IconShield className="h-3 w-3 text-mango-deep" />}
              </p>
              <div className="mt-0.5 flex items-center gap-2">
                <p className="tnum font-mono text-xl font-bold">{s.value}</p>
                {s.extra}
              </div>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal delay={100}>
        <div className="rounded-xl border border-line bg-card p-5 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-bold">Sales trend</h2>
              <p className="text-xs text-ink-soft">Daily revenue, last {days} days</p>
            </div>
            <div className="flex items-center gap-4 text-[11px] font-semibold text-ink-soft">
              <span className="flex items-center gap-1.5"><span className="h-1 w-5 rounded bg-pine" /> this period</span>
              <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 border-t-2 border-dashed border-[#c9a24b]" /> previous</span>
            </div>
          </div>
          <AreaChart series={series} prev={prev} />
        </div>
      </Reveal>

      <div className="grid gap-5 lg:grid-cols-12">
        <Reveal className="lg:col-span-6">
          <div className="h-full rounded-xl border border-line bg-card p-5 shadow-sm">
            <h2 className="font-display text-lg font-bold">Top products</h2>
            <p className="mb-4 text-xs text-ink-soft">By revenue · last {days} days</p>
            <HBars rows={topByRevenue} />
          </div>
        </Reveal>
        <Reveal delay={80} className="lg:col-span-3">
          <div className="h-full rounded-xl border border-line bg-card p-5 shadow-sm">
            <h2 className="font-display text-lg font-bold">Payment mix</h2>
            <p className="mb-4 text-xs text-ink-soft">Last {days} days</p>
            <Donut
              segments={[
                { label: "Cash", value: mix.cash, color: "#2f8f5b" },
                { label: "GCash", value: mix.gcash, color: "#2e6fd0" },
                { label: "Utang", value: mix.utang, color: "#c9463d" },
              ]}
              centerLabel={`${days}d`}
              centerValue={peso0(mix.cash + mix.gcash + mix.utang)}
            />
          </div>
        </Reveal>
        <Reveal delay={140} className="lg:col-span-3">
          <div className="h-full rounded-xl border border-line bg-card p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold">
              Profit by category
              {hideProfit && <IconShield className="h-4 w-4 text-mango-deep" />}
            </h2>
            <p className="mb-4 text-xs text-ink-soft">Where the kita comes from</p>
            {hideProfit ? (
              <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-dashed border-line bg-paper/60 text-center">
                <IconShield className="h-6 w-6 text-ink-soft/60" />
                <p className="mt-2 text-xs font-bold text-ink-soft">Owner-only (spec §10)</p>
                <p className="mt-0.5 max-w-52 text-[11px] text-ink-soft">Helpers record sales &amp; stock — profit margins stay with the owner.</p>
              </div>
            ) : (
              <HBars rows={catProfit} />
            )}
          </div>
        </Reveal>
      </div>

      <Reveal>
        <div className="cv-auto rounded-xl border border-line bg-card p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-bold">Best-selling hours</h2>
              <p className="text-xs text-ink-soft">Revenue heatmap, last 4 weeks — plan staff &amp; stock around the rush</p>
            </div>
            <span className="rounded-md bg-pine px-2.5 py-1 font-mono text-[11px] font-bold text-mango">4 weeks of data</span>
          </div>
          <Heatmap grid={grid} />
        </div>
      </Reveal>
    </div>
  );
}
