import { useMemo, useState } from "react";
import { downloadCSV, fmtDay, fmtTime, overdueDays, peso0, type Customer } from "../lib/data";
import { useStore } from "../lib/store";
import { CountUp, Reveal, Seg } from "../components/ui";
import { IconCheck, IconClock, IconPlus, IconSearch, IconSms, IconUsers, IconX } from "../components/Icons";

export default function UtangView() {
  const { db, t, recordPayment, addUtang, addCustomer, notify } = useStore();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"balance" | "overdue">("balance");
  const [selId, setSelId] = useState<string | null>(null);
  const [payAmt, setPayAmt] = useState("");
  const [newCust, setNewCust] = useState({ name: "", phone: "" });
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const quickAdd = () => {
    if (!newCust.name.trim()) return;
    const id = addCustomer(newCust.name.trim(), newCust.phone.trim() || "—");
    setNewCust({ name: "", phone: "" });
    setJustAdded(id);
    setSelId(id);
    window.setTimeout(() => setJustAdded(null), 2200);
  };

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = db.customers.filter((c) => !q || c.name.toLowerCase().includes(q) || c.phone.includes(q));
    return [...filtered].sort((a, b) =>
      sort === "overdue" ? overdueDays(b) - overdueDays(a) || b.balance - a.balance : b.balance - a.balance,
    );
  }, [db.customers, query, sort]);

  const sel = db.customers.find((c) => c.id === selId) ?? null;
  const outstanding = db.customers.reduce((s, c) => s + c.balance, 0);
  const overdueCount = db.customers.filter((c) => overdueDays(c) > 7).length;

  const exportCsv = () =>
    downloadCSV("sukibook-utang.csv", [
      ["Customer", "Phone", "Balance", "Days overdue"],
      ...list.map((c) => [c.name, c.phone, c.balance, overdueDays(c)]),
    ]);

  const sendSms = (c: Customer) =>
    notify("ok", "SMS sent", `Paalala → ${c.phone} via Semaphore`);

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      {/* list */}
      <div className="lg:col-span-5">
        <Reveal>
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Hanapin ang suki…" className="field pl-9" />
          </div>
        </Reveal>

        {/* quick-add: walang modal — type, Enter, tapos */}
        <Reveal delay={40}>
          <div className="mt-3 overflow-hidden rounded-xl border border-pine/25 bg-card shadow-sm">
            <div className="stripes-soft h-1" />
            <div className="flex flex-wrap items-center gap-2 p-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-pine text-mango" title="Bagong suki">
                <IconUsers className="h-[18px] w-[18px]" />
              </span>
              <input
                value={newCust.name}
                onChange={(e) => setNewCust({ ...newCust, name: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && quickAdd()}
                placeholder="Bagong suki — pangalan…"
                className="field min-w-32 flex-1 px-3 py-2 text-sm"
              />
              <input
                value={newCust.phone}
                onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && quickAdd()}
                placeholder="09…"
                className="field w-28 px-3 py-2 text-sm"
              />
              <button
                onClick={quickAdd}
                disabled={!newCust.name.trim()}
                className="btn-press inline-flex items-center gap-1.5 rounded-lg bg-mango px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-pine-deep transition enabled:hover:bg-mango-deep disabled:cursor-not-allowed disabled:opacity-50"
              >
                <IconPlus className="h-3.5 w-3.5" /> Suki
              </button>
            </div>
            <p className="border-t border-dashed border-line px-3 py-1.5 font-mono text-[10px] text-ink-soft">
              Enter lang — naka-save agad, pwede nang i-utang
            </p>
          </div>
        </Reveal>

        <Reveal delay={60}>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Seg<"balance" | "overdue">
              value={sort}
              onChange={setSort}
              options={[
                { key: "balance", label: "By balance" },
                { key: "overdue", label: "By overdue" },
              ]}
            />
            <span className="tnum font-mono text-xs text-ink-soft">
              {t("outstanding")}: <span className="font-bold text-cherry">{peso0(outstanding)}</span>
              {overdueCount > 0 && <span className="ml-2 rounded bg-cherry px-1.5 py-0.5 text-[10px] font-bold text-cherry-soft">{overdueCount} overdue</span>}
            </span>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <ul className="mt-4 space-y-2">
            {list.map((c) => {
              const od = overdueDays(c);
              return (
                <li key={c.id}>
                  <button
                    onClick={() => setSelId(c.id)}
                    className={`btn-press flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                      justAdded === c.id
                        ? "pop border-mango bg-mango-soft/70 ring-2 ring-mango/50"
                        : selId === c.id
                          ? "border-pine bg-pine text-card"
                          : od > 7
                            ? "border-cherry/40 bg-cherry-soft/40"
                            : "border-line bg-card"
                    }`}
                  >
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-xs font-extrabold ${selId === c.id ? "bg-mango text-pine-deep" : "bg-pine-soft text-pine"}`}>
                      {c.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-sm font-bold ${justAdded === c.id ? "text-ink" : ""}`}>{c.name}</span>
                      <span className={`block font-mono text-[11px] ${selId === c.id && justAdded !== c.id ? "text-card/60" : "text-ink-soft"}`}>{c.phone}</span>
                    </span>
                    <span className="text-right">
                      <span className={`tnum block font-mono text-sm font-extrabold ${c.balance === 0 ? (selId === c.id && justAdded !== c.id ? "text-leaf-soft" : "text-leaf") : selId === c.id && justAdded !== c.id ? "text-mango" : "text-cherry"}`}>
                        {peso0(c.balance)}
                      </span>
                      {od > 7 && (
                        <span className={`flex items-center justify-end gap-1 font-mono text-[10px] font-bold ${selId === c.id ? "text-mango" : "text-cherry"}`}>
                          <IconClock className="h-3 w-3" /> {od}d
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
            {list.length === 0 && (
              <li className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-soft">
                <IconUsers className="mx-auto mb-2 h-6 w-6 opacity-50" />
                Walang nahanap na suki.
              </li>
            )}
          </ul>
        </Reveal>
      </div>

      {/* detail */}
      <div className="lg:col-span-7">
        {sel ? (
          <div key={sel.id} className="rise rounded-xl border border-line bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
              <div>
                <h2 className="font-display text-xl font-extrabold">{sel.name}</h2>
                <p className="font-mono text-xs text-ink-soft">{sel.phone}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => sendSms(sel)}
                  className="btn-press inline-flex items-center gap-2 rounded-lg bg-pine px-3.5 py-2 text-xs font-extrabold uppercase tracking-wide text-mango transition hover:bg-pine-deep"
                >
                  <IconSms className="h-4 w-4" /> {t("sendReminder")}
                </button>
                <button onClick={() => setSelId(null)} className="btn-press rounded-lg border border-line p-2 text-ink-soft transition hover:bg-paper lg:hidden" aria-label="Close">
                  <IconX className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-2">
              {/* balance + pay */}
              <div className="rounded-xl bg-pine p-5 text-card">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-mango">{t("outstanding")}</p>
                <p className="mt-1 font-mono text-4xl font-bold text-mango">
                  <CountUp value={sel.balance} fmt={peso0} />
                </p>
                {overdueDays(sel) > 7 && (
                  <p className="mt-1 font-mono text-[11px] text-mango/80">{overdueDays(sel)} days since last entry</p>
                )}
                <div className="mt-4 border-t border-dashed border-card/25 pt-3.5">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-card/60">{t("recordPayment")}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[20, 50, 100].map((a) => (
                      <button key={a} onClick={() => recordPayment(sel.id, Math.min(a, sel.balance))} className="btn-press rounded-md bg-card/10 px-3 py-1.5 font-mono text-xs font-bold transition hover:bg-mango hover:text-pine-deep">
                        ₱{a}
                      </button>
                    ))}
                    {sel.balance > 0 && (
                      <button onClick={() => recordPayment(sel.id, sel.balance)} className="btn-press rounded-md bg-mango px-3 py-1.5 font-mono text-xs font-extrabold text-pine-deep transition hover:bg-mango-deep">
                        lahat
                      </button>
                    )}
                  </div>
                  <div className="mt-2 flex gap-1.5">
                    <input value={payAmt} onChange={(e) => setPayAmt(e.target.value)} type="number" placeholder="₱ amount" className="field border-card/20 bg-card/10 px-2.5 py-1.5 text-xs text-card placeholder:text-card/50" />
                    <button
                      onClick={() => {
                        const a = parseFloat(payAmt);
                        if (a > 0) {
                          recordPayment(sel.id, a);
                          setPayAmt("");
                        }
                      }}
                      className="btn-press rounded-md bg-leaf px-3 text-card transition hover:bg-pine"
                      aria-label="Record custom payment"
                    >
                      <IconCheck className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* add utang + history */}
              <div className="flex flex-col gap-4">
                <AddUtangBox onAdd={(a, n) => addUtang(sel.id, a, n)} />
                <div className="flex-1 rounded-xl border border-line bg-paper/50 p-4">
                  <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-ink-soft">Payment history</p>
                  <ul className="max-h-56 space-y-1.5 overflow-y-auto">
                    {[...sel.history].reverse().map((h) => (
                      <li key={h.id} className="flex items-center gap-2.5 rounded-md bg-card px-3 py-2 text-xs">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${h.type === "payment" ? "bg-leaf" : "bg-cherry"}`} />
                        <span className="min-w-0 flex-1 truncate font-semibold">
                          {h.type === "payment" ? "Bayad" : "Utang"}
                          {h.note ? ` · ${h.note}` : ""}
                        </span>
                        <span className="shrink-0 font-mono text-[10px] text-ink-soft">{fmtDay(h.ts)} {fmtTime(h.ts)}</span>
                        <span className={`tnum shrink-0 font-mono font-bold ${h.type === "payment" ? "text-leaf" : "text-cherry"}`}>
                          {h.type === "payment" ? "−" : "+"}{peso0(h.amount)}
                        </span>
                      </li>
                    ))}
                    {sel.history.length === 0 && <li className="py-4 text-center text-xs text-ink-soft">Walang tala pa.</li>}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-full min-h-[380px] items-center justify-center rounded-xl border border-dashed border-line bg-card/50 p-8">
            <div className="text-center">
              <IconUsers className="mx-auto h-10 w-10 text-ink-soft/40" />
              <p className="mt-3 font-display text-lg font-bold">Pumili ng suki</p>
              <p className="mt-1 max-w-64 text-sm text-ink-soft">
                Click a customer on the left to see their ledger, collect payments, or send a reminder.
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

function AddUtangBox({ onAdd }: { onAdd: (amount: number, note?: string) => void }) {
  const [amt, setAmt] = useState("");
  const [note, setNote] = useState("");
  return (
    <div className="rounded-xl border border-line bg-paper/50 p-4">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-cherry">{useStoreT().addUtangLabel}</p>
      <div className="flex gap-1.5">
        <input value={amt} onChange={(e) => setAmt(e.target.value)} type="number" placeholder="₱" className="field w-20 px-2.5 py-1.5 text-xs" />
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="note (bigas, kape…)" className="field flex-1 px-2.5 py-1.5 text-xs" />
        <button
          onClick={() => {
            const a = parseFloat(amt);
            if (a > 0) {
              onAdd(a, note.trim() || undefined);
              setAmt("");
              setNote("");
            }
          }}
          className="btn-press rounded-md bg-cherry px-3.5 text-xs font-extrabold text-card transition hover:bg-pine"
        >
          + {useStoreT().addBtn}
        </button>
      </div>
    </div>
  );
}

function useStoreT() {
  const { t } = useStore();
  return { addUtangLabel: t("addUtang"), addBtn: t("utang") };
}
