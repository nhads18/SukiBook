import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  catMeta,
  dailySeries,
  fmtTime,
  lowStock,
  overdueDays,
  peso,
  peso0,
  startOfDay,
  timeAgo,
  type Payment,
} from "./lib/data";
import { useStore } from "./lib/store";
import { CountUp, Stepper } from "./components/ui";
import {
  CategoryGlyph,
  IconArrowL,
  IconBasket,
  IconBattery,
  IconBox,
  IconCheck,
  IconDash,
  IconDown,
  IconPeso,
  IconReceipt,
  IconSearch,
  IconSms,
  IconUp,
  IconUsers,
  LogoMark,
} from "./components/Icons";

type Tab = "home" | "sales" | "benta" | "suki" | "stock";

const AVATAR_TINTS = [
  "bg-mango-soft text-mango-deep",
  "bg-leaf-soft text-leaf",
  "bg-gcash-soft text-gcash",
  "bg-cherry-soft text-cherry",
  "bg-pine-soft text-pine",
];

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/* ================================================================== */
/*  The app running inside the phone — same live store as the web app  */
/* ================================================================== */

function PhoneApp() {
  const { db, settings, sync, recordSale, addStock, recordPayment, addUtang, notify } = useStore();
  const [tab, setTab] = useState<Tab>("home");
  const [clock, setClock] = useState(Date.now());
  const [tick, setTick] = useState(0);
  const [bump, setBump] = useState(0);

  useEffect(() => {
    const a = window.setInterval(() => setClock(Date.now()), 1000);
    const b = window.setInterval(() => setTick((i) => i + 1), 3200);
    return () => {
      window.clearInterval(a);
      window.clearInterval(b);
    };
  }, []);

  /* ---------- POS state ---------- */
  const [query, setQuery] = useState("");
  const [lines, setLines] = useState<Record<string, number>>({});
  const [payment, setPayment] = useState<Payment>("cash");
  const [customerId, setCustomerId] = useState("");

  /* ---------- suki state ---------- */
  const [sukiQuery, setSukiQuery] = useState("");
  const [selCust, setSelCust] = useState<string | null>(null);
  const [payAmt, setPayAmt] = useState("");

  /* ---------- derived ---------- */
  const today0 = startOfDay(clock);
  const yest0 = today0 - 86400000;

  const today = useMemo(() => {
    const list = db.sales.filter((s) => s.ts >= today0);
    const sum = (p: Payment) => list.filter((s) => s.payment === p).reduce((s, x) => s + x.total, 0);
    const collected = db.customers.reduce(
      (s, c) => s + c.history.filter((h) => h.type === "payment" && h.ts >= today0).reduce((a, h) => a + h.amount, 0),
      0,
    );
    const yest = db.sales.filter((s) => s.ts >= yest0 && s.ts < today0).reduce((s, x) => s + x.total, 0);
    return {
      total: list.reduce((s, x) => s + x.total, 0),
      count: list.length,
      items: list.reduce((s, x) => s + x.items.reduce((a, i) => a + i.qty, 0), 0),
      cash: sum("cash"),
      gcash: sum("gcash"),
      utang: sum("utang"),
      collected,
      yest,
    };
  }, [db, today0, yest0]);

  const delta = today.yest > 0 ? ((today.total - today.yest) / today.yest) * 100 : 100;
  const lows = lowStock(db);
  const hour = new Date(clock).getHours();
  const open = hour >= 5 && hour < 22;

  const spark = useMemo(() => {
    const s = dailySeries(db, 7);
    const max = Math.max(...s.map((x) => x.revenue), 1);
    return s.map((x, i) => `${(i / Math.max(s.length - 1, 1)) * 120},${34 - (x.revenue / max) * 30}`).join(" ");
  }, [db]);

  const products = useMemo(() => {
    const q = query.trim().toLowerCase();
    return db.products.filter((p) => !q || p.name.toLowerCase().includes(q)).slice(0, 14);
  }, [db.products, query]);

  const total = Object.entries(lines).reduce((s, [id, q]) => {
    const p = db.products.find((x) => x.id === id);
    return s + (p ? p.price * q : 0);
  }, 0);
  const itemCount = Object.values(lines).reduce((s, q) => s + q, 0);

  const sukis = useMemo(() => {
    const q = sukiQuery.trim().toLowerCase();
    return db.customers
      .filter((c) => !q || c.name.toLowerCase().includes(q))
      .sort((a, b) => b.balance - a.balance);
  }, [db.customers, sukiQuery]);
  const sel = db.customers.find((c) => c.id === selCust);

  const recent = db.sales.length > 0 ? db.sales[tick % db.sales.length] : undefined;
  const feed = db.movements.slice(0, 5);
  const todaysSales = useMemo(() => db.sales.filter((s) => s.ts >= today0).slice().reverse(), [db.sales, today0]);

  const addLine = (id: string) => {
    const p = db.products.find((x) => x.id === id);
    if (!p) return;
    setLines((prev) => {
      const cur = prev[id] ?? 0;
      if (cur >= p.stock) return prev;
      return { ...prev, [id]: cur + 1 };
    });
    setBump((b) => b + 1);
  };

  const done = () => {
    if (itemCount === 0) return;
    if (payment === "utang" && !customerId) {
      notify("warn", "Pumili ng suki", "Required for utang sales");
      return;
    }
    recordSale({
      lines: Object.entries(lines).map(([productId, qty]) => ({ productId, qty })),
      payment,
      customerId: payment === "utang" ? customerId : undefined,
    });
    setLines({});
    setPayment("cash");
    setCustomerId("");
    setTab("home");
  };

  const timeStr = new Date(clock).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const dateStr = new Date(clock).toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" });

  return (
    <div className="relative flex h-full flex-col bg-paper">
      {/* ---------- status bar ---------- */}
      <div className="flex items-center justify-between bg-pine-deep px-6 pb-0.5 pt-2.5 font-mono text-[10px] font-bold text-card/85">
        <span>{timeStr}</span>
        <span className="flex items-center gap-1.5">
          <span className="flex items-end gap-[2px]">
            {[3, 5, 7, 9].map((h, i) => (
              <span key={i} className={`w-[3px] rounded-sm ${i < 3 ? "bg-card/85" : "bg-card/30"}`} style={{ height: h }} />
            ))}
          </span>
          <IconBattery className="h-3.5 w-3.5" />
        </span>
      </div>

      {/* ---------- app header ---------- */}
      <div className="relative bg-pine px-4 pb-3 pt-2 text-card">
        <div className="stripes-soft absolute inset-x-0 top-0 h-[5px]" />
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(260px 120px at 90% 0%, rgba(246,168,28,0.22), transparent 65%)" }} />
        <div className="relative flex items-center gap-2.5">
          <LogoMark className="h-8 w-8" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-[15px] font-extrabold leading-tight">{settings.storeName}</p>
            <p className="font-mono text-[9px] tracking-wide text-card/55">{dateStr} · {settings.owner}</p>
          </div>
          <span className={`flex items-center gap-1.5 rounded-full px-2 py-1 text-[8px] font-extrabold uppercase tracking-widest ${open ? "bg-leaf/90 text-card" : "bg-card/10 text-card/60"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${open ? "pulse-dot bg-card" : "bg-card/40"}`} />
            {open ? "Open" : "Sarado"}
          </span>
        </div>
      </div>

      {/* ================================================================ */}
      {/*  HOME                                                            */}
      {/* ================================================================ */}
      {tab === "home" && (
        <div key="home" className="rise flex-1 space-y-3 overflow-y-auto p-3.5">
          {/* the day's number — receipt card */}
          <div className="relative overflow-hidden rounded-2xl bg-pine p-4 text-card shadow-[0_16px_36px_-14px_rgba(11,39,27,0.6)]">
            <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(240px 120px at 100% 0%, rgba(246,168,28,0.25), transparent 60%)" }} />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-[0.22em] text-mango">Benta ngayong araw</p>
                <p className="tnum mt-1 font-display text-[40px] font-extrabold leading-none tracking-tight text-mango">
                  <CountUp value={today.total} fmt={peso0} />
                </p>
                <p className={`mt-1.5 flex items-center gap-1 font-mono text-[10px] font-bold ${delta >= 0 ? "text-leaf" : "text-cherry"}`}>
                  {delta >= 0 ? <IconUp className="h-3 w-3" /> : <IconDown className="h-3 w-3" />}
                  {Math.abs(delta).toFixed(0)}% vs kahapon · {today.count} sales
                </p>
              </div>
              <svg viewBox="0 0 120 36" className="mt-1 h-10 w-24 shrink-0" preserveAspectRatio="none">
                <polyline points={`0,36 ${spark} 120,36`} fill="rgba(246,168,28,0.16)" stroke="none" />
                <polyline points={spark} fill="none" stroke="#f6a81c" strokeWidth="2" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="relative mt-3 flex divide-x divide-dashed divide-card/20 border-t border-dashed border-card/20 pt-2.5">
              {[
                ["Cash", today.cash, "#7fc79a"],
                ["GCash", today.gcash, "#8fb5ec"],
                ["Utang", today.utang, "#e39a93"],
                ["Cobrado", today.collected, "#f6a81c"],
              ].map(([l, v, c]) => (
                <div key={l as string} className="flex-1 px-2 first:pl-0">
                  <p className="flex items-center gap-1 text-[8px] font-extrabold uppercase tracking-wider text-card/50">
                    <span className="h-1 w-1 rounded-full" style={{ background: c as string }} />
                    {l}
                  </p>
                  <p className="tnum mt-0.5 font-mono text-[11px] font-bold">{peso0(v as number)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* live receipt ticker */}
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-line bg-card px-3 py-2 font-mono text-[10px] text-ink-soft">
            <span className="flex shrink-0 items-center gap-1 text-[8px] font-extrabold uppercase tracking-widest text-cherry">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-cherry" /> live
            </span>
            {recent ? (
              <p key={tick} className="ticker-fade min-w-0 flex-1 truncate">
                {fmtTime(recent.ts)} · <span className="font-bold text-ink">{peso(recent.total)}</span> ·{" "}
                {recent.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}
              </p>
            ) : (
              <p className="min-w-0 flex-1 truncate">Wala pang benta — simulan ang araw!</p>
            )}
          </div>

          {/* thumb actions */}
          <div className="grid grid-cols-5 gap-2">
            <button
              onClick={() => setTab("benta")}
              className="btn-press col-span-3 flex items-center justify-center gap-2 rounded-xl bg-mango py-4 font-display text-sm font-extrabold uppercase tracking-wide text-pine-deep shadow-lg shadow-mango/30 transition hover:bg-mango-deep"
            >
              <IconBasket className="h-5 w-5" /> Mag-benta
            </button>
            <button onClick={() => setTab("suki")} className="btn-press col-span-1 flex flex-col items-center justify-center gap-1 rounded-xl border border-line bg-card py-2.5 text-[9px] font-extrabold uppercase text-ink-soft transition hover:border-mango hover:text-mango-deep">
              <IconPeso className="h-5 w-5 text-cherry" /> Utang
            </button>
            <button onClick={() => setTab("stock")} className="btn-press col-span-1 flex flex-col items-center justify-center gap-1 rounded-xl border border-line bg-card py-2.5 text-[9px] font-extrabold uppercase text-ink-soft transition hover:border-mango hover:text-mango-deep">
              <IconBox className="h-5 w-5 text-pine" /> Stock
            </button>
          </div>

          {/* low stock rail */}
          {lows.length > 0 && (
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-cherry">
                <span className="h-1.5 w-1.5 rounded-full bg-cherry" /> Low stock · {lows.length}
              </p>
              <div className="-mx-3.5 flex gap-2 overflow-x-auto px-3.5 pb-1">
                {lows.map((p) => (
                  <button key={p.id} onClick={() => setTab("stock")} className="btn-press relative shrink-0 overflow-hidden rounded-lg border border-cherry/25 bg-card py-2 pl-3.5 pr-3 text-left shadow-sm transition hover:bg-cherry-soft/60">
                    <span className="absolute inset-y-0 left-0 w-1 bg-cherry" />
                    <p className="max-w-24 truncate text-[10px] font-bold">{p.name}</p>
                    <p className="font-mono text-[9px] font-bold text-cherry">{p.stock === 0 ? "ubos na!" : `${p.stock} left`}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* top suki */}
          <div>
            <p className="mb-1.5 text-[9px] font-extrabold uppercase tracking-widest text-ink-soft">May utang · top suki</p>
            <ul className="space-y-1.5">
              {[...db.customers].sort((a, b) => b.balance - a.balance).slice(0, 3).map((c, i) => (
                <li key={c.id} className="flex items-center gap-2.5 rounded-xl border border-line bg-card px-2.5 py-2 shadow-sm">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-[10px] font-extrabold ${AVATAR_TINTS[i % AVATAR_TINTS.length]}`}>
                    {initials(c.name)}
                  </span>
                  <button onClick={() => { setSelCust(c.id); setTab("suki"); }} className="min-w-0 flex-1 text-left">
                    <p className="truncate text-[11px] font-bold leading-tight">{c.name}</p>
                    <p className="font-mono text-[9px] font-bold text-cherry">
                      {peso0(c.balance)}
                      {overdueDays(c) > 7 && <span className="text-ink-soft"> · {overdueDays(c)}d late</span>}
                    </p>
                  </button>
                  <button
                    onClick={() => notify("ok", "SMS sent", `Paalala → ${c.phone}`)}
                    className="btn-press rounded-lg bg-pine p-2 text-mango shadow-sm transition hover:bg-pine-deep"
                    aria-label="SMS reminder"
                  >
                    <IconSms className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* activity */}
          <div className="rounded-xl border border-line bg-card p-3 shadow-sm">
            <p className="mb-2 text-[9px] font-extrabold uppercase tracking-widest text-ink-soft">Galaw ng paninda</p>
            <ul className="space-y-1.5">
              {feed.map((m) => (
                <li key={m.id} className="flex items-center gap-2 text-[10px]">
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${m.type === "restock" ? "bg-leaf-soft text-leaf" : "bg-cherry-soft text-cherry"}`}>
                    {m.type === "restock" ? <IconUp className="h-2.5 w-2.5" /> : <IconDown className="h-2.5 w-2.5" />}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-mono font-bold" style={{ color: m.type === "restock" ? "#2f8f5b" : "#c9463d" }}>
                      {m.qty > 0 ? "+" : ""}{m.qty}
                    </span>{" "}
                    <span className="font-semibold">{m.name}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[8px] text-ink-soft">{timeAgo(m.ts)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/*  SALES LEDGER                                                    */}
      {/* ================================================================ */}
      {tab === "sales" && (
        <div key="sales" className="rise flex-1 overflow-y-auto p-3.5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="font-display text-base font-extrabold leading-tight">Ledger · ngayon</p>
              <p className="font-mono text-[10px] text-ink-soft">{todaysSales.length} sales · {today.items} items</p>
            </div>
            <span className="tnum rounded-lg bg-pine px-3 py-1.5 font-mono text-sm font-extrabold text-mango shadow-sm">{peso0(today.total)}</span>
          </div>
          {todaysSales.length === 0 ? (
            <div className="mt-10 rounded-xl border border-dashed border-line bg-card p-6 text-center">
              <IconReceipt className="mx-auto h-8 w-8 text-ink-soft/50" />
              <p className="mt-2 text-xs font-bold text-ink-soft">Wala pang nakatala ngayong araw.</p>
              <button onClick={() => setTab("benta")} className="btn-press mt-3 rounded-lg bg-mango px-4 py-2 text-[11px] font-extrabold uppercase text-pine-deep transition hover:bg-mango-deep">
                Mag-rekord
              </button>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {todaysSales.map((s) => (
                <li key={s.id} className="flex items-center gap-2.5 rounded-xl border border-line bg-card px-3 py-2.5 shadow-sm">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${s.payment === "cash" ? "bg-leaf" : s.payment === "gcash" ? "bg-gcash" : "bg-cherry"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold leading-tight">
                      {s.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}
                    </p>
                    <p className="font-mono text-[9px] text-ink-soft">
                      {fmtTime(s.ts)} · {s.payment === "gcash" ? "GCash" : s.payment === "utang" ? `Utang${s.customerId ? ` · ${db.customers.find((c) => c.id === s.customerId)?.name ?? ""}` : ""}` : "Cash"}
                    </p>
                  </div>
                  <span className="tnum shrink-0 font-mono text-xs font-extrabold">{peso(s.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/*  BENTA (POS)                                                     */}
      {/* ================================================================ */}
      {tab === "benta" && (
        <div key="benta" className="rise relative flex min-h-0 flex-1 flex-col">
          <div className="p-3 pb-2">
            <div className="relative">
              <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Hanapin ang paninda…" className="field py-3 pl-9 text-sm font-semibold" />
            </div>
          </div>
          <div className="grid flex-1 grid-cols-2 content-start gap-2 overflow-y-auto px-3 pb-28">
            {products.map((p) => {
              const qty = lines[p.id] ?? 0;
              const out = p.stock === 0;
              return (
                <button
                  key={p.id}
                  disabled={out}
                  onClick={() => addLine(p.id)}
                  className={`btn-press relative overflow-hidden rounded-xl border p-3 text-left transition ${
                    qty > 0 ? "border-mango bg-mango-soft shadow-md ring-2 ring-mango/30" : "border-line bg-card shadow-sm active:bg-pine-soft"
                  } ${out ? "opacity-45" : ""}`}
                >
                  <span
                    className="pointer-events-none absolute -right-3 -top-3 opacity-[0.12]"
                    style={{ color: catMeta(p.cat).color }}
                  >
                    <CategoryGlyph cat={p.cat} className="h-14 w-14" />
                  </span>
                  {qty > 0 && (
                    <span key={bump} className="pop tnum absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-mango font-mono text-[11px] font-extrabold text-pine-deep shadow">
                      {qty}
                    </span>
                  )}
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `${catMeta(p.cat).color}1f`, color: catMeta(p.cat).color }}>
                    <CategoryGlyph cat={p.cat} className="h-5 w-5" />
                  </span>
                  <span className="mt-2 block min-h-[28px] text-[11px] font-bold leading-tight">{p.name}</span>
                  <span className="mt-1 flex items-center justify-between">
                    <span className="tnum font-mono text-xs font-extrabold">₱{p.price}</span>
                    <span className={`rounded px-1.5 py-0.5 font-mono text-[8px] font-extrabold uppercase ${out ? "bg-cherry text-card" : p.stock < 5 ? "bg-cherry-soft text-cherry" : "bg-paper text-ink-soft"}`}>
                      {out ? "ubos" : `${p.stock} left`}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* cart sheet */}
          {itemCount > 0 && (
            <div className="slide-up absolute inset-x-0 bottom-0 z-30 rounded-t-2xl border-t border-line bg-card px-3.5 pb-3 pt-2 shadow-[0_-16px_40px_-12px_rgba(11,39,27,0.3)]">
              <span className="mx-auto mb-2 block h-1 w-10 rounded-full bg-line" />
              <div className="max-h-24 space-y-1.5 overflow-y-auto">
                {Object.entries(lines).map(([id, q]) => {
                  const p = db.products.find((x) => x.id === id)!;
                  return (
                    <div key={id} className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-[11px] font-bold">{p.name}</span>
                      <Stepper small value={q} min={0} onChange={(v) => setLines((prev) => {
                        const n = { ...prev };
                        if (v <= 0) delete n[id];
                        else n[id] = v;
                        return n;
                      })} />
                      <span className="tnum w-14 text-right font-mono text-[11px] font-extrabold">{peso0(p.price * q)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2.5 flex gap-1.5">
                {(
                  [
                    ["cash", "Cash", "#2f8f5b"],
                    ["gcash", "GCash", "#2e6fd0"],
                    ["utang", "Utang", "#c9463d"],
                  ] as const
                ).map(([k, l, c]) => (
                  <button
                    key={k}
                    onClick={() => setPayment(k)}
                    className={`btn-press flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-[11px] font-extrabold uppercase transition ${
                      payment === k ? "bg-pine text-card shadow-sm" : "bg-paper text-ink-soft"
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />
                    {l}
                  </button>
                ))}
              </div>
              {payment === "utang" && (
                <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="field mt-1.5 py-2 text-xs font-semibold">
                  <option value="">— sino'ng suki? —</option>
                  {db.customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
              <button onClick={done} className="btn-press mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-mango py-3 font-display text-sm font-extrabold uppercase tracking-wide text-pine-deep shadow-lg shadow-mango/30 transition hover:bg-mango-deep">
                <IconCheck className="h-4 w-4" /> Done · {peso(total)}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/*  STOCK                                                           */}
      {/* ================================================================ */}
      {tab === "stock" && (
        <div key="stock" className="rise flex-1 space-y-2 overflow-y-auto p-3.5">
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Check stock…" className="field py-3 pl-9 text-sm font-semibold" />
          </div>
          {products.map((p) => (
            <div key={p.id} className={`rounded-xl border px-3 py-2.5 shadow-sm ${p.stock < 5 ? "border-cherry/30 bg-cherry-soft/40" : "border-line bg-card"}`}>
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: `${catMeta(p.cat).color}1f`, color: catMeta(p.cat).color }}>
                  <CategoryGlyph cat={p.cat} className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-bold leading-tight">{p.name}</p>
                  <p className="font-mono text-[9px] text-ink-soft">₱{p.price} · {p.stock === 0 ? "ubos na!" : `${p.stock} left`}</p>
                </div>
                <button onClick={() => addStock(p.id, 12)} className="btn-press shrink-0 rounded-lg bg-pine px-2.5 py-2 font-mono text-[10px] font-extrabold text-mango shadow-sm transition hover:bg-pine-deep">
                  +12
                </button>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper">
                <div
                  className="width-grow h-full rounded-full"
                  style={{
                    width: `${Math.min(100, (p.stock / 48) * 100)}%`,
                    background: p.stock === 0 ? "#c9463d" : p.stock < 5 ? "#f6a81c" : "#2f8f5b",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================================================================ */}
      {/*  SUKI                                                            */}
      {/* ================================================================ */}
      {tab === "suki" && (
        <div key="suki" className="rise relative flex-1 overflow-hidden">
          <div className="h-full space-y-2 overflow-y-auto p-3.5">
            <div className="relative">
              <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
              <input value={sukiQuery} onChange={(e) => setSukiQuery(e.target.value)} placeholder="Sino'ng may utang?" className="field py-3 pl-9 text-sm font-semibold" />
            </div>
            {sukis.map((c, i) => (
              <button key={c.id} onClick={() => { setSelCust(c.id); setPayAmt(""); }} className="btn-press flex w-full items-center gap-2.5 rounded-xl border border-line bg-card px-3 py-2.5 text-left shadow-sm transition hover:border-mango/60 hover:bg-mango-soft/40">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-[11px] font-extrabold ${AVATAR_TINTS[i % AVATAR_TINTS.length]}`}>
                  {initials(c.name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-bold leading-tight">{c.name}</span>
                  <span className="block font-mono text-[9px] text-ink-soft">{c.phone}</span>
                </span>
                {overdueDays(c) > 7 && <span className="shrink-0 rounded bg-cherry-soft px-1.5 py-0.5 font-mono text-[8px] font-extrabold uppercase text-cherry">{overdueDays(c)}d</span>}
                <span className={`tnum shrink-0 font-mono text-xs font-extrabold ${c.balance === 0 ? "text-leaf" : "text-cherry"}`}>{peso0(c.balance)}</span>
              </button>
            ))}
          </div>

          {/* detail sheet */}
          {sel && (
            <div className="absolute inset-0 z-20 flex flex-col bg-paper">
              <div className="flex items-center gap-2.5 border-b border-line bg-card px-3 py-3">
                <button onClick={() => setSelCust(null)} className="btn-press rounded-lg p-1.5 transition hover:bg-paper" aria-label="Back">
                  <IconArrowL className="h-5 w-5" />
                </button>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-pine-soft font-display text-[11px] font-extrabold text-pine">
                  {initials(sel.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-sm font-extrabold leading-tight">{sel.name}</p>
                  <p className="font-mono text-[9px] text-ink-soft">{sel.phone}</p>
                </div>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-3.5">
                <div className="relative overflow-hidden rounded-2xl bg-pine p-4 text-center text-card shadow-md">
                  <div className="stripes-soft absolute inset-x-0 top-0 h-[4px]" />
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.22em] text-mango">Kabuuang utang</p>
                  <p className="tnum mt-1 font-display text-4xl font-extrabold text-mango">
                    <CountUp value={sel.balance} fmt={peso0} />
                  </p>
                  {overdueDays(sel) > 7 && (
                    <p className="mt-1 font-mono text-[10px] font-bold text-cherry">{overdueDays(sel)} days overdue na</p>
                  )}
                </div>
                <div className="rounded-xl border border-line bg-card p-3 shadow-sm">
                  <p className="mb-2 text-[9px] font-extrabold uppercase tracking-widest text-leaf">Mabilisang bayad</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[20, 50, 100].map((a) => (
                      <button key={a} onClick={() => recordPayment(sel.id, Math.min(a, sel.balance))} className="btn-press rounded-lg bg-leaf-soft px-3.5 py-2 font-mono text-xs font-extrabold text-leaf transition hover:bg-leaf hover:text-card">
                        ₱{a}
                      </button>
                    ))}
                    {sel.balance > 0 && (
                      <button onClick={() => recordPayment(sel.id, sel.balance)} className="btn-press rounded-lg bg-leaf px-3.5 py-2 font-mono text-xs font-extrabold text-card transition hover:bg-pine">
                        lahat · {peso0(sel.balance)}
                      </button>
                    )}
                  </div>
                  <div className="mt-2 flex gap-1.5">
                    <input value={payAmt} onChange={(e) => setPayAmt(e.target.value)} type="number" placeholder="₱ amount" className="field px-2.5 py-2 text-xs font-semibold" />
                    <button onClick={() => { const a = parseFloat(payAmt); if (a > 0) { recordPayment(sel.id, a); setPayAmt(""); } }} className="btn-press rounded-lg bg-pine px-3.5 text-mango transition hover:bg-pine-deep">
                      <IconCheck className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="rounded-xl border border-line bg-card p-3 shadow-sm">
                  <p className="mb-2 text-[9px] font-extrabold uppercase tracking-widest text-cherry">Idagdag sa utang</p>
                  <QuickUtang onAdd={(a, n) => addUtang(sel.id, a, n)} />
                </div>
                <div className="rounded-xl border border-line bg-card p-3 shadow-sm">
                  <p className="mb-2 text-[9px] font-extrabold uppercase tracking-widest text-ink-soft">History</p>
                  <ul className="space-y-1.5">
                    {sel.history.slice(-6).reverse().map((h, i) => (
                      <li key={i} className="flex items-center gap-2 text-[10px]">
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${h.type === "payment" ? "bg-leaf" : "bg-cherry"}`} />
                        <span className="min-w-0 flex-1 truncate font-semibold">
                          {h.type === "payment" ? "Bayad" : h.note ?? "Utang"}
                        </span>
                        <span className="shrink-0 font-mono text-[9px] text-ink-soft">{fmtTime(h.ts)}</span>
                        <span className={`tnum shrink-0 font-mono font-extrabold ${h.type === "payment" ? "text-leaf" : "text-cherry"}`}>
                          {h.type === "payment" ? "−" : "+"}{peso0(h.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button onClick={() => notify("ok", "SMS sent", `Paalala → ${sel.phone} via Semaphore`)} className="btn-press flex w-full items-center justify-center gap-2 rounded-xl bg-pine py-3 text-xs font-extrabold uppercase tracking-wide text-mango shadow-md transition hover:bg-pine-deep">
                  <IconSms className="h-4 w-4" /> SMS paalala · one tap
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------- bottom nav with floating benta button ---------- */}
      <nav className="relative z-40 border-t border-line bg-card">
        <div className="grid grid-cols-5 items-end px-1 pb-2 pt-1.5">
          {(
            [
              ["home", "Home", <IconDash key="i" className="h-5 w-5" />],
              ["sales", "Ledger", <IconReceipt key="i" className="h-5 w-5" />],
            ] as const
          ).map(([k, l, icon]) => (
            <button key={k} onClick={() => setTab(k)} className={`relative flex flex-col items-center gap-0.5 py-1 text-[9px] font-extrabold uppercase tracking-wide transition ${tab === k ? "text-pine" : "text-ink-soft/70"}`}>
              {tab === k && <span className="stripes absolute -top-[7px] h-[3px] w-8 rounded-full" />}
              {icon}
              {l}
            </button>
          ))}
          <div className="flex justify-center">
            <button
              onClick={() => setTab("benta")}
              aria-label="Record sale"
              className={`btn-press -mt-9 flex h-16 w-16 items-center justify-center rounded-2xl border-4 border-card shadow-[0_12px_28px_-6px_rgba(217,138,11,0.65)] transition ${
                tab === "benta" ? "rotate-3 bg-pine text-mango" : "bg-mango text-pine-deep hover:bg-mango-deep"
              }`}
            >
              <IconBasket className="h-7 w-7" />
            </button>
          </div>
          {(
            [
              ["suki", "Suki", <IconUsers key="i" className="h-5 w-5" />],
              ["stock", "Stock", <IconBox key="i" className="h-5 w-5" />],
            ] as const
          ).map(([k, l, icon]) => (
            <button key={k} onClick={() => setTab(k)} className={`relative flex flex-col items-center gap-0.5 py-1 text-[9px] font-extrabold uppercase tracking-wide transition ${tab === k ? "text-pine" : "text-ink-soft/70"}`}>
              {tab === k && <span className="stripes absolute -top-[7px] h-[3px] w-8 rounded-full" />}
              {icon}
              {l}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

function QuickUtang({ onAdd }: { onAdd: (amount: number, note?: string) => void }) {
  const [amt, setAmt] = useState("");
  const [note, setNote] = useState("");
  return (
    <div className="flex gap-1.5">
      <input value={amt} onChange={(e) => setAmt(e.target.value)} type="number" placeholder="₱" className="field w-16 px-2 py-2 text-xs font-semibold" />
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="note (optional)" className="field min-w-0 flex-1 px-2 py-2 text-xs font-semibold" />
      <button
        onClick={() => {
          const a = parseFloat(amt);
          if (a > 0) {
            onAdd(a, note.trim() || undefined);
            setAmt("");
            setNote("");
          }
        }}
        className="btn-press rounded-lg bg-cherry px-3.5 text-sm font-extrabold text-card transition hover:bg-pine"
      >
        +
      </button>
    </div>
  );
}

/* ================================================================== */
/*  The scene around the phone                                         */
/* ================================================================== */

export default function MobileScene({ onSwitch }: { onSwitch: () => void }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center gap-16 overflow-hidden bg-pine-deep px-5 py-12">
      {/* ambient layers */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 520px at 82% 12%, rgba(246,168,28,0.14), transparent 60%), radial-gradient(760px 520px at 8% 88%, rgba(47,143,91,0.16), transparent 60%)",
        }}
      />
      <div className="stripes stripes-anim absolute inset-x-0 top-0 h-2" />
      <span className="spin-slow pointer-events-none absolute -right-28 -top-28 hidden select-none font-display text-[340px] font-extrabold leading-none text-card/[0.04] lg:block">₱</span>
      {[
        { l: "6%", t: "18%", d: "0s", r: "-8deg", s: "text-3xl" },
        { l: "16%", t: "72%", d: "1.4s", r: "10deg", s: "text-2xl" },
        { l: "78%", t: "78%", d: "0.7s", r: "-5deg", s: "text-4xl" },
      ].map((c, i) => (
        <span
          key={i}
          className={`float-y pointer-events-none absolute hidden select-none rounded-full border border-mango/25 px-4 py-3 font-display font-extrabold text-mango/35 lg:block ${c.s}`}
          style={{ left: c.l, top: c.t, animationDelay: c.d, "--rot": c.r } as CSSProperties}
        >
          ₱
        </span>
      ))}

      {/* copy */}
      <div className="relative hidden max-w-md lg:block">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-mango/40 bg-mango/10 px-3.5 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-mango">
          <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-mango" /> Android app · live preview
        </p>
        <h1 className="font-display text-6xl font-extrabold leading-[0.98] text-card">
          Mobile for<br />
          <span className="text-mango">action.</span>
        </h1>
        <p className="mt-5 text-sm leading-relaxed text-card/70">
          Hawak ito ni Aling Nena habang nasa counter — every tap below runs on the{" "}
          <span className="font-semibold text-card">same live data</span> as the web dashboard. Subukan: mag-rekord ng benta.
        </p>
        <ul className="mt-7 space-y-3">
          {[
            "One-tap quick sales — malalaking button, kahit nagmamadali",
            "Offline-first: naka-queue ang lahat, auto-sync pag may signal",
            "SMS utang reminders in one tap via Semaphore",
            "Utang lookup by name or phone — sagot in 2 seconds",
          ].map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-sm text-card/85">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-mango text-pine-deep">
                <IconCheck className="h-3 w-3" />
              </span>
              {b}
            </li>
          ))}
        </ul>
        <div className="mt-7 flex flex-wrap gap-2">
          {["Offline-first", "Semaphore SMS", "EN / Tagalog"].map((c) => (
            <span key={c} className="rounded-full border border-card/15 px-3 py-1 font-mono text-[10px] font-bold tracking-wide text-card/60">
              {c}
            </span>
          ))}
        </div>
        <button
          onClick={onSwitch}
          className="btn-press mt-9 inline-flex items-center gap-2 rounded-xl bg-mango px-6 py-3.5 font-display text-sm font-extrabold uppercase tracking-wide text-pine-deep shadow-[0_16px_40px_-10px_rgba(246,168,28,0.5)] transition hover:bg-mango-deep"
        >
          <IconArrowL className="h-4 w-4" /> Open the web dashboard
        </button>
        <p className="mt-3 font-mono text-[11px] text-card/45">Same login · same data · real-time sync</p>
      </div>

      {/* phone */}
      <div className="relative">
        {/* side buttons */}
        <span className="absolute -left-[13px] top-28 h-14 w-[6px] rounded-l-md bg-ink-soft/80" />
        <span className="absolute -left-[13px] top-44 h-9 w-[6px] rounded-l-md bg-ink-soft/80" />
        <span className="absolute -right-[13px] top-36 h-16 w-[6px] rounded-r-md bg-ink-soft/80" />
        <div className="relative h-[700px] w-[336px] overflow-hidden rounded-[3rem] border-[10px] border-ink bg-paper shadow-[0_50px_110px_-24px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.06)_inset] sm:w-[356px]">
          {/* punch-hole camera */}
          <div className="absolute left-1/2 top-2 z-50 flex h-[22px] w-[22px] -translate-x-1/2 items-center justify-center rounded-full bg-ink">
            <span className="h-2 w-2 rounded-full bg-ink-soft/70" />
          </div>
          {/* screen sheen */}
          <div className="screen-sheen pointer-events-none absolute inset-0 z-40" />
          <PhoneApp />
        </div>
        <p className="mt-5 flex items-center justify-center gap-2 text-center font-mono text-[11px] text-card/60">
          <span className="pulse-dot h-2 w-2 rounded-full bg-leaf" />
          live — ang bawat tap, dumadaan sa web dashboard
        </p>
        <button onClick={onSwitch} className="btn-press mx-auto mt-2.5 block rounded-lg border border-card/20 px-4 py-2 text-[11px] font-bold text-card/80 transition hover:bg-card/10 lg:hidden">
          ← Back to web dashboard
        </button>
      </div>
    </div>
  );
}
