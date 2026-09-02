import { useEffect, useState } from "react";
import SCHEMA from "../../supabase/schema.sql?raw";
import { downloadCSV } from "../lib/data";
import { useStore } from "../lib/store";
import { Reveal } from "../components/ui";
import { IconCheck, IconCopy, IconDownload, IconPower } from "../components/Icons";

type Step = {
  id: string;
  n: string;
  title: string;
  desc: string;
  auto?: () => boolean;
  link?: { label: string; href: string };
};

const ENV_TEXT = `VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY`;

export default function GoLiveView() {
  const { cloud, notify, db } = useStore();
  const [checks, setChecks] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem("sukibook-golive-checks") ?? "{}");
    } catch {
      return {};
    }
  });
  useEffect(() => {
    localStorage.setItem("sukibook-golive-checks", JSON.stringify(checks));
  }, [checks]);

  const [copied, setCopied] = useState<"env" | "schema" | null>(null);
  const copy = async (kind: "env" | "schema", text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      notify("warn", "Copy failed", "Select and copy manually");
    }
  };

  const steps: Step[] = [
    {
      id: "project", n: "1", title: "Create the Supabase project",
      desc: "supabase.com → New project → region Singapore. Save the DB password somewhere safe.",
      link: { label: "Open Supabase", href: "https://supabase.com/dashboard" },
    },
    {
      id: "schema", n: "2", title: "Run the schema",
      desc: "SQL Editor → New query → paste schema.sql → Run. Creates 5 RLS-protected tables, the atomic sb_push_store RPC and the photo bucket.",
    },
    {
      id: "auth", n: "3", title: "Enable magic-link email",
      desc: "Authentication → Providers → Email. Keep “Confirm email” on; magic links are the whole login flow.",
    },
    {
      id: "env", n: "4", title: "Add env vars to Vercel",
      desc: "Project Settings → Environment Variables. Both values are under Supabase → Project Settings → API.",
      auto: () => cloud.configured,
    },
    {
      id: "deploy", n: "5", title: "Deploy to Vercel",
      desc: "Import the GitHub repo. Vite preset, output dist. Every push to main redeploys in ~1 minute.",
      link: { label: "Vercel → New project", href: "https://vercel.com/new" },
    },
    {
      id: "url", n: "6", title: "Set the Site URL",
      desc: "Supabase → Authentication → URL Configuration → your Vercel domain. Magic links redirect back correctly.",
    },
    {
      id: "signin", n: "7", title: "Sign in for real",
      desc: "First login seeds your cloud store with the starter catalog; every later tap syncs up within ~1.5 s.",
      auto: () => cloud.mode === "cloud",
    },
  ];

  const done = (s: Step) => (s.auto ? s.auto() : !!checks[s.id]);
  const doneCount = steps.filter(done).length;
  const stage = cloud.mode === "cloud" ? 2 : cloud.configured ? 1 : 0;

  const downloadSchema = () => {
    const blob = new Blob([SCHEMA], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "schema.sql";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  void downloadCSV;

  return (
    <div className="space-y-6">
      {/* status header */}
      <Reveal>
        <div className="relative overflow-hidden rounded-2xl bg-pine text-card shadow-md">
          <div className="stripes-soft absolute inset-x-0 top-0 h-1.5" />
          <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(640px 280px at 85% 0%, color-mix(in srgb, var(--color-mango) 18%, transparent), transparent 60%)" }} />
          <div className="relative flex flex-wrap items-end justify-between gap-5 px-6 py-6">
            <div>
              <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-mango/40 bg-mango/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-mango">
                <IconPower className="h-3.5 w-3.5" /> Production mode
              </p>
              <h2 className="font-display text-3xl font-extrabold leading-tight">
                Go <span className="text-mango">live</span> in seven steps
              </h2>
              <p className="mt-1.5 max-w-xl text-sm text-card/70">
                This build runs in two modes — <span className="font-semibold text-card">demo</span> (on-device data) and{" "}
                <span className="font-semibold text-card">live</span> (Supabase). Tick through the checklist; steps 4 and 7 detect themselves.
              </p>
            </div>
            <div className="min-w-56">
              <div className="flex items-baseline justify-between text-[11px] font-bold uppercase tracking-wider text-card/60">
                <span>Ready</span>
                <span className="tnum font-mono text-mango">{doneCount}/{steps.length}</span>
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-pine-deep">
                <div className="h-full rounded-full bg-mango transition-all duration-500" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
              </div>
            </div>
          </div>

          {/* pipeline */}
          <div className="relative flex flex-wrap gap-2 border-t border-card/10 px-6 py-3.5">
            {["Demo — on-device data", "Configured — keys baked in", "Live — signed in & syncing"].map((label, i) => (
              <span
                key={label}
                className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-bold ${
                  i === stage ? "bg-mango text-pine-deep" : i < stage ? "bg-card/15 text-mango" : "bg-card/5 text-card/40"
                }`}
              >
                {i < stage ? <IconCheck className="h-3 w-3" /> : <span className={`h-1.5 w-1.5 rounded-full ${i === stage ? "pulse-dot bg-pine-deep" : "bg-card/30"}`} />}
                {label}
              </span>
            ))}
          </div>
        </div>
      </Reveal>

      <div className="grid gap-5 lg:grid-cols-12">
        {/* steps */}
        <div className="space-y-3 lg:col-span-7">
          {steps.map((s, idx) => {
            const on = done(s);
            return (
              <Reveal key={s.id} delay={idx * 50}>
                <div className={`flex items-start gap-3.5 rounded-xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${on ? "border-leaf/50 bg-card" : "border-line bg-card"}`}>
                  <button
                    onClick={() => {
                      if (!s.auto) setChecks((prev) => ({ ...prev, [s.id]: !prev[s.id] }));
                    }}
                    disabled={!!s.auto}
                    aria-label={`Toggle step ${s.n}`}
                    className={`btn-press mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-extrabold transition ${
                      on ? "bg-leaf text-card" : s.auto ? "cursor-default bg-paper text-ink-soft" : "bg-pine text-mango hover:bg-pine-deep"
                    }`}
                  >
                    {on ? <IconCheck className="h-4 w-4" /> : s.n}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-base font-extrabold">{s.title}</h3>
                      {s.auto && (
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${on ? "bg-leaf-soft text-leaf" : "bg-paper text-ink-soft"}`}>
                          {on ? "auto · detected" : "auto · pending"}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-ink-soft">{s.desc}</p>
                    {s.link && (
                      <a href={s.link.href} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-bold text-mango-deep underline decoration-mango decoration-2 underline-offset-2 transition hover:text-pine">
                        {s.link.label} ↗
                      </a>
                    )}
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* side: schema + env + status */}
        <div className="space-y-5 lg:col-span-5">
          <Reveal delay={60}>
            <div className="rounded-xl border border-line bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-base font-extrabold">schema.sql</h3>
                <div className="flex gap-1.5">
                  <button onClick={() => copy("schema", SCHEMA)} className="btn-press inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 font-mono text-[10px] font-bold text-ink-soft transition hover:border-pine hover:text-pine">
                    {copied === "schema" ? <IconCheck className="h-3 w-3 text-leaf" /> : <IconCopy className="h-3 w-3" />}
                    {copied === "schema" ? "Copied" : "Copy"}
                  </button>
                  <button onClick={downloadSchema} className="btn-press inline-flex items-center gap-1.5 rounded-md bg-pine px-2.5 py-1.5 font-mono text-[10px] font-bold text-mango transition hover:bg-pine-deep">
                    <IconDownload className="h-3 w-3" /> Download
                  </button>
                </div>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
                The exact file from the repo — tables, RLS policies, the atomic push RPC and the photo bucket. Paste into the SQL Editor and run once.
              </p>
            </div>
          </Reveal>

          <Reveal delay={110}>
            <div className="overflow-hidden rounded-xl border border-line bg-card shadow-sm">
              <div className="flex items-center justify-between border-b border-line px-5 py-3">
                <h3 className="font-display text-base font-extrabold">Vercel env vars</h3>
                <button onClick={() => copy("env", ENV_TEXT)} className="btn-press inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 font-mono text-[10px] font-bold text-ink-soft transition hover:border-pine hover:text-pine">
                  {copied === "env" ? <IconCheck className="h-3 w-3 text-leaf" /> : <IconCopy className="h-3 w-3" />}
                  {copied === "env" ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="overflow-x-auto bg-pine-deep px-5 py-4 font-mono text-[11px] leading-relaxed text-[#d8e5d5]">{ENV_TEXT}</pre>
              <p className="px-5 py-3 text-[11px] leading-relaxed text-ink-soft">
                Without these the build runs the public demo; with them, it's the real product. Rebuild after adding.
              </p>
            </div>
          </Reveal>

          <Reveal delay={160}>
            <div className={`rounded-xl border p-5 shadow-sm ${stage === 2 ? "border-leaf/50 bg-leaf-soft/50" : "border-line bg-card"}`}>
              <h3 className="font-display text-base font-extrabold">This deployment</h3>
              {stage === 2 ? (
                <div className="pop mt-3 rounded-lg bg-leaf p-4 text-card">
                  <p className="flex items-center gap-2 font-display text-sm font-extrabold">
                    <IconCheck className="h-4 w-4" /> LIVE — {cloud.email}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-card/85">
                    {db.products.length} products · {db.sales.length} sales · {db.customers.length} suki — every change pushes to Supabase ~1.5 s after the tap.
                  </p>
                </div>
              ) : stage === 1 ? (
                <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                  Supabase keys are baked into this build. <span className="font-bold text-ink">Reload the app</span> and the magic-link login gate appears — one sign-in flips this panel to live.
                </p>
              ) : (
                <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                  Running in <span className="font-bold text-mango-deep">demo mode</span> — seeded data lives in this browser only. Complete steps 1–5 and this build becomes the production app.
                </p>
              )}
              <ul className="mt-4 space-y-1.5 text-[11px]">
                {[
                  ["Production bundle", import.meta.env.PROD],
                  ["Secure context (TLS)", window.location.protocol === "https:" || window.location.hostname === "localhost"],
                  ["Supabase configured", cloud.configured],
                  ["Signed in", cloud.mode === "cloud"],
                ].map(([label, ok]) => (
                  <li key={label as string} className="flex items-center justify-between rounded-md bg-paper/70 px-2.5 py-1.5">
                    <span className="font-medium text-ink-soft">{label as string}</span>
                    <span className={`flex items-center gap-1 font-mono text-[10px] font-bold ${ok ? "text-leaf" : "text-ink-soft"}`}>
                      {ok ? <IconCheck className="h-3 w-3" /> : "—"} {ok ? "yes" : "no"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
