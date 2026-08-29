import { useMemo, useState } from "react";
import {
  collectedSince,
  downloadCSV,
  fmtDayFull,
  fmtTime,
  overdueDays,
  peso,
  peso0,
} from "../lib/data";
import { useStore } from "../lib/store";
import { CountUp, Field, Modal, Reveal } from "../components/ui";
import { IconCheck, IconClock, IconDownload, IconPlus, IconSearch, IconSend, IconSms, IconUsers, IconWallet } from "../components/Icons";

const AVATAR_TINTS = ["#103524", "#c9463d", "#2e6fd0", "#d98a0b", "#2f8f5b", "#7a6bbf"];

export default function UtangView() {
  const { db, t, settings, recordPayment, addUtang, addCustomer, notify } = useStore();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"balance" | "overdue" | "name">("balance");
  const [selectedId, setSelectedId] = useState(db.customers[0]?.id ?? "");
  const [payAmt, setPayAmt] = useState("");
  const [utangAmt, setUtangAmt] = useState("");
  const [utangNote, setUtangNote] = useState("");
  const [smsOpen, setSmsOpen] = useState(false);
  const [smsMsg, setSmsMsg] = useState("");
  const [custOpen, setCustOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const totalOutstanding = db.customers.reduce((s, c) => s + c.balance, 0);
  const overdueCount = db.customers.filter((c) => overdueDays(c) > 7).length;
  const weekCollected = useMemo(() => collectedSince(db, Date.now() - 7 * 86400000), [db]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const arr = db.customers.filter((c) => !q || c.name.toLowerCase().includes(q) || c.phone.replace(/\s/g, "").includes(q.replace(/\s/g, "")));
    arr.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "overdue") return overdueDays(b) - overdueDays(a);
      return b.balance - a.balance;
    });
    return arr;
  }, [db.customers, query, sort]);

  const sel = db.customers.find((c) => c.id === selectedId) ?? list[0] ?? db.customers[0];

  const doPay = (amt: number) => {
    if (!sel || amt <= 0) return;
    recordPayment(sel.id, amt);
    setPayAmt("");
  };

  const openSms = () => {
    if (!sel) return;
    setSmsMsg(
      `Hi ${sel.name}! Paalala lang po — may utang pa po kayo na ${peso(sel.balance)} sa ${settings.storeName}. Kung nabayaran niyo na po, paki-ignore na lang. Salamat po! — ${settings.owner}`,
    );
    setSmsOpen(true);
  };

  const timeline = sel ? [...sel.history].sort((a, b) => b.ts - a.ts) : [];

  const exportCsv = () =>
    downloadCSV("sukibook-utang.csv", [
      ["Customer", "Phone", "Balance", "Overdue (days)", "Last activity"],
      ...db.customers.map((c) => [
        c.name,
        c.phone,
        c.balance,
        overdueDays(c),
        c.history.length ? fmtDayFull(c.history[c.history.length - 1].ts) : "—",
      ]),
    ]);

  return (
    <div className="space-y-5">
      {/* header stats */}
      <Reveal>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-pine bg-pine p-5 text-card shadow-md">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-mango">{t("outstanding")}</p>
            <p className="mt-1 font-mono text-3xl font-bold text-mango">
              <CountUp value={totalOutstanding} fmt={peso0} />
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-card/70">
              <IconUsers className="h-3.5 w-3.5" /> across {db.customers.filter((c) => c.balance > 0).length} suki
            </p>
          </div>
          <div className="rounded-xl border border-line bg-card p-5 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">{t("overdue")} (&gt;7 days)</p>
            <p className={`mt-1 font-mono text-3xl font-bold ${overdueCount > 0 ? "text-cherry" : "text-leaf"}`}>{overdueCount}</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-soft">
              <IconClock className="h-3.5 w-3.5" /> sorted by days overdue below
            </p>
          </div>
          <div className="rounded-xl border border-line bg-card p-5 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">Collected · 7 days</p>
            <p className="mt-1 font-mono text-3xl font-bold text-leaf">
              <CountUp value={weekCollected} fmt={peso0} />
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-soft">
              <IconWallet className="h-3.5 w-3.5" /> bayad na pasasalamat
            </p>
          </div>
        </div>
      </Reveal>

      <div className="grid gap-5 lg:grid-cols-12">
        {/* customer list */}
        <Reveal className="lg:col-span-5">
          <div className="rounded-xl border border-line bg-card shadow-sm">
            <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3.5">
              <div className="relative min-w-40 flex-1">
                <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search suki or phone…" className="field pl-9 py-1.5 text-xs" />
              </div>
              <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="field w-auto py-1.5 text-xs">
                <option value="balance">By balance</option>
                <option value="overdue">By overdue</option>
                <option value="name">By name</option>
              </select>
              <button onClick={() => setCustOpen(true)} className="btn-press flex h-8 w-8 items-center justify-center rounded-md bg-pine text-mango transition hover:bg-pine-deep" aria-label="Add suki">
                <IconPlus className="h-4 w-4" />
              </button>
            </div>
            <ul className="max-h-[540px] divide-y divide-line overflow-y-auto">
              {list.map((c, i) => {
                const od = overdueDays(c);
                const active = sel?.id === c.id;
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => setSelectedId(c.id)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${active ? "bg-mango-soft/60" : "hover:bg-paper/70"}`}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-sm font-extrabold text-card" style={{ background: AVATAR_TINTS[i % AVATAR_TINTS.length] }}>
                        {c.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">{c.name}</span>
                        <span className="block font-mono text-[11px] text-ink-soft">{c.phone}</span>
                      </span>
                      <span className="text-right">
                        <span className={`tnum block font-mono text-sm font-bold ${c.balance === 0 ? "text-leaf" : "text-ink"}`}>{peso0(c.balance)}</span>
                        {c.balance > 0 && od > 7 ? (
                          <span className="rounded bg-cherry px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-cherry-soft">{od}d overdue</span>
                        ) : c.balance === 0 ? (
                          <span className="text-[10px] font-bold text-leaf">clean ✓</span>
                        ) : (
                          <span className="text-[10px] text-ink-soft">ok</span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="flex items-center justify-between border-t border-line px-4 py-2.5">
              <span className="text-[11px] text-ink-soft">{list.length} suki</span>
              <button onClick={exportCsv} className="btn-press inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-bold text-ink-soft transition hover:bg-pine-soft hover:text-pine">
                <IconDownload className="h-3.5 w-3.5" /> {t("exportCsv")}
              </button>
            </div>
          </div>
        </Reveal>

        {/* detail */}
        <Reveal delay={90} className="lg:col-span-7">
          {sel ? (
            <div className="rounded-xl border border-line bg-card shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
                <div>
                  <h2 className="font-display text-xl font-extrabold">{sel.name}</h2>
                  <p className="font-mono text-xs text-ink-soft">{sel.phone} · {sel.history.length} entries</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">Balance</p>
                  <p className={`tnum font-mono text-2xl font-bold ${sel.balance === 0 ? "text-leaf" : "text-cherry"}`}>
                    <CountUp value={sel.balance} fmt={peso0} />
                  </p>
                </div>
              </div>

              {/* actions */}
              <div className="grid gap-3 border-b border-line px-5 py-4 sm:grid-cols-2">
                <div className="rounded-lg border border-leaf/30 bg-leaf-soft/50 p-3.5">
                  <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-leaf">{t("recordPayment")}</p>
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {[20, 50, 100].map((a) => (
                      <button key={a} onClick={() => doPay(Math.min(a, sel.balance))} className="btn-press rounded-md bg-card px-2.5 py-1 font-mono text-xs font-bold text-leaf shadow-sm transition hover:bg-leaf hover:text-card">
                        ₱{a}
                      </button>
                    ))}
                    {sel.balance > 0 && (
                      <button onClick={() => doPay(sel.balance)} className="btn-press rounded-md bg-leaf px-2.5 py-1 font-mono text-xs font-bold text-card transition hover:bg-pine">
                        full {peso0(sel.balance)}
                      </button>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    <input value={payAmt} onChange={(e) => setPayAmt(e.target.value)} type="number" placeholder="Amount" className="field px-2.5 py-1.5 text-xs" />
                    <button onClick={() => doPay(parseFloat(payAmt))} disabled={!(parseFloat(payAmt) > 0)} className="btn-press rounded-md bg-leaf px-3 text-xs font-extrabold text-card transition enabled:hover:bg-pine disabled:opacity-40">
                      <IconCheck className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="rounded-lg border border-cherry/30 bg-cherry-soft/50 p-3.5">
                  <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-cherry">{t("addUtang")}</p>
                  <div className="flex gap-1.5">
                    <input value={utangAmt} onChange={(e) => setUtangAmt(e.target.value)} type="number" placeholder="₱" className="field w-20 px-2.5 py-1.5 text-xs" />
                    <input value={utangNote} onChange={(e) => setUtangNote(e.target.value)} placeholder="Note (e.g. bigas)" className="field flex-1 px-2.5 py-1.5 text-xs" />
                    <button
                      onClick={() => {
                        const a = parseFloat(utangAmt);
                        if (a > 0) {
                          addUtang(sel.id, a, utangNote.trim() || undefined);
                          setUtangAmt("");
                          setUtangNote("");
                        }
                      }}
                      disabled={!(parseFloat(utangAmt) > 0)}
                      className="btn-press rounded-md bg-cherry px-3 text-xs font-extrabold text-card transition enabled:hover:bg-pine disabled:opacity-40"
                    >
                      <IconPlus className="h-4 w-4" />
                    </button>
                  </div>
                  <button onClick={openSms} disabled={sel.balance === 0} className="btn-press mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md bg-pine py-2 text-xs font-extrabold uppercase tracking-wide text-mango transition enabled:hover:bg-pine-deep disabled:opacity-40">
                    <IconSms className="h-4 w-4" /> {t("sendReminder")}
                  </button>
                </div>
              </div>

              {/* timeline */}
              <div className="px-5 py-4">
                <p className="mb-3 text-[11px] font-extrabold uppercase tracking-wider text-ink-soft">Payment history timeline</p>
                <ul className="max-h-72 space-y-0 overflow-y-auto">
                  {timeline.map((h, i) => (
                    <li key={i} className="relative flex gap-3 pb-4 pl-1">
                      {i < timeline.length - 1 && <span className="absolute left-[15px] top-7 h-full w-px bg-line" />}
                      <span className={`z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${h.type === "utang" ? "bg-cherry-soft text-cherry" : "bg-leaf-soft text-leaf"}`}>
                        {h.type === "utang" ? <IconPlus className="h-3.5 w-3.5" /> : <IconCheck className="h-3.5 w-3.5" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-sm font-semibold">
                            {h.type === "utang" ? "Utang" : "Payment"}
                            <span className={`tnum ml-2 font-mono font-bold ${h.type === "utang" ? "text-cherry" : "text-leaf"}`}>
                              {h.type === "utang" ? "+" : "−"}{peso(h.amount)}
                            </span>
                          </p>
                          <p className="shrink-0 font-mono text-[10px] text-ink-soft">{fmtDayFull(h.ts)} · {fmtTime(h.ts)}</p>
                        </div>
                        {h.note && <p className="truncate text-xs text-ink-soft">{h.note}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-line p-10 text-center text-sm text-ink-soft">
              Walang suki yet — add your first customer.
            </div>
          )}
        </Reveal>
      </div>

      {/* SMS modal */}
      <Modal open={smsOpen} onClose={() => setSmsOpen(false)} title={`SMS → ${sel?.name ?? ""}`}>
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg bg-paper px-3 py-2 font-mono text-xs text-ink-soft">
            <IconSms className="h-4 w-4 shrink-0" /> to {sel?.phone} · via Semaphore PH · ₱0.25/credit
          </div>
          <textarea value={smsMsg} onChange={(e) => setSmsMsg(e.target.value)} rows={4} className="field resize-none" />
          <button
            onClick={() => {
              setSmsOpen(false);
              notify("ok", "SMS sent", `Reminder delivered to ${sel?.phone}`);
            }}
            className="btn-press inline-flex w-full items-center justify-center gap-2 rounded-lg bg-mango py-2.5 font-display text-sm font-extrabold uppercase tracking-wide text-pine-deep transition hover:bg-mango-deep"
          >
            <IconSend className="h-4 w-4" /> Send reminder
          </button>
        </div>
      </Modal>

      {/* add customer modal */}
      <Modal open={custOpen} onClose={() => setCustOpen(false)} title="Bagong suki">
        <div className="space-y-3.5">
          <Field label="Name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Aling Dading" />
          <Field label="Phone" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="0917 …" />
          <button
            onClick={() => {
              if (newName.trim()) {
                addCustomer(newName.trim(), newPhone.trim() || "—");
                setNewName("");
                setNewPhone("");
                setCustOpen(false);
              }
            }}
            disabled={!newName.trim()}
            className="btn-press w-full rounded-lg bg-mango py-2.5 font-display text-sm font-extrabold uppercase tracking-wide text-pine-deep transition enabled:hover:bg-mango-deep disabled:opacity-50"
          >
            Add suki
          </button>
        </div>
      </Modal>
    </div>
  );
}
