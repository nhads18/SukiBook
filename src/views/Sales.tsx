import { useMemo, useState } from "react";
import { catMeta, fmtTime, peso, peso0, startOfDay, type Payment } from "../lib/data";
import { useStore } from "../lib/store";
import { CountUp, Seg, Stepper } from "../components/ui";
import { CategoryGlyph, IconBasket, IconCheck, IconSearch, IconTrash } from "../components/Icons";

export default function SalesView() {
  const { db, t, recordSale, notify, addCustomer } = useStore();

  /* POS state */
  const [query, setQuery] = useState("");
  const [lines, setLines] = useState<Record<string, number>>({});
  const [payment, setPayment] = useState<Payment>("cash");
  const [customerId, setCustomerId] = useState("");
  const [newSuki, setNewSuki] = useState({ name: "", phone: "", open: false });
  const [stamp, setStamp] = useState<{ total: number; payment: Payment; ts: number } | null>(null);

  /* ledger filters */
  const [payFilter, setPayFilter] = useState<"all" | Payment>("all");
  const [ledgerQ, setLedgerQ] = useState("");

  const products = useMemo(() => {
    const q = query.trim().toLowerCase();
    return db.products.filter((p) => !q || p.name.toLowerCase().includes(q));
  }, [db.products, query]);

  const total = Object.entries(lines).reduce((s, [id, q]) => {
    const p = db.products.find((x) => x.id === id);
    return s + (p ? p.price * q : 0);
  }, 0);
  const itemCount = Object.values(lines).reduce((s, q) => s + q, 0);

  const today0 = startOfDay(Date.now());
  const ledger = useMemo(() => {
    const q = ledgerQ.trim().toLowerCase();
    return db.sales
      .filter((s) => s.ts >= today0)
      .filter((s) => payFilter === "all" || s.payment === payFilter)
      .filter((s) => {
        if (!q) return true;
        const cust = s.customerId ? db.customers.find((c) => c.id === s.customerId)?.name ?? "" : "";
        return s.items.some((i) => i.name.toLowerCase().includes(q)) || cust.toLowerCase().includes(q);
      });
  }, [db.sales, db.customers, payFilter, ledgerQ, today0]);

  const dayTotal = ledger.reduce((s, x) => s + x.total, 0);

  const complete = () => {
    if (itemCount === 0) return;
    if (payment === "utang" && !customerId) {
      notify("warn", "Choose a suki", "Utang sales need a customer");
      return;
    }
    const total2 = recordSale({
      lines: Object.entries(lines).map(([productId, qty]) => ({ productId, qty })),
      payment,
      customerId: payment === "utang" ? customerId : undefined,
    });
    notify("ok", "Sale recorded", peso(total2));
    setStamp({ total: total2, payment, ts: Date.now() });
    window.setTimeout(() => setStamp(null), 1150);
    setLines({});
    setPayment("cash");
    setCustomerId("");
  };

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      {/* ---------------- POS ---------------- */}
      <div className="relative lg:col-span-7">
        {stamp && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center" aria-hidden="true">
            <div className="stamp-in rounded-lg border-4 border-double border-leaf bg-card/95 px-7 py-3.5 text-center shadow-elev-3">
              <p className="font-mono text-[9px] font-extrabold uppercase tracking-[0.28em] text-leaf">Recorded · Naitala</p>
              <p className="tnum font-display text-3xl font-extrabold leading-tight text-pine">{peso0(stamp.total)}</p>
              <p className="font-mono text-[9px] font-bold uppercase tracking-wider text-ink-soft">
                {stamp.payment === "gcash" ? "GCash" : stamp.payment === "utang" ? "Utang" : "Cash"} · {fmtTime(stamp.ts)}
              </p>
            </div>
          </div>
        )}
        <div className="rounded-xl border border-line bg-card shadow-sm">
          <div className="border-b border-line p-4">
            <div className="relative">
              <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("searchPh")} className="field pl-9" />
            </div>
          </div>
          <div className="grid max-h-[380px] grid-cols-2 gap-2 overflow-y-auto p-4 sm:grid-cols-3 xl:grid-cols-4">
            {products.map((p) => (
              <button
                key={p.id}
                disabled={p.stock === 0}
                onClick={() =>
                  setLines((prev) => {
                    const cur = prev[p.id] ?? 0;
                    return cur >= p.stock ? prev : { ...prev, [p.id]: cur + 1 };
                  })
                }
                className={`btn-press relative rounded-lg border p-2.5 text-left transition ${
                  lines[p.id] ? "border-mango bg-mango-soft shadow-sm" : "border-line bg-card hover:border-pine/40 hover:bg-pine-soft/40"
                } ${p.stock === 0 ? "opacity-40" : ""}`}
              >
                {lines[p.id] && (
                  <span className="pop tnum absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-mango font-mono text-[10px] font-extrabold text-pine-deep shadow">
                    {lines[p.id]}
                  </span>
                )}
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-paper" style={{ color: catMeta(p.cat).color }}>
                  <CategoryGlyph cat={p.cat} className="h-5 w-5" />
                </span>
                <span className="mt-1.5 block truncate text-xs font-bold leading-tight">{p.name}</span>
                <span className="tnum font-mono text-[11px] text-ink-soft">
                  {peso(p.price)} · {p.stock === 0 ? "out" : `${p.stock} left`}
                </span>
              </button>
            ))}
          </div>

          {/* cart */}
          <div className="border-t border-line bg-paper/50 p-4">
            {itemCount === 0 ? (
              <p className="py-3 text-center text-sm text-ink-soft">
                <IconBasket className="mr-1.5 inline h-4 w-4" />
                Tap products to build the sale — quantities stack on repeat taps.
              </p>
            ) : (
              <div className="rise space-y-3">
                <div className="max-h-32 space-y-1.5 overflow-y-auto">
                  {Object.entries(lines).map(([id, q]) => {
                    const p = db.products.find((x) => x.id === id)!;
                    return (
                      <div key={id} className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{p.name}</span>
                        <Stepper small value={q} min={0} onChange={(v) => setLines((prev) => {
                          const n = { ...prev };
                          if (v <= 0) delete n[id];
                          else n[id] = Math.min(v, p.stock);
                          return n;
                        })} />
                        <span className="tnum w-16 text-right font-mono text-sm font-bold">{peso(p.price * q)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-2">
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
                    <div className="flex flex-wrap items-center gap-2">
                      <label htmlFor="suki-select" className="sr-only">Select suki for utang sale</label>
                      <select
                        id="suki-select"
                        value={newSuki.open ? "__new" : customerId}
                        onChange={(e) => {
                          if (e.target.value === "__new") setNewSuki((s) => ({ ...s, open: true }));
                          else {
                            setCustomerId(e.target.value);
                            setNewSuki((s) => ({ ...s, open: false }));
                          }
                        }}
                        className="field w-44 py-1.5 text-xs"
                      >
                        <option value="">— select suki —</option>
                        {db.customers.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                        <option value="__new">+ Bagong suki…</option>
                      </select>
                      {newSuki.open && (
                        <div className="rise flex items-center gap-1.5">
                          <input
                            autoFocus
                            value={newSuki.name}
                            onChange={(e) => setNewSuki((s) => ({ ...s, name: e.target.value }))}
                            placeholder="Pangalan"
                            className="field w-32 px-2 py-1.5 text-xs"
                          />
                          <input
                            value={newSuki.phone}
                            onChange={(e) => setNewSuki((s) => ({ ...s, phone: e.target.value }))}
                            placeholder="09…"
                            inputMode="tel"
                            aria-label="New suki phone number"
                            className="field w-24 px-2 py-1.5 text-xs"
                          />
                          <button
                            onClick={() => {
                              if (!newSuki.name.trim()) return;
                              const id = addCustomer(newSuki.name.trim(), newSuki.phone.trim() || "—");
                              setCustomerId(id);
                              setNewSuki({ name: "", phone: "", open: false });
                            }}
                            disabled={!newSuki.name.trim()}
                            className="btn-press rounded-md bg-pine px-2.5 py-1.5 text-xs font-extrabold text-mango transition enabled:hover:bg-pine-deep disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Save
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  <span className="tnum ml-auto font-mono text-xl font-extrabold">
                    <CountUp value={total} fmt={peso} />
                  </span>
                </div>
                <button
                  onClick={complete}
                  className="btn-press flex w-full items-center justify-center gap-2 rounded-lg bg-mango py-3 font-display text-sm font-extrabold uppercase tracking-wide text-pine-deep shadow-md transition hover:bg-mango-deep"
                >
                  <IconCheck className="h-4 w-4" /> {t("completeSale")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---------------- ledger ---------------- */}
      <div className="lg:col-span-5">
        <div className="flex h-full flex-col rounded-xl border border-line bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-4">
            <div>
              <h2 className="font-display text-lg font-bold">Today's ledger</h2>
              <p className="tnum text-xs text-ink-soft">
                {ledger.length} sales · <span className="font-mono font-bold text-pine">{peso0(dayTotal)}</span>
              </p>
            </div>
            <Seg<"all" | Payment>
              value={payFilter}
              onChange={setPayFilter}
              options={[
                { key: "all", label: "All" },
                { key: "cash", label: "Cash" },
                { key: "gcash", label: "GCash" },
                { key: "utang", label: "Utang" },
              ]}
            />
          </div>
          <div className="border-b border-line p-3">
            <input value={ledgerQ} onChange={(e) => setLedgerQ(e.target.value)} placeholder="Filter by product or suki…" className="field py-1.5 text-xs" />
          </div>
          <ul className="flex-1 divide-y divide-line overflow-y-auto">
            {ledger.map((s) => {
              const cust = s.customerId ? db.customers.find((c) => c.id === s.customerId) : undefined;
              const dot = s.payment === "cash" ? "#2f8f5b" : s.payment === "gcash" ? "#2e6fd0" : "#c9463d";
              return (
                <li key={s.id} className="group flex items-center gap-3 px-4 py-2.5 transition hover:bg-paper/70">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: dot }} title={s.payment} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {s.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}
                    </p>
                    <p className="font-mono text-[10px] text-ink-soft">
                      {fmtTime(s.ts)} · {s.payment === "gcash" ? "GCash" : s.payment}
                      {cust ? ` · ${cust.name}` : ""}
                    </p>
                  </div>
                  <span className="tnum shrink-0 font-mono text-sm font-bold">{peso(s.total)}</span>
                  <button
                    onClick={() => notify("info", "Void recorded", "Entry flagged for correction")}
                    className="btn-press shrink-0 rounded-md p-1.5 text-ink-soft opacity-0 transition hover:bg-cherry-soft hover:text-cherry group-hover:opacity-100"
                    aria-label="Flag entry"
                  >
                    <IconTrash className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
            {ledger.length === 0 && (
              <li className="px-4 py-10 text-center text-sm text-ink-soft">No sales match the filter yet.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
