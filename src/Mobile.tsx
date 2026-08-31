import { useEffect, useMemo, useState } from "react";
import {
  catMeta,
  fmtTime,
  lowStock,
  overdueDays,
  peso,
  peso0,
  startOfDay,
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
  IconSearch,
  IconSignal,
  IconSms,
  IconUsers,
  LogoMark,
} from "./components/Icons";

type Tab = "home" | "benta" | "stock" | "suki";

const NAV: { key: Tab; label: string; icon: (c: string) => React.ReactNode }[] = [
  { key: "home", label: "Home", icon: (c) => <IconDash className={c} /> },
  { key: "benta", label: "Benta", icon: (c) => <IconBasket className={c} /> },
  { key: "stock", label: "Stock", icon: (c) => <IconBox className={c} /> },
  { key: "suki", label: "Suki", icon: (c) => <IconUsers className={c} /> },
];

function PhoneApp() {
  const { db, settings, sync, recordSale, addStock, recordPayment, addUtang, notify } = useStore();
  const [tab, setTab] = useState<Tab>("home");
  const [clock, setClock] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setClock(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, []);

  /* shared POS state */
  const [query, setQuery] = useState("");
  const [lines, setLines] = useState<Record<string, number>>({});
  const [payment, setPayment] = useState<Payment>("cash");
  const [customerId, setCustomerId] = useState("");

  /* suki state */
  const [sukiQuery, setSukiQuery] = useState("");
  const [selCust, setSelCust] = useState<string | null>(null);
  const [payAmt, setPayAmt] = useState("");

  const today0 = startOfDay(Date.now());
  const today = useMemo(() => {
    const list = db.sales.filter((s) => s.ts >= today0);
    const collected = db.customers.reduce(
      (s, c) => s + c.history.filter((h) => h.type === "payment" && h.ts >= today0).reduce((a, h) => a + h.amount, 0),
      0,
    );
    return {
      total: list.reduce((s, x) => s + x.total, 0),
      count: list.length,
      items: list.reduce((s, x) => s + x.items.reduce((a, i) => a + i.qty, 0), 0),
      collected,
      cash: list.filter((s) => s.payment === "cash").reduce((s, x) => s + x.total, 0),
      gcash: list.filter((s) => s.payment === "gcash").reduce((s, x) => s + x.total, 0),
    };
  }, [db, today0]);

  const lows = lowStock(db);
  const products = useMemo(() => {
    const q = query.trim().toLowerCase();
    return db.products.filter((p) => !q || p.name.toLowerCase().includes(q)).slice(0, 12);
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
  };

  return (
    <div className="relative flex h-full flex-col bg-paper">
      {/* status bar */}
      <div className="flex items-center justify-between bg-pine px-5 pb-1 pt-2 font-mono text-[10px] text-card/80">
        <span>{fmtTime(clock).replace(/:00/, "")}</span>
        <span className="flex items-center gap-1.5">
          <IconSignal className="h-3 w-3" />
          <IconBattery className="h-3.5 w-3.5" />
        </span>
      </div>

      {/* app header */}
      <div className="flex items-center gap-2.5 bg-pine px-4 pb-3 pt-1.5 text-card">
        <LogoMark className="h-7 w-7" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-extrabold leading-tight">{settings.storeName}</p>
          <p className="text-[10px] text-card/60">SukiBook · {settings.owner}</p>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-card/10 px-2 py-1 text-[9px] font-bold uppercase">
          <span className={`h-1.5 w-1.5 rounded-full ${sync.status === "syncing" ? "pulse-dot bg-mango" : "bg-leaf"}`} />
          {sync.status === "syncing" ? "sync" : "live"}
        </span>
      </div>

      {/* ---------------- HOME ---------------- */}
      {tab === "home" && (
        <div className="flex-1 space-y-3 overflow-y-auto p-3.5">
          <div className="rounded-xl bg-pine p-4 text-card shadow-md">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-mango">Benta ngayong araw</p>
            <p className="mt-1 font-mono text-3xl font-bold text-mango">
              <CountUp value={today.total} fmt={peso0} />
            </p>
            <p className="mt-1 text-[11px] text-card/70">
              {today.count} sales · {today.items} items
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              ["Cash", today.cash, "#2f8f5b"],
              ["GCash", today.gcash, "#2e6fd0"],
              ["Cobrado", today.collected, "#c9463d"],
            ].map(([l, v, c]) => (
              <div key={l as string} className="rounded-lg border border-line bg-card p-2.5">
                <p className="flex items-center gap-1 text-[9px] font-bold uppercase text-ink-soft">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: c as string }} /> {l}
                </p>
                <p className="tnum mt-0.5 font-mono text-sm font-bold">{peso0(v as number)}</p>
              </div>
            ))}
          </div>

          <button
            onClick={() => setTab("benta")}
            className="btn-press flex w-full items-center justify-center gap-2 rounded-xl bg-mango py-3.5 font-display text-sm font-extrabold uppercase tracking-wide text-pine-deep shadow-lg shadow-mango/30 transition hover:bg-mango-deep"
          >
            <IconBasket className="h-5 w-5" /> Mag-rekord ng benta
          </button>

          {lows.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-cherry">Low stock · {lows.length}</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {lows.map((p) => (
                  <button key={p.id} onClick={() => setTab("stock")} className="btn-press shrink-0 rounded-lg border border-cherry/30 bg-cherry-soft/60 px-3 py-2 text-left transition hover:bg-cherry-soft">
                    <p className="max-w-28 truncate text-[11px] font-bold">{p.name}</p>
                    <p className="font-mono text-[10px] font-bold text-cherry">{p.stock} left</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-ink-soft">May utang · top suki</p>
            <ul className="space-y-1.5">
              {[...db.customers].sort((a, b) => b.balance - a.balance).slice(0, 3).map((c) => (
                <li key={c.id} className="flex items-center gap-2.5 rounded-lg border border-line bg-card px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold">{c.name}</p>
                    <p className="font-mono text-[10px] text-cherry">{peso0(c.balance)}{overdueDays(c) > 7 ? ` · ${overdueDays(c)}d overdue` : ""}</p>
                  </div>
                  <button
                    onClick={() => notify("ok", "SMS sent", `Paalala → ${c.phone}`)}
                    className="btn-press rounded-md bg-pine p-1.5 text-mango transition hover:bg-pine-deep"
                    aria-label="SMS reminder"
                  >
                    <IconSms className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ---------------- BENTA ---------------- */}
      {tab === "benta" && (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="p-3 pb-2">
            <div className="relative">
              <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Hanapin ang produkto…" className="field py-2.5 pl-9 text-sm" />
            </div>
          </div>
          <div className="grid flex-1 grid-cols-2 content-start gap-2 overflow-y-auto px-3 pb-3">
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
                className={`btn-press relative rounded-xl border p-2.5 text-left transition ${
                  lines[p.id] ? "border-mango bg-mango-soft shadow-sm" : "border-line bg-card active:bg-pine-soft"
                } ${p.stock === 0 ? "opacity-40" : ""}`}
              >
                {lines[p.id] && (
                  <span className="tnum absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-mango font-mono text-[10px] font-extrabold text-pine-deep shadow">
                    {lines[p.id]}
                  </span>
                )}
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-paper" style={{ color: catMeta(p.cat).color }}>
                  <CategoryGlyph cat={p.cat} className="h-5 w-5" />
                </span>
                <span className="mt-1.5 block truncate text-[11px] font-bold leading-tight">{p.name}</span>
                <span className="tnum font-mono text-[11px] text-ink-soft">₱{p.price} · {p.stock} left</span>
              </button>
            ))}
          </div>
          {itemCount > 0 && (
            <div className="rise space-y-2 border-t border-line bg-card p-3">
              <div className="max-h-20 space-y-1 overflow-y-auto">
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
                      <span className="tnum w-12 text-right font-mono text-[11px] font-bold">{peso0(p.price * q)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-1.5">
                {(["cash", "gcash", "utang"] as Payment[]).map((p) => (
                  <button key={p} onClick={() => setPayment(p)} className={`btn-press flex-1 rounded-lg py-1.5 text-[11px] font-extrabold uppercase transition ${payment === p ? "bg-pine text-mango" : "bg-paper text-ink-soft"}`}>
                    {p === "gcash" ? "GCash" : p}
                  </button>
                ))}
              </div>
              {payment === "utang" && (
                <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="field py-1.5 text-xs">
                  <option value="">— suki? —</option>
                  {db.customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
              <button onClick={done} className="btn-press flex w-full items-center justify-center gap-2 rounded-xl bg-mango py-2.5 font-display text-sm font-extrabold text-pine-deep transition hover:bg-mango-deep">
                <IconCheck className="h-4 w-4" /> DONE · {peso(total)}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ---------------- STOCK ---------------- */}
      {tab === "stock" && (
        <div className="flex-1 space-y-2 overflow-y-auto p-3.5">
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Check stock…" className="field py-2.5 pl-9 text-sm" />
          </div>
          {products.map((p) => (
            <div key={p.id} className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 ${p.stock < 5 ? "border-cherry/30 bg-cherry-soft/50" : "border-line bg-card"}`}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-paper" style={{ color: catMeta(p.cat).color }}>
                <CategoryGlyph cat={p.cat} className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold">{p.name}</p>
                <p className="font-mono text-[10px] text-ink-soft">₱{p.price} · {p.stock === 0 ? "ubos na!" : `${p.stock} left`}</p>
              </div>
              <span className={`tnum rounded-md px-2 py-1 font-mono text-xs font-extrabold ${p.stock === 0 ? "bg-cherry text-card" : p.stock < 5 ? "bg-cherry-soft text-cherry" : "bg-leaf-soft text-leaf"}`}>
                {p.stock}
              </span>
              <button onClick={() => addStock(p.id, 12)} className="btn-press rounded-md bg-pine px-2 py-1.5 font-mono text-[10px] font-bold text-mango transition hover:bg-pine-deep">
                +12
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ---------------- SUKI ---------------- */}
      {tab === "suki" && (
        <div className="relative flex-1 overflow-hidden">
          <div className="h-full space-y-2 overflow-y-auto p-3.5">
            <div className="relative">
              <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
              <input value={sukiQuery} onChange={(e) => setSukiQuery(e.target.value)} placeholder="Sino'ng may utang?" className="field py-2.5 pl-9 text-sm" />
            </div>
            {sukis.map((c) => (
              <button key={c.id} onClick={() => { setSelCust(c.id); setPayAmt(""); }} className="btn-press flex w-full items-center gap-2.5 rounded-xl border border-line bg-card px-3 py-2.5 text-left transition hover:bg-pine-soft/60">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold">{c.name}</p>
                  <p className="font-mono text-[10px] text-ink-soft">{c.phone}</p>
                </div>
                <span className={`tnum font-mono text-sm font-extrabold ${c.balance === 0 ? "text-leaf" : "text-cherry"}`}>{peso0(c.balance)}</span>
              </button>
            ))}
          </div>

          {sel && (
            <div className="rise absolute inset-0 z-20 flex flex-col bg-paper">
              <div className="flex items-center gap-2 border-b border-line bg-card px-3 py-2.5">
                <button onClick={() => setSelCust(null)} className="btn-press rounded-md p-1.5 transition hover:bg-paper" aria-label="Back">
                  <IconArrowL className="h-5 w-5" />
                </button>
                <p className="truncate font-display text-sm font-extrabold">{sel.name}</p>
                <span className="ml-auto font-mono text-[10px] text-ink-soft">{sel.phone}</span>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-3.5">
                <div className="rounded-xl bg-pine p-4 text-center text-card">
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-mango">Kabuuang utang</p>
                  <p className="mt-1 font-mono text-3xl font-bold text-mango"><CountUp value={sel.balance} fmt={peso0} /></p>
                </div>
                <div className="rounded-xl border border-line bg-card p-3">
                  <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-leaf">Mabilisang bayad</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[20, 50, 100].map((a) => (
                      <button key={a} onClick={() => recordPayment(sel.id, Math.min(a, sel.balance))} className="btn-press rounded-lg bg-leaf-soft px-3 py-2 font-mono text-xs font-bold text-leaf transition hover:bg-leaf hover:text-card">
                        ₱{a}
                      </button>
                    ))}
                    {sel.balance > 0 && (
                      <button onClick={() => recordPayment(sel.id, sel.balance)} className="btn-press rounded-lg bg-leaf px-3 py-2 font-mono text-xs font-bold text-card transition hover:bg-pine">
                        lahat · {peso0(sel.balance)}
                      </button>
                    )}
                  </div>
                  <div className="mt-2 flex gap-1.5">
                    <input value={payAmt} onChange={(e) => setPayAmt(e.target.value)} type="number" placeholder="₱ amount" className="field px-2.5 py-1.5 text-xs" />
                    <button onClick={() => { const a = parseFloat(payAmt); if (a > 0) { recordPayment(sel.id, a); setPayAmt(""); } }} className="btn-press rounded-md bg-pine px-3 text-mango transition hover:bg-pine-deep">
                      <IconCheck className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="rounded-xl border border-line bg-card p-3">
                  <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-cherry">Idagdag sa utang</p>
                  <QuickUtang cid={sel.id} onAdd={(a, n) => addUtang(sel.id, a, n)} />
                </div>
                <button onClick={() => notify("ok", "SMS sent", `Paalala → ${sel.phone} via Semaphore`)} className="btn-press flex w-full items-center justify-center gap-2 rounded-xl bg-pine py-3 text-xs font-extrabold uppercase tracking-wide text-mango transition hover:bg-pine-deep">
                  <IconSms className="h-4 w-4" /> SMS paalala · one tap
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* bottom nav */}
      <nav className="grid grid-cols-4 border-t border-line bg-card">
        {NAV.map((n) => (
          <button key={n.key} onClick={() => setTab(n.key)} className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-bold transition ${tab === n.key ? "text-pine" : "text-ink-soft"}`}>
            {tab === n.key && <span className="absolute top-0 h-0.5 w-9 rounded-full bg-mango" />}
            {n.icon("h-5 w-5")}
            {n.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function QuickUtang({ cid, onAdd }: { cid: string; onAdd: (amount: number, note?: string) => void }) {
  const [amt, setAmt] = useState("");
  const [note, setNote] = useState("");
  void cid;
  return (
    <div className="flex gap-1.5">
      <input value={amt} onChange={(e) => setAmt(e.target.value)} type="number" placeholder="₱" className="field w-16 px-2 py-1.5 text-xs" />
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="note" className="field flex-1 px-2 py-1.5 text-xs" />
      <button
        onClick={() => {
          const a = parseFloat(amt);
          if (a > 0) {
            onAdd(a, note.trim() || undefined);
            setAmt("");
            setNote("");
          }
        }}
        className="btn-press rounded-md bg-cherry px-3 text-xs font-extrabold text-card transition hover:bg-pine"
      >
        +
      </button>
    </div>
  );
}

export default function MobileScene({ onSwitch }: { onSwitch: () => void }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center gap-14 overflow-hidden bg-pine-deep px-5 py-10">
      {/* ambient background */}
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(900px 500px at 80% 15%, rgba(246,168,28,0.12), transparent 60%), radial-gradient(700px 500px at 10% 85%, rgba(47,143,91,0.14), transparent 60%)" }} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-2 stripes-anim stripes" />
      <div className="pointer-events-none absolute -left-24 top-1/3 hidden rotate-6 rounded-2xl border border-card/10 p-4 font-display text-6xl font-extrabold text-card/[0.05] lg:block">₱</div>

      {/* copy */}
      <div className="relative hidden max-w-md lg:block">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-mango/40 bg-mango/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-mango">
          Android app · live preview
        </p>
        <h1 className="font-display text-5xl font-extrabold leading-[1.05] text-card">
          Mobile for <span className="text-mango">action.</span>
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-card/70">
          Ito ang app na hawak ni Aling Nena habang nasa counter — every tap below runs on the{" "}
          <span className="font-semibold text-card">same live data</span> as the web dashboard. Try recording a sale.
        </p>
        <ul className="mt-6 space-y-3">
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
        <button
          onClick={onSwitch}
          className="btn-press mt-8 inline-flex items-center gap-2 rounded-lg bg-mango px-5 py-3 font-display text-sm font-extrabold uppercase tracking-wide text-pine-deep shadow-lg shadow-mango/20 transition hover:bg-mango-deep"
        >
          <IconArrowL className="h-4 w-4" /> Open the web dashboard
        </button>
        <p className="mt-3 font-mono text-[11px] text-card/50">Same login · same data · real-time sync</p>
      </div>

      {/* phone */}
      <div className="relative">
        <div className="relative h-[680px] w-[330px] overflow-hidden rounded-[2.7rem] border-[9px] border-ink bg-paper shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)] sm:w-[350px]">
          <div className="absolute left-1/2 top-1.5 z-40 h-[20px] w-24 -translate-x-1/2 rounded-full bg-ink" />
          <PhoneApp />
        </div>
        <p className="mt-4 flex items-center justify-center gap-2 text-center font-mono text-[11px] text-card/60">
          <span className="pulse-dot h-2 w-2 rounded-full bg-leaf" />
          live — ang bawat tap, dumadaan sa web dashboard
        </p>
        <button onClick={onSwitch} className="btn-press mx-auto mt-2 block rounded-md border border-card/20 px-3 py-1.5 text-[11px] font-bold text-card/80 transition hover:bg-card/10 lg:hidden">
          ← Back to web dashboard
        </button>
      </div>
    </div>
  );
}
