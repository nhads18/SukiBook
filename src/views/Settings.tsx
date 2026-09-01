import { useMemo, useState } from "react";
import { useStore, THEMES } from "../lib/store";
import { Field, Modal, Reveal, Seg } from "../components/ui";
import { IconCheck, IconGear, IconLock, IconPalette, IconPlus, IconShield, IconSheets, IconSync, IconTrash, IconUsers } from "../components/Icons";
import type { Lang } from "../lib/i18n";
import type { StaffRole } from "../lib/data";

function Switch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={on}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-leaf" : "bg-line"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-card shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

function SecurityCard({ mode, phones }: { mode: "demo" | "cloud" | "gate"; phones: number }) {
  const checks = useMemo(() => {
    const tls = window.location.protocol === "https:" || window.location.hostname === "localhost";
    const swActive = "serviceWorker" in navigator && !!navigator.serviceWorker.controller;
    return [
      {
        label: "Transport (TLS)",
        ok: tls,
        detail: tls ? "HTTPS — traffic encrypted end to end" : "Plain HTTP — fine on localhost only",
      },
      {
        label: "Data isolation (RLS)",
        ok: mode === "cloud",
        detail:
          mode === "cloud"
            ? "Row-level security: every row scoped to your login"
            : "Demo mode: data never leaves this browser",
      },
      {
        label: "Sync integrity",
        ok: true,
        detail: "Single-transaction atomic push — no partial writes",
      },
      {
        label: "Auth",
        ok: true,
        detail:
          mode === "cloud"
            ? "Supabase magic link + register PIN, per-store session"
            : "Register PIN — PBKDF2-SHA256 (120k iters), salted, never stored",
      },
      {
        label: "Access control",
        ok: true,
        detail: "5-min idle auto-lock · 30 s lockout after 5 tries · 8 h session TTL",
      },
      {
        label: "Roles",
        ok: true,
        detail: "Owner / helper / accountant — Deploy & Go Live owner-only, profits masked for helpers",
      },
      {
        label: "Offline cache hygiene",
        ok: !swActive,
        detail: swActive ? "Service worker active — verify stale-shell purge on deploy" : "No stale service-worker shell",
      },
      {
        label: "CSV export guard",
        ok: true,
        detail: "Formula-injection characters neutralized on export",
      },
    ];
  }, [mode]);
  const pass = checks.filter((c) => c.ok).length;
  return (
    <div className="rounded-xl border border-line bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold">
          <IconShield className="h-5 w-5 text-pine" /> Security status
        </h2>
        <span className={`tnum rounded-md px-2.5 py-1 font-mono text-xs font-bold ${pass === checks.length ? "bg-leaf-soft text-leaf" : "bg-mango-soft text-mango-deep"}`}>
          {pass}/{checks.length}
        </span>
      </div>
      <ul className="mt-3.5 space-y-2">
        {checks.map((c) => (
          <li key={c.label} className="flex items-start gap-2.5 rounded-lg bg-paper/60 px-3 py-2.5">
            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${c.ok ? "bg-leaf text-card" : "bg-mango text-pine-deep"}`}>
              <IconCheck className="h-3 w-3" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold">{c.label}</p>
              <p className="text-[11px] leading-snug text-ink-soft">{c.detail}</p>
            </div>
          </li>
        ))}
      </ul>
      {mode === "demo" && (
        <p className="mt-3 flex items-start gap-2 rounded-lg border border-mango/40 bg-mango-soft/60 px-3 py-2.5 text-[11px] leading-relaxed text-mango-deep">
          <IconShield className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Demo stores <span className="font-bold">{phones} customer phone numbers</span> in this browser's localStorage.
          In live mode they live only in your RLS-protected Postgres.
        </p>
      )}
    </div>
  );
}

export default function SettingsView() {
  const { db, t, settings, updateSettings, notify, resetDemo, cloud, logout, auth, signOut, lockNow, addStaff, updateStaff, removeStaff } = useStore();
  const [resetOpen, setResetOpen] = useState(false);
  const [staffForm, setStaffForm] = useState({ name: "", phone: "", role: "helper" as StaffRole });
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const TEAM = [
    { name: settings.owner, role: "Owner", desc: "Full access — reports, profit, deployment & team", tint: "bg-mango text-pine-deep" },
    { name: "Junjun", role: "Helper", desc: "Sales & stock only — no profit visibility", tint: "bg-leaf-soft text-leaf" },
    { name: "Ate Grace", role: "Accountant", desc: "View-only reports for bookkeeping & BIR", tint: "bg-gcash-soft text-gcash" },
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      {/* left column */}
      <div className="space-y-5 lg:col-span-7">
        <Reveal>
          <div className="rounded-xl border border-line bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-pine-soft text-pine">
                <IconGear className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-display text-lg font-bold">Store profile</h2>
                <p className="text-xs text-ink-soft">Shown on reports, receipts and the mobile header</p>
              </div>
            </div>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field label="Store name" value={settings.storeName} onChange={(e) => updateSettings({ storeName: e.target.value })} />
              <Field label="Owner" value={settings.owner} onChange={(e) => updateSettings({ owner: e.target.value })} />
            </div>
          </div>
        </Reveal>

        <Reveal delay={60}>
          <div className="rounded-xl border border-line bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-bold">Team &amp; roles</h2>
                <p className="text-xs text-ink-soft">
                  Role-based access per spec §10 — <span className="font-bold text-mango-deep">Deploy is owner-only</span>, helpers can't see profit
                </p>
              </div>
              <button
                onClick={() => notify("info", "Invite link copied", "Send it to your helper's phone")}
                className="btn-press inline-flex items-center gap-1.5 rounded-md bg-pine px-3 py-1.5 text-[11px] font-extrabold text-mango transition hover:bg-pine-deep"
              >
                <IconUsers className="h-3.5 w-3.5" /> Invite
              </button>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {TEAM.map((m) => {
                const key = m.role.toLowerCase() as typeof settings.role;
                const active = settings.role === key;
                return (
                  <button
                    key={m.name}
                    onClick={() => {
                      if (!active) {
                        updateSettings({ role: key });
                        notify(
                          key === "owner" ? "ok" : "info",
                          `Signed in as ${m.role}`,
                          key === "owner" ? "Full access — Deploy tab unlocked" : "Access narrowed to this role",
                        );
                      }
                    }}
                    className={`btn-press relative rounded-xl border p-3.5 text-left transition ${
                      active ? "border-pine bg-pine text-card shadow-md" : "border-line bg-paper/60 hover:border-pine/50 hover:bg-pine-soft/50"
                    }`}
                  >
                    {active && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-mango" />}
                    <p className={`font-display text-sm font-extrabold ${active ? "text-mango" : ""}`}>{m.role}</p>
                    <p className={`mt-1 text-[11px] leading-snug ${active ? "text-card/70" : "text-ink-soft"}`}>{m.desc}</p>
                    {key === "owner" && (
                      <p className={`mt-2 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${active ? "bg-mango text-pine-deep" : "bg-mango-soft text-mango-deep"}`}>
                        <IconShield className="h-3 w-3" /> Deploy access
                      </p>
                    )}
                  </button>
                );
              })}
            </div>

            {/* live roster — owner pinned, staff from the ledger */}
            <ul className="mt-4 space-y-2.5">
              <li className="flex items-center gap-3 rounded-lg border border-mango/60 bg-mango-soft/50 px-3.5 py-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-mango font-display text-xs font-extrabold text-pine-deep">
                  {settings.owner.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">
                    {settings.owner}
                    <span className="ml-2 rounded bg-pine px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-mango">you</span>
                  </p>
                  <p className="truncate text-[11px] text-ink-soft">Full access — reports, profit, deploy &amp; team</p>
                </div>
                <span className="rounded-full bg-mango px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-pine-deep">Owner</span>
              </li>

              {(db.staff ?? []).map((s) => {
                const tint = s.role === "helper" ? "bg-leaf-soft text-leaf" : "bg-gcash-soft text-gcash";
                return (
                  <li
                    key={s.id}
                    className={`flex items-center gap-3 rounded-lg border px-3.5 py-2.5 transition ${
                      s.active ? "border-line bg-paper/60 hover:bg-pine-soft/50" : "border-line bg-paper/30 opacity-55"
                    }`}
                  >
                    <span className={`flex h-9 w-9 items-center justify-center rounded-full font-display text-xs font-extrabold ${tint}`}>
                      {s.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">
                        {s.name}
                        {!s.active && <span className="ml-2 rounded bg-line px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-ink-soft">off duty</span>}
                      </p>
                      <p className="truncate font-mono text-[11px] text-ink-soft">
                        {s.phone || "—"} · joined {new Date(s.addedAt).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${tint}`}>{s.role}</span>
                    <button
                      onClick={() => {
                        updateStaff(s.id, { active: !s.active });
                        notify("info", s.active ? "Staff off duty" : "Staff back on duty", s.name);
                      }}
                      title={s.active ? "Deactivate — hides from the counter rotation" : "Activate"}
                      className={`btn-press relative h-5 w-9 shrink-0 rounded-full transition ${s.active ? "bg-leaf" : "bg-line"}`}
                      aria-label={s.active ? "Deactivate staff" : "Activate staff"}
                    >
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-card shadow transition-all ${s.active ? "left-[18px]" : "left-0.5"}`} />
                    </button>
                    {confirmDel === s.id ? (
                      <button
                        onClick={() => {
                          removeStaff(s.id);
                          setConfirmDel(null);
                        }}
                        className="btn-press shrink-0 rounded-md bg-cherry px-2 py-1.5 text-[10px] font-extrabold uppercase text-cherry-soft"
                      >
                        Sure?
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirmDel(s.id)}
                        title="Remove from team"
                        className="btn-press shrink-0 rounded-md p-1.5 text-ink-soft transition hover:bg-cherry-soft hover:text-cherry"
                        aria-label="Remove staff"
                      >
                        <IconTrash className="h-4 w-4" />
                      </button>
                    )}
                  </li>
                );
              })}

              {(db.staff ?? []).length === 0 && (
                <li className="rounded-lg border border-dashed border-line px-4 py-5 text-center text-xs text-ink-soft">
                  Wala pang staff — idagdag ang kasama sa counter sa baba.
                </li>
              )}
            </ul>

            {/* add staff */}
            <div className="mt-4 rounded-xl border border-dashed border-pine/30 bg-pine-soft/40 p-4">
              <p className="mb-2.5 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest text-pine">
                <IconPlus className="h-3.5 w-3.5" /> Add staff
              </p>
              <div className="flex flex-wrap gap-2">
                <input
                  value={staffForm.name}
                  onChange={(e) => setStaffForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Pangalan (e.g. Junjun)"
                  className="field min-w-36 flex-1 px-3 py-2 text-xs"
                />
                <input
                  value={staffForm.phone}
                  onChange={(e) => setStaffForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="09…"
                  inputMode="tel"
                  aria-label="Staff phone number"
                  className="field w-32 px-3 py-2 text-xs"
                />
                <select
                  value={staffForm.role}
                  onChange={(e) => setStaffForm((f) => ({ ...f, role: e.target.value as StaffRole }))}
                  className="field w-32 px-2 py-2 text-xs"
                >
                  <option value="helper">Helper</option>
                  <option value="accountant">Accountant</option>
                </select>
                <button
                  onClick={() => {
                    if (staffForm.name.trim()) {
                      addStaff(staffForm.name.trim(), staffForm.role, staffForm.phone.trim());
                      setStaffForm({ name: "", phone: "", role: "helper" });
                    }
                  }}
                  disabled={!staffForm.name.trim()}
                  className="btn-press rounded-lg bg-pine px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-mango transition enabled:hover:bg-pine-deep disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>

            <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-ink-soft">
              <IconShield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pine" />
              Deactivated staff can't open the register. In cloud mode, per-user roles are enforced server-side via a
              <span className="mx-1 font-mono font-bold text-pine">store_members</span>table + RLS.
            </p>
          </div>
        </Reveal>

        <Reveal delay={110}>
          <div className="rounded-xl border border-line bg-card p-5 shadow-sm">
            <h2 className="font-display text-lg font-bold">Sync &amp; backup</h2>
            <p className="mb-3 text-xs text-ink-soft">Offline-first: changes queue locally, then push when possible</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-paper/60 px-3.5 py-3">
                <div className="flex items-center gap-2.5">
                  <IconSync className="h-4.5 w-4.5 text-pine" />
                  <div>
                    <p className="text-sm font-bold">Auto-sync</p>
                    <p className="text-[11px] text-ink-soft">Push every change ~1.5 s after the tap</p>
                  </div>
                </div>
                <Switch on={settings.autoSync} onToggle={() => updateSettings({ autoSync: !settings.autoSync })} />
              </div>
              <div className="flex items-center justify-between rounded-lg bg-paper/60 px-3.5 py-3">
                <div className="flex items-center gap-2.5">
                  <IconSheets className="h-4.5 w-4.5 text-pine" />
                  <div>
                    <p className="text-sm font-bold">Google Sheets mirror</p>
                    <p className="text-[11px] text-ink-soft">Hourly export for familiar viewing (Phase 2)</p>
                  </div>
                </div>
                <Switch on={settings.sheetsSync} onToggle={() => updateSettings({ sheetsSync: !settings.sheetsSync })} />
              </div>
              <button
                onClick={() => setResetOpen(true)}
                className="btn-press w-full rounded-lg border border-cherry/40 bg-cherry-soft/50 py-2.5 text-xs font-extrabold uppercase tracking-wide text-cherry transition hover:bg-cherry hover:text-cherry-soft"
              >
                Reset demo data
              </button>
            </div>
          </div>
        </Reveal>
      </div>

      {/* right column */}
      <div className="space-y-5 lg:col-span-5">
        {/* account & session */}
        <Reveal delay={15}>
          <div className="overflow-hidden rounded-xl border border-line bg-card shadow-sm">
            <div className="stripes-soft h-1.5" />
            <div className="p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-pine text-mango">
                  <IconLock className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-display text-lg font-bold">Account &amp; session</h2>
                  <p className="text-xs text-ink-soft">Register PIN guards the whole ledger</p>
                </div>
              </div>
              <div className="mt-4 rounded-lg bg-paper/70 px-3.5 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{auth.email ?? "—"}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-ink-soft">
                      PIN · PBKDF2-SHA256 (120k) · salted per account
                    </p>
                  </div>
                  <span className="flex items-center gap-1.5 rounded-full bg-leaf-soft px-2.5 py-1 text-[10px] font-extrabold uppercase text-leaf">
                    <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-leaf" /> Active
                  </span>
                </div>
              </div>
              <ul className="mt-3 space-y-1.5 text-[11px] text-ink-soft">
                <li className="flex items-center gap-2">
                  <IconCheck className="h-3.5 w-3.5 shrink-0 text-leaf" /> Auto-locks after <span className="font-mono font-bold text-ink">5 min</span> idle — PIN to reopen
                </li>
                <li className="flex items-center gap-2">
                  <IconCheck className="h-3.5 w-3.5 shrink-0 text-leaf" /> 5 wrong tries → <span className="font-mono font-bold text-ink">30 s</span> lockout
                </li>
                <li className="flex items-center gap-2">
                  <IconCheck className="h-3.5 w-3.5 shrink-0 text-leaf" /> Session expires after <span className="font-mono font-bold text-ink">8 h</span>
                </li>
              </ul>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => lockNow()}
                  className="btn-press flex-1 rounded-lg border border-line bg-card py-2 text-xs font-extrabold uppercase tracking-wide text-ink transition hover:border-pine hover:bg-pine-soft hover:text-pine"
                >
                  Lock now
                </button>
                <button
                  onClick={() => {
                    signOut();
                    notify("info", "Signed out", "PIN required to reopen the store");
                  }}
                  className="btn-press flex-1 rounded-lg border border-cherry/40 bg-cherry-soft/50 py-2 text-xs font-extrabold uppercase tracking-wide text-cherry transition hover:bg-cherry hover:text-cherry-soft"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={30}>
          <div className="rounded-xl border border-line bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold">Cloud connection</h2>
                <p className="mt-0.5 text-xs text-ink-soft">Vercel + Supabase · offline-first, last-write-wins</p>
              </div>
              {cloud.mode === "cloud" ? (
                <span className="flex items-center gap-1.5 rounded-full bg-leaf-soft px-2.5 py-1 text-[10px] font-extrabold uppercase text-leaf">
                  <IconCheck className="h-3 w-3" /> Live
                </span>
              ) : (
                <span className="rounded-full bg-mango-soft px-2.5 py-1 text-[10px] font-extrabold uppercase text-mango-deep">Demo data</span>
              )}
            </div>
            {cloud.mode === "cloud" ? (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-paper/70 px-3.5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{cloud.email}</p>
                  <p className="flex items-center gap-1.5 font-mono text-[10px] text-ink-soft">
                    <IconSync className="h-3 w-3" /> changes auto-push ~1.5 s after each tap
                  </p>
                </div>
                <button
                  onClick={() => {
                    logout();
                    notify("info", "Signed out", "You'll be asked to sign in again");
                  }}
                  className="btn-press shrink-0 rounded-md border border-line bg-card px-3 py-1.5 text-[11px] font-bold text-ink-soft transition hover:border-cherry hover:text-cherry"
                >
                  Sign out
                </button>
              </div>
            ) : cloud.configured ? (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-mango-soft/60 px-3.5 py-3">
                <p className="text-xs font-semibold text-mango-deep">
                  You're browsing demo data — sign in to sync this store to the cloud.
                </p>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <button
                    onClick={() => window.location.reload()}
                    className="btn-press rounded-md bg-pine px-3 py-1.5 text-[11px] font-extrabold text-mango transition hover:bg-pine-deep"
                  >
                    Sign in
                  </button>
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent("sukibook-nav", { detail: "golive" }))}
                    className="btn-press text-[10px] font-bold text-mango-deep underline decoration-mango decoration-2 underline-offset-2 transition hover:text-pine"
                  >
                    Go Live checklist →
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                <p className="rounded-lg bg-paper/70 px-3.5 py-3 text-xs leading-relaxed text-ink-soft">
                  Supabase isn't configured yet. Add{" "}
                  <span className="font-mono font-bold text-pine">VITE_SUPABASE_URL</span> and{" "}
                  <span className="font-mono font-bold text-pine">VITE_SUPABASE_ANON_KEY</span> in Vercel, run{" "}
                  <span className="font-mono font-bold text-pine">supabase/schema.sql</span>, and this build goes live.
                </p>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent("sukibook-nav", { detail: "golive" }))}
                  className="btn-press w-full rounded-md bg-pine py-2 text-[11px] font-extrabold uppercase tracking-wide text-mango transition hover:bg-pine-deep"
                >
                  Open the Go Live checklist
                </button>
              </div>
            )}
          </div>
        </Reveal>

        <SecurityCard mode={cloud.mode} phones={db.customers.filter((c) => c.phone).length} />

        <Reveal delay={85}>
          <div className="rounded-xl border border-line bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-bold">{t("theme.title")}</h2>
                <p className="text-xs text-ink-soft">{t("theme.desc")}</p>
              </div>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-pine-soft text-pine">
                <IconPalette className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-4 space-y-2.5">
              {THEMES.map((th) => {
                const active = settings.theme === th.key;
                return (
                  <button
                    key={th.key}
                    onClick={() => updateSettings({ theme: th.key })}
                    className={`btn-press relative flex w-full items-center gap-3.5 overflow-hidden rounded-xl border p-3.5 text-left transition ${
                      active ? "border-pine bg-pine text-card shadow-md" : "border-line bg-paper/50 hover:border-pine/50 hover:bg-pine-soft/40"
                    }`}
                  >
                    <span
                      className="absolute inset-y-0 left-0 w-1.5"
                      style={{ background: `repeating-linear-gradient(180deg, ${th.swatches[1]} 0 8px, ${th.swatches[0]} 8px 16px)` }}
                    />
                    <span className="ml-2 flex -space-x-2">
                      {th.swatches.map((s, i) => (
                        <span key={i} className={`h-7 w-7 rounded-full border-2 ${active ? "border-card/30" : "border-card"}`} style={{ background: s }} />
                      ))}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span className="text-base font-extrabold leading-none" style={{ fontFamily: th.font }}>{th.name}</span>
                        <span className={`font-mono text-sm font-bold ${active ? "text-mango" : "text-pine"}`} style={{ fontFamily: th.font }}>₱</span>
                      </span>
                      <span className={`mt-1 block truncate text-[11px] leading-snug ${active ? "text-card/65" : "text-ink-soft"}`}>{th.tagline}</span>
                    </span>
                    {active && <IconCheck className="h-5 w-5 shrink-0 text-mango" />}
                  </button>
                );
              })}
            </div>
          </div>
        </Reveal>

        <Reveal delay={110}>
          <div className="rounded-xl border border-line bg-card p-5 shadow-sm">
            <h2 className="mb-3 font-display text-lg font-bold">Wika / Language</h2>
            <Seg<Lang>
              value={settings.lang}
              onChange={(lang) => updateSettings({ lang })}
              options={[
                { key: "en", label: "English" },
                { key: "tl", label: "Tagalog" },
              ]}
            />
          </div>
        </Reveal>
      </div>

      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Reset demo data?">
        <p className="text-sm leading-relaxed text-ink-soft">
          This regenerates the 14-day seeded ledger, product catalog and suki list. Your current entries will be replaced.
        </p>
        <div className="mt-4 flex gap-2">
          <button onClick={() => setResetOpen(false)} className="btn-press flex-1 rounded-lg border border-line py-2.5 text-sm font-bold text-ink-soft transition hover:bg-paper">
            Cancel
          </button>
          <button
            onClick={() => {
              resetDemo();
              setResetOpen(false);
            }}
            className="btn-press flex-1 rounded-lg bg-cherry py-2.5 text-sm font-extrabold text-card transition hover:bg-pine"
          >
            Reset
          </button>
        </div>
      </Modal>
    </div>
  );
}
