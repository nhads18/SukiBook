import { useState } from "react";
import { useStore } from "../lib/store";
import { Field, Modal, Reveal, Seg } from "../components/ui";
import { IconCheck, IconGear, IconSheets, IconSync, IconUsers } from "../components/Icons";
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

const TEAM = [
  { name: "Aling Nena", role: "Owner", tint: "bg-mango text-pine-deep", desc: "Full access — sales, profit, utang, settings" },
  { name: "Kuya Jojo", role: "Helper", tint: "bg-leaf-soft text-leaf", desc: "Records sales & stock · hindi nakikita ang profit" },
  { name: "Ate Len", role: "Accountant", tint: "bg-gcash-soft text-gcash", desc: "View-only reports & exports for BIR" },
];

export default function SettingsView() {
  const { settings, updateSettings, notify, resetDemo } = useStore();
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
              <p className="text-xs text-ink-soft">Role-based access — helpers can't see profit</p>
            </div>
            <button
              onClick={() => notify("info", "Invite link copied", "Send it to your helper's phone")}
              className="btn-press inline-flex items-center gap-1.5 rounded-md bg-pine px-3 py-1.5 text-[11px] font-extrabold text-mango transition hover:bg-pine-deep"
            >
              <IconUsers className="h-3.5 w-3.5" /> Invite
            </button>
          </div>
          <ul className="space-y-2.5">
            {TEAM.map((m) => (
              <li key={m.name} className="flex items-center gap-3 rounded-lg border border-line bg-paper/60 px-3.5 py-2.5 transition hover:bg-pine-soft/50">
                <span className={`flex h-9 w-9 items-center justify-center rounded-full font-display text-xs font-extrabold ${m.tint}`}>
                  {m.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{m.name}</p>
                  <p className="truncate text-[11px] text-ink-soft">{m.desc}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${m.tint}`}>{m.role}</span>
              </li>
            ))}
          </ul>
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
