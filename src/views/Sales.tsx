import { useMemo, useState } from "react";
import { catMeta, fmtTime, peso, peso0, startOfDay, type Payment } from "../lib/data";
import { useStore } from "../lib/store";
import { PayBadge, Reveal, Seg, Stepper, TwoStepDelete } from "../components/ui";
import { CategoryGlyph, IconCheck, IconReceipt, IconSearch, IconX } from "../components/Icons";

const DAY = 86400000;

type TimeBucket = "all" | "am" | "noon" | "pm" | "eve";
const bucket = (ts: number): TimeBucket => {
  const h = new Date(ts).getHours();
  if (h < 11) return "am";
  if (h < 14) return "noon";
  if (h < 18) return "pm";
  return "eve";
};

export default function SalesView() {
  const { db, t, recordSale, deleteSale } = useStore();

  /* ---------- POS state ---------- */
  const [lines, setLines] = useState<Record<string, number>>({});
  const [query, setQuery] = useState("");
  const [payment, setPayment] = useState<Payment>("cash");
  const [customerId, setCustomerId] = useState("");

  /* ---------- ledger state ---------- */
  const [dayTab, setDayTab] = useState<"today" | "yesterday">("today");
  const [listQuery, setListQuery] = useState("");
  const [payFilter, setPayFilter] = useState<"all" | Payment>("all");
  const [timeFilter, setTimeFilter] = useState<TimeBucket>("all");

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return db.products
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .slice(0, q ? 8 : 10);
  }, [db.products, query]);

  const addLine = (id: string) =>
    setLines((prev) => {
      const p = db.products.find((x) => x.id === id);
      if (!p) return prev;
      const cur = prev[id] ?? 0;
      if (cur >= p.stock) return prev;
      return { ...prev, [id]: cur + 1 };
    });

  const total = useMemo(
    () =>
      Object.entries(lines).reduce((s, [id, qty]) => {
        const p = db.products.find((x) => x.id === id);
        return s + (p ? p.price * qty : 0);
      }, 0),
    [lines, db.products],
  );
  const itemCount = Object.values(lines).reduce((s, q) => s + q, 0);
  const canComplete = itemCount > 0 && (payment !== "utang" || customerId !== "");

  const complete = () => {
    if (!canComplete) return;
    recordSale({
      lines: Object.entries(lines).map(([productId, qty]) => ({ productId, qty })),
      payment,
      customerId: payment === "utang" ? customerId : undefined,
    });
    setLines({});
    setPayment("cash");
    setCustomerId("");
  };

  /* ---------- ledger ---------- */
  const today0 = startOfDay(Date.now());
  const from = dayTab === "today" ? today0 : today0 - DAY;
  const to = dayTab === "today" ? Date.now() + DAY : today0;

  const list = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    return db.sales.filter((s) => {
      if (s.ts < from || s.ts >= to) return false;
      if (payFilter !== "all" && s.payment !== payFilter) return false;
      if (timeFilter !== "all" && bucket(s.ts) !== timeFilter) return false;
      if (q) {
        const cust = s.customerId ? db.customers.find((c) => c.id === s.customerId)?.name ?? "" : "";
        if (!s.items.some((i) => i.name.toLowerCase().includes(q)) && !cust.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [db, from, to, payFilter, timeFilter, listQuery]);

  const listTotal = list.reduce((s, x) => s + x.total, 0);

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      {/* ------------ POS panel ------------ */}
      <Reveal className="lg:col-span-5">
        <div className="sticky top-24 rounded-xl border border-line bg-card shadow-sm">
          <div className="border-b border-line px-5 py-4">
            <h2 className="font-display text-lg font-bold">{t("recordSale")}</h2>
            <p className="text-xs text-ink-soft">Pick items, choose payment, done — parang sa counter.</p>
          </div>

          <div className="p-4">
            <div className="relative mb-3">
              <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchPh")}
                className="field pl-9"
              />
            </div>

            <div className="mb-3 grid max-h-56 grid-cols-2 gap-2 overflow-y-auto pr-1">
              {matches.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addLine(p.id)}
                  disabled={p.stock === 0}
                  className={`btn-press flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition ${
                    lines[p.id]
                      ? "border-mango bg-mango-soft"
                      : "border-line bg-card hover:border-pine hover:bg-pine-soft/60"
                  } ${p.stock === 0 ? "cursor-not-allowed opacity-40" : ""}`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-paper" style={{ color: catMeta(p.cat).color }}>
                    <CategoryGlyph cat={p.cat} className="h-4.5 w-4.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold leading-tight">{p.name}</span>
                    <span className="tnum font-mono text-[11px] text-ink-soft">
                      {peso(p.price)}
                      {lines[p.id] ? ` · ×${lines[p.id]}` : ""}
                    </span>
                  </span>
                </button>
              ))}
            </div>

            {/* cart */}
            {itemCount > 0 && (
              <div className="rise mb-3 space-y-2 rounded-lg border border-dashed border-line bg-paper/70 p-3">
                {Object.entries(lines).map(([id, qty]) => {
                  const p = db.products.find((x) => x.id === id)!;
                  return (
                    <div key={id} className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{p.name}</span>
                      <Stepper small value={qty} min={0} onChange={(v) =>
                        setLines((prev) => {
                          const n = { ...prev };
                          if (v <= 0) delete n[id];
                          else n[id] = Math.min(v, p.stock);
                          return n;
                        })
                      } />
                      <span className="tnum w-14 text-right font-mono text-sm font-bold">{peso0(p.price * qty)}</span>
                      <button onClick={() => setLines((prev) => { const n = { ...prev }; delete n[id]; return n; })} className="text-ink-soft transition hover:text-cherry" aria-label="Remove">
                        <IconX className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Seg<Payment>
                value={payment}
                onChange={setPayment}
                options={[
                  { key: "cash", label: "Cash" },
                  { key: "gcash", label: "GCash" },
                  { key: "utang", label: "Utang" },
                ]}
              />
              {payment === "utang" && (
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="field w-auto min-w-40 py-1.5 text-xs"
                >
                  <option value="">— piliin ang suki —</option>
                  {db.customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({peso0(c.balance)})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-line pt-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">Total</p>
                <p className="tnum font-mono text-2xl font-bold text-pine">{peso(total)}</p>
              </div>
              <button
                onClick={complete}
                disabled={!canComplete}
                className={`btn-press inline-flex items-center gap-2 rounded-lg px-5 py-3 font-display text-sm font-extrabold uppercase tracking-wide transition ${
                  canComplete
                    ? "bg-mango text-pine-deep shadow-md shadow-mango/40 hover:bg-mango-deep"
                    : "cursor-not-allowed bg-paper text-ink-soft"
                }`}
              >
                <IconCheck className="h-4 w-4" /> {t("completeSale")}
              </button>
            </div>
            {payment === "utang" && !customerId && itemCount > 0 && (
              <p className="mt-2 text-[11px] font-semibold text-cherry">Pumili ng suki para sa utang entry.</p>
            )}
          </div>
        </div>
      </Reveal>

      {/* ------------ ledger ------------ */}
      <Reveal delay={90} className="lg:col-span-7">
        <div className="rounded-xl border border-line bg-card shadow-sm">
          <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
            <h2 className="font-display text-lg font-bold">Ledger</h2>
            <Seg
              value={dayTab}
              onChange={setDayTab}
              options={[
                { key: "today" as const, label: t("today") },
                { key: "yesterday" as const, label: t("yesterday") },
              ]}
            />
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value as TimeBucket)} className="field w-auto py-1.5 text-xs">
                <option value="all">All hours</option>
                <option value="am">6–11 AM</option>
                <option value="noon">11 AM–2 PM</option>
                <option value="pm">2–6 PM</option>
                <option value="eve">6 PM onwards</option>
              </select>
              {(["all", "cash", "gcash", "utang"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPayFilter(p)}
                  className={`btn-press rounded-full px-3 py-1 text-[11px] font-bold transition ${
                    payFilter === p ? "bg-pine text-mango" : "bg-paper text-ink-soft hover:bg-pine-soft"
                  }`}
                >
                  {p === "all" ? "All" : p === "gcash" ? "GCash" : p[0].toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="px-5 py-3">
            <div className="relative">
              <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
              <input
                value={listQuery}
                onChange={(e) => setListQuery(e.target.value)}
                placeholder="Filter by item or suki…"
                className="field pl-9"
              />
            </div>
          </div>

          <ul className="max-h-[540px] divide-y divide-line overflow-y-auto">
            {list.length === 0 && (
              <li className="flex flex-col items-center gap-2 px-5 py-14 text-center">
                <IconReceipt className="h-8 w-8 text-ink-soft/50" />
                <p className="text-sm font-semibold text-ink-soft">Walang tala dito — no entries match.</p>
                <p className="text-xs text-ink-soft">Try clearing the filters or record a new sale.</p>
              </li>
            )}
            {list.map((s) => (
              <li key={s.id} className="grid grid-cols-[58px_1fr_auto] items-center gap-3 px-5 py-2.5 transition hover:bg-paper/70 sm:grid-cols-[58px_1fr_auto_auto_auto]">
                <span className="tnum font-mono text-xs text-ink-soft">{fmtTime(s.ts)}</span>
                <span className="min-w-0 truncate text-sm">
                  <span className="font-semibold">{s.items[0]?.name}</span>
                  {s.items[0] && s.items[0].qty > 1 && <span className="font-mono text-xs text-ink-soft"> ×{s.items[0].qty}</span>}
                  {s.items.length > 1 && <span className="text-xs text-ink-soft"> +{s.items.length - 1} more</span>}
                  {s.customerId && (
                    <span className="ml-1.5 text-xs text-cherry">
                      · {db.customers.find((c) => c.id === s.customerId)?.name}
                    </span>
                  )}
                </span>
                <PayBadge p={s.payment} size="sm" />
                <span className="tnum hidden font-mono text-sm font-bold sm:block">{peso(s.total)}</span>
                <TwoStepDelete onConfirm={() => deleteSale(s.id)} />
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between border-t border-line px-5 py-3 text-sm">
            <span className="text-ink-soft">
              <span className="tnum font-mono font-bold text-ink">{list.length}</span> entries
            </span>
            <span className="tnum font-mono font-bold text-pine">{peso(listTotal)}</span>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
