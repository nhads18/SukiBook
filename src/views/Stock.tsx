import { Fragment, useMemo, useState } from "react";
import { catMeta, downloadCSV, peso0, productAgg, timeAgo } from "../lib/data";
import { useStore } from "../lib/store";
import { Reveal } from "../components/ui";
import { CategoryGlyph, IconAlert, IconBox, IconDown, IconDownload, IconUp } from "../components/Icons";

export default function StockView() {
  const { db, t, addStock } = useStore();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [customQty, setCustomQty] = useState("");

  const agg = useMemo(() => productAgg(db, 7), [db]);

  const rows = useMemo(
    () =>
      db.products
        .map((p) => {
          const units7 = agg.get(p.id)?.units ?? 0;
          const rate = units7 / 7;
          const daysLeft = rate > 0 ? p.stock / rate : Infinity;
          return { ...p, units7, rate, daysLeft };
        })
        .sort((a, b) => a.daysLeft - b.daysLeft),
    [db.products, agg],
  );

  const lowCount = db.products.filter((p) => p.stock < 5).length;
  const invValue = db.products.reduce((s, p) => s + p.cost * p.stock, 0);
  const unitsToday = db.movements.filter((m) => m.type === "sale" && Date.now() - m.ts < 86400000).reduce((s, m) => s - m.qty, 0);
  const suggestions = rows.filter((r) => r.rate > 0).slice(0, 6);
  const feed = db.movements.slice(0, 12);
  const maxStock = 64;

  const exportCsv = () =>
    downloadCSV("sukibook-stock.csv", [
      ["Product", "Category", "Stock", "Status", "Sold 7d", "Avg/day", "Days left", "Suggested order"],
      ...rows.map((r) => [
        r.name,
        catMeta(r.cat).en,
        r.stock,
        r.stock === 0 ? "OUT" : r.stock < 5 ? "LOW" : "OK",
        r.units7,
        r.rate.toFixed(1),
        r.daysLeft === Infinity ? "—" : r.daysLeft.toFixed(0),
        r.rate > 0 ? Math.max(12, Math.ceil(r.rate * 14 - r.stock)) : 0,
      ]),
    ]);

  const statusBadge = (stock: number) =>
    stock === 0 ? (
      <span className="rounded bg-cherry px-2 py-0.5 text-[10px] font-extrabold uppercase text-cherry-soft">Out</span>
    ) : stock < 5 ? (
      <span className="rounded bg-cherry-soft px-2 py-0.5 text-[10px] font-extrabold uppercase text-cherry">Low</span>
    ) : (
      <span className="rounded bg-leaf-soft px-2 py-0.5 text-[10px] font-extrabold uppercase text-leaf">OK</span>
    );

  return (
    <div className="space-y-5">
      {/* stat strip */}
      <Reveal>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Products tracked", value: String(db.products.length), icon: <IconBox className="h-5 w-5" />, tint: "bg-pine-soft text-pine" },
            { label: t("lowStock"), value: String(lowCount), icon: <IconAlert className="h-5 w-5" />, tint: lowCount > 0 ? "bg-cherry-soft text-cherry" : "bg-leaf-soft text-leaf" },
            { label: "Inventory value (cost)", value: peso0(invValue), icon: <IconUp className="h-5 w-5" />, tint: "bg-mango-soft text-mango-deep" },
            { label: "Units sold today", value: String(unitsToday), icon: <IconDown className="h-5 w-5" />, tint: "bg-gcash-soft text-gcash" },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-3.5 rounded-xl border border-line bg-card px-4 py-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.tint}`}>{s.icon}</span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">{s.label}</p>
                <p className="tnum font-mono text-xl font-bold leading-tight">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      </Reveal>

      <div className="grid gap-5 lg:grid-cols-12">
        {/* stock table */}
        <Reveal className="lg:col-span-8">
          <div className="overflow-hidden rounded-xl border border-line bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <h2 className="font-display text-lg font-bold">Stock levels</h2>
                <p className="text-xs text-ink-soft">Sorted by urgency — pinaka-unang mauubos muna</p>
              </div>
              <button
                onClick={exportCsv}
                className="btn-press inline-flex items-center gap-2 rounded-lg border border-line bg-card px-3 py-1.5 text-xs font-bold transition hover:border-pine hover:bg-pine-soft"
              >
                <IconDownload className="h-4 w-4" /> {t("exportCsv")}
              </button>
            </div>
            <div className="max-h-[560px] overflow-y-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="sticky top-0 border-b border-line bg-paper">
                  <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                    <th className="px-5 py-2.5">Product</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5">Level</th>
                    <th className="px-3 py-2.5 text-right">7d</th>
                    <th className="px-3 py-2.5 text-right">Days left</th>
                    <th className="px-3 py-2.5 text-right">Restock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((p) => (
                    <Fragment key={p.id}>
                      <tr className="transition hover:bg-paper/70">
                        <td className="px-5 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-paper" style={{ color: catMeta(p.cat).color }}>
                              <CategoryGlyph cat={p.cat} className="h-4.5 w-4.5" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-semibold leading-tight">{p.name}</p>
                              <p className="tnum font-mono text-[11px] font-bold" style={{ color: p.stock < 5 ? "#c9463d" : "#4c5c51" }}>
                                {p.stock} in stock
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">{statusBadge(p.stock)}</td>
                        <td className="px-3 py-2.5">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-paper">
                            <div
                              className="width-grow h-full rounded-full"
                              style={{
                                width: `${Math.min(100, (p.stock / maxStock) * 100)}%`,
                                background: p.stock === 0 ? "#c9463d" : p.stock < 5 ? "#f6a81c" : "#2f8f5b",
                              }}
                            />
                          </div>
                        </td>
                        <td className="tnum px-3 py-2.5 text-right font-mono text-xs text-ink-soft">{p.units7}</td>
                        <td className={`tnum px-3 py-2.5 text-right font-mono text-xs font-bold ${p.daysLeft < 3 ? "text-cherry" : p.daysLeft < 7 ? "text-mango-deep" : "text-ink-soft"}`}>
                          {p.daysLeft === Infinity ? "—" : `${p.daysLeft.toFixed(0)}d`}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            onClick={() => {
                              setExpanded(expanded === p.id ? null : p.id);
                              setCustomQty("");
                            }}
                            className={`btn-press rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                              expanded === p.id ? "bg-pine text-mango" : "bg-pine-soft text-pine hover:bg-mango hover:text-pine-deep"
                            }`}
                          >
                            {expanded === p.id ? "Close" : "+ Stock"}
                          </button>
                        </td>
                      </tr>
                      {expanded === p.id && (
                        <tr className="bg-mango-soft/50">
                          <td colSpan={6} className="px-5 py-3">
                            <div className="rise flex flex-wrap items-center gap-2 text-sm">
                              <span className="text-xs font-bold uppercase tracking-wider text-ink-soft">Delivery received:</span>
                              {[12, 24, 48].map((q) => (
                                <button
                                  key={q}
                                  onClick={() => {
                                    addStock(p.id, q);
                                    setExpanded(null);
                                  }}
                                  className="btn-press rounded-md bg-pine px-3 py-1.5 font-mono text-xs font-bold text-mango transition hover:bg-pine-deep"
                                >
                                  +{q}
                                </button>
                              ))}
                              <input
                                value={customQty}
                                onChange={(e) => setCustomQty(e.target.value)}
                                type="number"
                                placeholder="Custom"
                                className="field w-24 px-2 py-1.5 text-xs"
                              />
                              <button
                                onClick={() => {
                                  const q = parseInt(customQty, 10);
                                  if (q > 0) {
                                    addStock(p.id, q);
                                    setExpanded(null);
                                  }
                                }}
                                className="btn-press rounded-md bg-mango px-3 py-1.5 text-xs font-extrabold text-pine-deep transition hover:bg-mango-deep"
                              >
                                Add
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>

        {/* right column */}
        <div className="space-y-5 lg:col-span-4">
          <Reveal delay={80}>
            <div className="rounded-xl border border-line bg-card p-5 shadow-sm">
              <h2 className="font-display text-lg font-bold">Reorder cues</h2>
              <p className="mb-4 text-xs text-ink-soft">Based on your 7-day selling speed</p>
              <ul className="space-y-2.5">
                {suggestions.map((r) => {
                  const order = Math.max(12, Math.ceil(r.rate * 14 - r.stock));
                  const urgent = r.daysLeft < 3;
                  return (
                    <li key={r.id} className={`rounded-lg border px-3.5 py-2.5 ${urgent ? "border-cherry/30 bg-cherry-soft/50" : "border-line bg-paper/60"}`}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold">{r.name}</p>
                        <span className={`tnum shrink-0 font-mono text-[11px] font-bold ${urgent ? "text-cherry" : "text-mango-deep"}`}>
                          ≈{r.daysLeft.toFixed(0)}d left
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between">
                        <p className="text-[11px] text-ink-soft">
                          sells ~{r.rate.toFixed(1)}/day
                        </p>
                        <button
                          onClick={() => addStock(r.id, order)}
                          className="btn-press rounded-md bg-pine px-2.5 py-1 font-mono text-[11px] font-bold text-mango transition hover:bg-pine-deep"
                        >
                          order +{order}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={140}>
            <div className="rounded-xl border border-line bg-card p-5 shadow-sm">
              <h2 className="font-display text-lg font-bold">Movements</h2>
              <p className="mb-3 text-xs text-ink-soft">Every item in &amp; out, may tala</p>
              <ul className="space-y-1">
                {feed.map((m) => (
                  <li key={m.id} className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5 text-sm transition hover:bg-paper">
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${m.type === "restock" ? "bg-leaf-soft text-leaf" : "bg-cherry-soft text-cherry"}`}>
                      {m.type === "restock" ? <IconUp className="h-3.5 w-3.5" /> : <IconDown className="h-3.5 w-3.5" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs">
                      <span className="tnum font-mono font-bold" style={{ color: m.type === "restock" ? "#2f8f5b" : "#c9463d" }}>
                        {m.qty > 0 ? "+" : ""}{m.qty}
                      </span>{" "}
                      <span className="font-semibold">{m.name}</span>
                      <span className="text-ink-soft"> · {m.type === "restock" ? "delivery" : "sold"}</span>
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-ink-soft">{timeAgo(m.ts)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
