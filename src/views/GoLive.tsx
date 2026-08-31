import { useEffect, useMemo, useState } from "react";
import schemaSql from "../../supabase/schema.sql?raw";
import { isCloudConfigured } from "../lib/supabase";
import { useStore } from "../lib/store";
import { Reveal } from "../components/ui";
import {
  IconCheck,
  IconCopy,
  IconDownload,
  IconExternal,
  IconPower,
  IconSync,
} from "../components/Icons";

const KEY = "sukibook:golive";

const ENV_SNIPPET = `VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY`;

type StepDef = {
  id: string;
  n: string;
  title: string;
  desc: string;
  auto?: { done: boolean; label: string };
  link?: { href: string; label: string };
  schema?: boolean;
};

function CopyBtn({ text, label = "Copy" }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setOk(true);
          window.setTimeout(() => setOk(false), 1500);
        });
      }}
      className="btn-press inline-flex items-center gap-1.5 rounded-md border border-card/25 px-2.5 py-1.5 font-mono text-[11px] font-bold text-card transition hover:bg-card/10"
    >
      {ok ? <IconCheck className="h-3.5 w-3.5 text-leaf" /> : <IconCopy className="h-3.5 w-3.5" />}
      {ok ? "Copied" : label}
    </button>
  );
}

export default function GoLiveView() {
  const { db, cloud, settings, notify } = useStore();
  const [checks, setChecks] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? "{}");
    } catch {
      return {};
    }
  });
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(checks));
  }, [checks]);

  const envOk = isCloudConfigured();
  const live = cloud.mode === "cloud";
  const stage = live ? 2 : envOk ? 1 : 0;

  const tls = window.location.protocol === "https:" || window.location.hostname === "localhost";
  const swOk = "serviceWorker" in navigator;

  const steps: StepDef[] = useMemo(
    () => [
      {
        id: "project",
        n: "01",
        title: "Create the Supabase project",
        desc: "Free tier · region Singapore · save the DB password somewhere safe.",
        link: { href: "https://supabase.com/dashboard", label: "Open Supabase" },
      },
      {
        id: "schema",
        n: "02",
        title: "Run schema.sql in the SQL Editor",
        desc: "Creates the 5 tables, RLS policies, indexes and the photo bucket. One click of Run.",
        schema: true,
      },
      {
        id: "auth",
        n: "03",
        title: "Enable magic-link email auth",
        desc: "Authentication → Providers → Email → turn on Magic Link. Supabase sends the emails for free.",
        link: { href: "https://supabase.com/docs/guides/auth/email-login", label: "Auth docs" },
      },
      {
        id: "env",
        n: "04",
        title: "Add env vars to the build",
        desc: "Project Settings → API gives you both values. Vercel → Settings → Environment Variables, then redeploy.",
        auto: { done: envOk, label: envOk ? "detected in this build" : "waiting for VITE_SUPABASE_*" },
      },
      {
        id: "deploy",
        n: "05",
        title: "Deploy to Vercel",
        desc: "Import the repo (Vite preset) or git push to main. Build: npm run build → dist.",
        link: { href: "https://vercel.com/new", label: "New Vercel project" },
      },
      {
        id: "siteurl",
        n: "06",
        title: "Set the Site URL for redirects",
        desc: "Authentication → URL Configuration → your domain, so magic links land back in the app.",
      },
      {
        id: "signin",
        n: "07",
        title: "Sign in — production mode flips on",
        desc: "First login seeds the cloud store with the starter catalog; every login hydrates from Postgres.",
        auto: { done: live, label: live ? `signed in as ${cloud.email}` : "login gate active" },
      },
    ],
    [envOk, live, cloud.email],
  );

  const doneCount = steps.filter((s) => (s.auto ? s.auto.done : checks[s.id])).length;
  const progress = doneCount / steps.length;

  const downloadSchema = () => {
    const blob = new Blob([schemaSql], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "schema.sql";
    a.click();
    URL.revokeObjectURL(url);
  };

  const stages = [
    { label: "Demo", desc: "on-device data" },
    { label: "Configured", desc: "keys in place" },
    { label: "Live", desc: "cloud + RLS" },
  ];

  return (
    <div className="space-y-6">
      {/* masthead — the switch itself */}
      <Reveal>
        <div className="relative overflow-hidden rounded-2xl bg-pine text-card shadow-[0_24px_60px_-24px_rgba(11,39,27,0.55)]">
          <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(700px 300px at 85% 0%, rgba(246,168,28,0.18), transparent 60%)" }} />
          <div className="stripes-soft absolute inset-x-0 top-0 h-1.5" />
          <div className="relative flex flex-wrap items-center gap-6 px-6 py-7 md:px-8">
            <span className={`relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border transition ${live ? "border-leaf bg-leaf/20" : "border-mango/50 bg-mango/10"}`}>
              <IconPower className={`h-8 w-8 ${live ? "text-leaf" : "text-mango"}`} />
              {live && <span className="pulse-dot absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-leaf" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-mango">Production mode</p>
              <h1 className="mt-1 font-display text-3xl font-extrabold leading-tight md:text-4xl">
                {live ? "The store is live." : stage === 1 ? "Almost there — one flip away." : "Flip the switch."}
              </h1>
              <p className="mt-1.5 max-w-xl text-sm text-card/70">
                Seven steps from demo data to a real, RLS-secured store on Vercel + Supabase.
                Green checks are detected live — the rest are yours to tick off.
              </p>
            </div>
            {/* stage pipeline */}
            <div className="flex items-center gap-0">
              {stages.map((s, i) => (
                <div key={s.label} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 font-mono text-xs font-extrabold transition ${
                        i < stage
                          ? "border-leaf bg-leaf text-card"
                          : i === stage
                            ? "pulse-dot border-mango bg-mango text-pine-deep"
                            : "border-card/25 text-card/50"
                      }`}
                    >
                      {i < stage ? <IconCheck className="h-4 w-4" /> : i + 1}
                    </span>
                    <p className={`mt-1.5 text-[10px] font-extrabold uppercase tracking-wider ${i <= stage ? "text-mango" : "text-card/40"}`}>{s.label}</p>
                    <p className="text-[9px] text-card/40">{s.desc}</p>
                  </div>
                  {i < 2 && <span className={`mx-2 mb-7 h-0.5 w-8 rounded ${i < stage ? "bg-leaf" : "bg-card/20"}`} />}
                </div>
              ))}
            </div>
          </div>
          {/* environment chips */}
          <div className="relative flex flex-wrap items-center gap-2 border-t border-card/10 px-6 py-3 md:px-8">
            {[
              { ok: true, label: "Vercel build · prod bundle" },
              { ok: tls, label: tls ? "TLS (HTTPS)" : "TLS — needs HTTPS" },
              { ok: swOk, label: swOk ? "Offline cache (SW)" : "SW unsupported" },
              { ok: envOk, label: envOk ? "Supabase keys present" : "Supabase keys missing" },
              { ok: live, label: live ? "Authenticated session" : "Not signed in" },
            ].map((c) => (
              <span key={c.label} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-bold ${c.ok ? "bg-leaf/15 text-leaf" : "bg-card/10 text-card/50"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${c.ok ? "bg-leaf" : "bg-card/40"}`} />
                {c.label}
              </span>
            ))}
            <span className="tnum ml-auto font-mono text-[11px] font-bold text-mango">
              {doneCount}/{steps.length} ready
            </span>
          </div>
        </div>
      </Reveal>

      <div className="grid gap-5 lg:grid-cols-12">
        {/* checklist */}
        <div className="space-y-3 lg:col-span-7">
          <div className="h-2 overflow-hidden rounded-full bg-line">
            <div className="width-grow h-full rounded-full bg-mango transition-all duration-700" style={{ width: `${progress * 100}%` }} />
          </div>
          {steps.map((s, idx) => {
            const isAuto = !!s.auto;
            const on = isAuto ? s.auto!.done : !!checks[s.id];
            return (
              <Reveal key={s.id} delay={idx * 50}>
                <div className={`rounded-xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${on ? "border-leaf/50 bg-leaf-soft/40" : "border-line bg-card"}`}>
                  <div className="flex items-start gap-3.5">
                    <button
                      onClick={() => {
                        if (isAuto) return;
                        setChecks((prev) => ({ ...prev, [s.id]: !prev[s.id] }));
                      }}
                      aria-label={`Toggle step ${s.title}`}
                      className={`btn-press mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-extrabold transition ${
                        on
                          ? "bg-leaf text-card"
                          : isAuto
                            ? "cursor-default bg-paper text-ink-soft"
                            : "bg-pine text-mango hover:bg-pine-deep"
                      }`}
                    >
                      {on ? <IconCheck className="h-4 w-4" /> : s.n}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-display text-base font-extrabold leading-tight">{s.title}</h2>
                        {isAuto && (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${on ? "bg-leaf text-card" : "bg-mango-soft text-mango-deep"}`}>
                            {on && <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-card" />}
                            auto · {s.auto!.label}
                          </span>
                        )}
                        {on && !isAuto && <span className="rounded-full bg-leaf-soft px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-leaf">done</span>}
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-ink-soft">{s.desc}</p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        {s.link && (
                          <a
                            href={s.link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-press inline-flex items-center gap-1.5 rounded-md border border-line bg-paper px-2.5 py-1.5 text-[11px] font-bold text-pine transition hover:border-pine hover:bg-pine-soft"
                          >
                            <IconExternal className="h-3.5 w-3.5" /> {s.link.label}
                          </a>
                        )}
                        {s.schema && (
                          <>
                            <button onClick={downloadSchema} className="btn-press inline-flex items-center gap-1.5 rounded-md bg-pine px-2.5 py-1.5 text-[11px] font-extrabold text-mango transition hover:bg-pine-deep">
                              <IconDownload className="h-3.5 w-3.5" /> schema.sql
                            </button>
                            <CopyBtn text={schemaSql} label="Copy SQL" />
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* side column */}
        <div className="space-y-5 lg:col-span-5">
          {/* env reference */}
          <Reveal delay={80}>
            <div className="overflow-hidden rounded-xl border border-pine-deep bg-pine-deep shadow-sm">
              <div className="flex items-center justify-between border-b border-card/10 px-4 py-2.5">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-mango">.env — Vercel build vars</span>
                <CopyBtn text={ENV_SNIPPET} />
              </div>
              <pre className="overflow-x-auto px-4 py-3.5 font-mono text-[11px] leading-relaxed text-[#d8e5d5]">{ENV_SNIPPET}</pre>
              <p className="border-t border-card/10 px-4 py-2.5 text-[10px] leading-relaxed text-card/50">
                Values live in Supabase → Project Settings → API. The anon key is safe for the browser — RLS does the locking.
              </p>
            </div>
          </Reveal>

          {/* current state */}
          <Reveal delay={140}>
            {live ? (
              <div className="rounded-xl border border-leaf/50 bg-leaf-soft/50 p-5 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-leaf text-card">
                    <IconPower className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="font-display text-lg font-extrabold text-pine">Production mode ON</h2>
                    <p className="font-mono text-[11px] text-ink-soft">{cloud.email}</p>
                  </div>
                </div>
                <ul className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {[
                    [db.products.length, "products"],
                    [db.sales.length, "sales"],
                    [db.customers.length, "suki"],
                  ].map(([v, l]) => (
                    <li key={l as string} className="rounded-lg bg-card px-2 py-2.5">
                      <p className="tnum font-mono text-lg font-extrabold text-pine">{(v as number).toLocaleString()}</p>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-ink-soft">{l} synced</p>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-ink-soft">
                  <IconSync className="mt-0.5 h-3.5 w-3.5 shrink-0 text-leaf" />
                  Every tap debounces ~1.5 s into Postgres under your store_id. Offline changes queue on-device and sync on the next action.
                </p>
              </div>
            ) : envOk ? (
              <div className="rounded-xl border border-mango/50 bg-mango-soft/60 p-5 shadow-sm">
                <h2 className="font-display text-lg font-extrabold">Configured — now sign in</h2>
                <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                  Keys are baked into this build. Reload and the login gate appears — first magic-link login seeds the
                  cloud store and production mode flips on.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="btn-press mt-3 inline-flex items-center gap-2 rounded-lg bg-pine px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-mango transition hover:bg-pine-deep"
                >
                  <IconPower className="h-4 w-4" /> Reload to sign in
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-line bg-card p-5 shadow-sm">
                <h2 className="font-display text-lg font-extrabold">Still in demo mode</h2>
                <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                  This build has no Supabase keys, so it runs on seeded on-device data — perfect for poking around.
                  Add the two env vars (left), redeploy, and the gate appears.
                </p>
                <p className="mt-3 rounded-lg bg-paper px-3 py-2 font-mono text-[10px] text-ink-soft">
                  demo data never leaves this browser
                </p>
              </div>
            )}
          </Reveal>

          {/* what flips */}
          <Reveal delay={200}>
            <div className="rounded-xl border border-line bg-card p-5 shadow-sm">
              <h2 className="font-display text-lg font-extrabold">What flips when you go live</h2>
              <ul className="mt-3 space-y-2.5">
                {[
                  ["Login gate replaces the open demo", "magic-link email via Supabase Auth"],
                  ["Starter catalog seeds your cloud store", "first login only, then cloud wins"],
                  ["Row-level security per store", "store_id = auth.uid() on every table"],
                  ["Sales, stock & utang sync ~1.5 s after each tap", "one atomic RPC, last write wins"],
                  ["Theme, language & role travel with the account", "settings live in sb_settings"],
                ].map(([a, b]) => (
                  <li key={a} className="flex items-start gap-2.5 text-xs">
                    <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-mango text-pine-deep">
                      <IconCheck className="h-2.5 w-2.5" />
                    </span>
                    <span>
                      <span className="font-bold">{a}</span>
                      <span className="block text-ink-soft">{b}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 border-t border-line pt-3 text-[11px] text-ink-soft">
                Full depth in the <button onClick={() => notify("info", "Tip", "Open the Deploy tab for the complete runbook")} className="font-bold text-pine underline decoration-mango decoration-2 underline-offset-2">Deploy runbook</button> and <span className="font-mono font-bold">DEPLOYMENT.md</span>.
              </p>
            </div>
          </Reveal>
        </div>
      </div>

      <p className="text-center font-mono text-[11px] text-ink-soft">
        {settings.storeName} · walang downtime ang pag-flip — demo and live share one codebase.
      </p>
    </div>
  );
}
