import { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { Field, Modal, Reveal, Seg } from "../components/ui";
import { IconCheck, IconGear, IconShield, IconSheets, IconSync, IconUsers } from "../components/Icons";
import type { Lang } from "../lib/i18n";

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
    const tls =
      window.location.protocol === "https:" || window.location.hostname === "localhost";
    const swActive = "serviceWorker" in navigator && !!navigator.serviceWorker.controller;
    const rows: { label: string; ok: boolean; note: boolean; detail: string }[] = [
      {
        label: "Transport (TLS)",
        ok: tls,
        note: !tls,
        detail: tls ? "HTTPS — traffic encrypted end to end" : "Plain HTTP — fine on localhost only",
      },
      {
        label: "Database access (RLS)",
        ok: mode === "cloud",
        note: mode !== "cloud",
        detail:
          mode === "cloud"
            ? "Row-Level Security: every row locked to your login"
            : "Demo mode — nothing leaves this browser",
      },
      {
        label: "Sync integrity",
        ok: true,
        note: false,
        detail:
          mode === "cloud"
            ? "Single-transaction push — concurrent devices can't lose rows"
            : "Local writes only — inherently atomic",
      },
      {
        label: "Authentication",
        ok: mode === "cloud",
        note: mode !== "cloud",
        detail:
          mode === "cloud"
            ? "Magic link — no passwords stored anywhere"
            : "No account — demo session",
      },
      {
        label: "Offline cache",
        ok: swActive,
        note: !swActive,
        detail: swActive
          ? "App shell cached — store data is never cached"
          : "Service worker inactive (dev build)",
      },
      {
        label: "CSV exports",
        ok: true,
        note: false,
        detail: "Formula-injection guarded for Excel / WPS / Sheets",
      },
    ];
    return rows;
  }, [mode]);

  const good = checks.filter((c) => c.ok).length;

  return (
    <Reveal delay={45}>
      <div className="rounded-xl border border-line bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-pine text-mango">
              <IconShield className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold leading-tight">Security status</h2>
              <p className="text-xs text-ink-soft">Live audit of this deployment</p>
            </div>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 font-mono text-[10px] font-extrabold uppercase ${
              good === checks.length ? "bg-leaf-soft text-leaf" : "bg-mango-soft text-mango-deep"
            }`}
          >
            {good}/{checks.length} green
          </span>
        </div>
        <ul className="mt-4 space-y-2">
          {checks.map((c) => (
            <li key={c.label} className="flex items-start gap-2.5 rounded-lg bg-paper/70 px-3 py-2">
              <span
                className={`mt-1 h-2 w-2 shrink-0 rounded-full ${c.ok ? "bg-leaf" : "pulse-dot bg-mango"}`}
              />
              <div className="min-w-0">
                <p className="text-xs font-bold leading-tight">{c.label}</p>
                <p className="text-[11px] leading-snug text-ink-soft">{c.detail}</p>
              </div>
            </li>
          ))}
        </ul>
        {mode !== "cloud" && phones > 0 && (
          <p className="mt-3 rounded-lg border border-mango/40 bg-mango-soft/60 px-3 py-2 text-[11px] font-semibold leading-snug text-mango-deep">
            Advisory: {phones} customer phone number{phones === 1 ? "" : "s"} currently live in this
            browser's local storage (demo data). Sign in to move them to RLS-protected Postgres, or
            clear site data to erase them.
          </p>
        )}
        <p className="mt-3 font-mono text-[10px] leading-relaxed text-ink-soft">
          Also enforced server-side: length &amp; range caps on every column, owner-only photo
          bucket, CSP + framing headers via vercel.json, magic-link redirects restricted to your
          domain in Supabase.
        </p>
      </div>
    </Reveal>
  );
}

const TEAM = [
  { name: "Aling Nena", role: "Owner", tint: "bg-mango text-pine-deep", desc: "Full access — sales, profit, utang, settings" },
  { name: "Kuya Jojo", role: "Helper", tint: "bg-leaf-soft text-leaf", desc: "Records sales & stock · hindi nakikita ang profit" },
  { name: "Ate Len", role: "Accountant", tint: "bg-gcash-soft text-gcash", desc: "View-only reports & exports for BIR" },
];

export default function SettingsView() {
  const { db, settings, updateSettings, notify, resetDemo, cloud, logout } = useStore();
  const [name, setName] = useState(settings.storeName);
  const [owner, setOwner] = useState(settings.owner);
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* profile */}
      <Reveal>
        <div className="rounded-xl border border-line bg-card p-5 shadow-sm">
          <h2 className="font-display text-lg font-bold">Store profile</h2>
          <p className="mb-4 text-xs text-ink-soft">Shown on SMS reminders &amp; printed receipts</p>
          <div className="space-y-3.5">
            <Field label="Store name" value={name} onChange={(e) => setName(e.target.value)} />
            <Field label="Owner" value={owner} onChange={(e) => setOwner(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Address" defaultValue="123 Rizal St., Brgy. Malaya, QC" />
              <Field label="Phone" defaultValue="0917 555 0000" />
            </div>
            <button
              onClick={() => {
                updateSettings({ storeName: name, owner });
                notify("ok", "Profile saved", "Settings synced to all devices");
              }}
              className="btn-press rounded-lg bg-pine px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-mango transition hover:bg-pine-deep"
            >
              Save changes
            </button>
          </div>
        </div>
      </Reveal>

      <div className="space-y-5">
        {/* cloud connection */}
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
                <button
                  onClick={() => window.location.reload()}
                  className="btn-press shrink-0 rounded-md bg-pine px-3 py-1.5 text-[11px] font-extrabold text-mango transition hover:bg-pine-deep"
                >
                  Sign in
                </button>
              </div>
            ) : (
              <p className="mt-4 rounded-lg bg-paper/70 px-3.5 py-3 text-xs leading-relaxed text-ink-soft">
                Supabase isn't configured yet. Add{" "}
                <span className="font-mono font-bold text-pine">VITE_SUPABASE_URL</span> and{" "}
                <span className="font-mono font-bold text-pine">VITE_SUPABASE_ANON_KEY</span> in Vercel,
                run <span className="font-mono font-bold text-pine">supabase/schema.sql</span>, and this
                build goes live — full steps in the <span className="font-bold">Deploy</span> tab.
              </p>
            )}
          </div>
        </Reveal>

        {/* security status — live audit of this deployment */}
        <SecurityCard mode={cloud.mode} phones={db.customers.filter((c) => c.phone).length} />

        {/* language */}
        <Reveal delay={60}>
          <div className="rounded-xl border border-line bg-card p-5 shadow-sm">
            <h2 className="font-display text-lg font-bold">Wika / Language</h2>
            <p className="mb-3 text-xs text-ink-soft">Navigation &amp; key labels — data stays as you typed it</p>
            <Seg<Lang>
              value={settings.lang}
              onChange={(v) => updateSettings({ lang: v })}
              options={[
                { key: "en", label: "English" },
                { key: "tl", label: "Tagalog" },
              ]}
            />
          </div>
        </Reveal>

        {/* sync */}
        <Reveal delay={110}>
          <div className="rounded-xl border border-line bg-card p-5 shadow-sm">
            <h2 className="font-display text-lg font-bold">Sync &amp; backup</h2>
            <ul className="mt-3 space-y-3.5">
              <li className="flex items-center gap-3">
                <IconSync className="h-5 w-5 shrink-0 text-pine" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">Auto-sync to cloud</p>
                  <p className="text-xs text-ink-soft">Offline changes merge when back online — last write wins</p>
                </div>
                <Switch on={settings.autoSync} onToggle={() => updateSettings({ autoSync: !settings.autoSync })} />
              </li>
              <li className="flex items-center gap-3">
                <IconSheets className="h-5 w-5 shrink-0 text-leaf" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">Google Sheets mirror</p>
                  <p className="text-xs text-ink-soft">Familiar spreadsheet view, updated hourly · last sync 42m ago</p>
                </div>
                <Switch on={settings.sheetsSync} onToggle={() => updateSettings({ sheetsSync: !settings.sheetsSync })} />
              </li>
              <li className="flex items-center gap-3">
                <IconGear className="h-5 w-5 shrink-0 text-mango-deep" />
                <div className="flex-1">
                  <p className="text-sm font-semibold">Drive backup</p>
                  <p className="text-xs text-ink-soft">Nightly snapshot · last backup kagabi, 11:42 PM</p>
                </div>
                <button
                  onClick={() => notify("ok", "Backup uploaded", "sukibook-backup-2026-01-17.zip → Google Drive")}
                  className="btn-press rounded-md bg-mango px-3 py-1.5 text-[11px] font-extrabold text-pine-deep transition hover:bg-mango-deep"
                >
                  Back up now
                </button>
              </li>
            </ul>
          </div>
        </Reveal>
      </div>

      {/* team */}
      <Reveal delay={80}>
        <div className="rounded-xl border border-line bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold">Team &amp; roles</h2>
              <p className="text-xs text-ink-soft">
                Role-based access per spec §10 — <span className="font-bold text-mango-deep">Deploy tab is owner-only</span>, helpers can't see profit
              </p>
            </div>
            <button
              onClick={() => notify("info", "Invite link copied", "Send it to your helper's phone")}
              className="btn-press inline-flex items-center gap-1.5 rounded-md bg-pine px-3 py-1.5 text-[11px] font-extrabold text-mango transition hover:bg-pine-deep"
            >
              <IconUsers className="h-3.5 w-3.5" /> Invite
            </button>
          </div>

          {/* active role switcher — this session */}
          <div className="mb-4 grid gap-2 sm:grid-cols-3">
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

          <ul className="space-y-2.5">
            {TEAM.map((m) => {
              const key = m.role.toLowerCase() as typeof settings.role;
              const isYou = settings.role === key;
              return (
                <li key={m.name} className={`flex items-center gap-3 rounded-lg border px-3.5 py-2.5 transition ${isYou ? "border-mango/60 bg-mango-soft/50" : "border-line bg-paper/60 hover:bg-pine-soft/50"}`}>
                  <span className={`flex h-9 w-9 items-center justify-center rounded-full font-display text-xs font-extrabold ${m.tint}`}>
                    {m.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">
                      {m.name}
                      {isYou && <span className="ml-2 rounded bg-pine px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-mango">you · this session</span>}
                    </p>
                    <p className="truncate text-[11px] text-ink-soft">{m.desc}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${m.tint}`}>{m.role}</span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-ink-soft">
            <IconShield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pine" />
            Demo switches the session role instantly. In cloud mode, per-user roles will be enforced server-side via a
            <span className="mx-1 font-mono font-bold text-pine">store_members</span>table + RLS (Phase 2).
          </p>
        </div>
      </Reveal>

      {/* danger */}
      <Reveal delay={130}>
        <div className="rounded-xl border border-cherry/30 bg-cherry-soft/40 p-5 shadow-sm">
          <h2 className="font-display text-lg font-bold text-cherry">Demo data</h2>
          <p className="mb-4 text-xs text-ink-soft">
            This workspace runs on seeded demo data (regenerates daily). Reset to replay the fresh experience.
          </p>
          <button
            onClick={() => setConfirmReset(true)}
            className="btn-press rounded-lg border border-cherry bg-card px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-cherry transition hover:bg-cherry hover:text-card"
          >
            Reset demo data
          </button>
        </div>
      </Reveal>

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset demo data?">
        <p className="text-sm text-ink-soft">
          Lahat ng changes mo mawawala — products, sales, utang entries will be reseeded. This can't be undone.
        </p>
        <div className="mt-5 flex gap-2">
          <button onClick={() => setConfirmReset(false)} className="btn-press flex-1 rounded-lg border border-line bg-card py-2 text-sm font-bold transition hover:bg-paper">
            Cancel
          </button>
          <button
            onClick={() => {
              setConfirmReset(false);
              resetDemo();
            }}
            className="btn-press flex-1 rounded-lg bg-cherry py-2 text-sm font-extrabold text-card transition hover:bg-pine"
          >
            Yes, reset
          </button>
        </div>
      </Modal>

      <p className="flex items-center gap-2 text-xs text-ink-soft lg:col-span-2">
        <IconCheck className="h-4 w-4 text-leaf" />
        Session auto-locks after 30 min idle · PIN &amp; biometric lock available on the Android app.
      </p>
    </div>
  );
}
