import { useEffect, useState } from "react";
import { useStore } from "../lib/store";
import { Reveal } from "../components/ui";
import { IconCheck, IconCopy, IconRocket, IconSync } from "../components/Icons";

function SectionHead({ eyebrow, title, desc }: { eyebrow: string; title: string; desc?: string }) {
  return (
    <div className="mb-4">
      <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-mango-deep">{eyebrow}</p>
      <h3 className="font-display text-lg font-extrabold leading-tight">{title}</h3>
      {desc && <p className="mt-1 max-w-xl text-xs text-ink-soft">{desc}</p>}
    </div>
  );
}

/* ----------------------------- content ----------------------------- */

type Phase = {
  id: string;
  n: string;
  title: string;
  time: string;
  blurb: string;
  items: string[];
  code?: { label: string; text: string };
};

const PHASES: Phase[] = [
  {
    id: "local",
    n: "01",
    title: "Develop locally",
    time: "~30 min",
    blurb: "Clone, install, and boot both halves of the system on your machine.",
    items: [
      "Node.js 18+ and Git installed",
      "npm install → npm run dev (dashboard on :5173)",
      "sukibook-api boots on :8080 with a local Postgres",
      "npm run build passes, typecheck clean",
    ],
    code: {
      label: "terminal",
      text: "git clone https://github.com/you/sukibook.git\ncd sukitab && npm install\nnpm run dev        # web dashboard\nnpm run build      # production → dist/",
    },
  },
  {
    id: "db",
    n: "02",
    title: "Provision PostgreSQL",
    time: "~15 min",
    blurb: "One database serves mobile and web — proper relations as the store count grows.",
    items: [
      "Create Postgres 14+ (Railway plugin, Render, or Neon)",
      "Run schema: products, customers, sales, sale_items, stock_movements, utang_entries, users, activity_log",
      "Add indexes on sales(ts), stock_movements(product_id, ts), utang_entries(customer_id, ts)",
      "Save DATABASE_URL for the API",
    ],
    code: {
      label: "psql",
      text: "create table products (id text primary key, name text,\n  cat text, price numeric(10,2), cost numeric(10,2),\n  stock int, updated_at timestamptz default now());\ncreate table sales (id text primary key, payment text,\n  total numeric(10,2), ts timestamptz default now());\ncreate index on sales (ts);",
    },
  },
  {
    id: "api",
    n: "03",
    title: "Ship the API (Railway)",
    time: "~20 min",
    blurb: "Node.js + Express on Railway (or Render) — one backend for both platforms.",
    items: [
      "Deploy sukibook-api from GitHub — start command auto-detected",
      "Set DATABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CORS_ORIGIN",
      "Add SEMAPHORE_API_KEY + Cloudinary keys for SMS & photos",
      "Healthcheck green on GET /health",
    ],
    code: {
      label: ".env (server only)",
      text: "DATABASE_URL=postgres://user:pass@host:5432/sukibook\nSUPABASE_SERVICE_ROLE_KEY=***\nSEMAPHORE_API_KEY=***\nGOOGLE_SHEETS_ID=***\nSYNC_SHEETS_EVERY_MS=3600000\nSESSION_TIMEOUT_MIN=30",
    },
  },
  {
    id: "web",
    n: "04",
    title: "Deploy web to Vercel",
    time: "~10 min",
    blurb: "Static Vite build, instant rollbacks, automatic SSL on your domain.",
    items: [
      "Import repo → framework preset: Vite → output dist",
      "Add VITE_API_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY",
      "Connect domain (A/CNAME) — SSL issues automatically",
      "PWA enabled: installable, cached reports work offline",
    ],
    code: {
      label: ".env.production",
      text: "VITE_API_URL=https://api.sukibook.ph\nVITE_SUPABASE_URL=https://<project>.supabase.co\nVITE_SUPABASE_ANON_KEY=<anon-key>\nVITE_LOW_STOCK_THRESHOLD=5",
    },
  },
  {
    id: "integrations",
    n: "05",
    title: "Wire integrations",
    time: "~1 hr",
    blurb: "Sheets for the owners' eyes, Semaphore for utang reminders, Drive for backups.",
    items: [
      "Google service account created; sheet shared as Editor",
      "Hourly Sheets sync job verified (products / sales / utang tabs)",
      "Semaphore credits loaded; test SMS received on a real phone",
      "Nightly pg_dump → encrypted upload to Drive folder (30-day retention)",
    ],
  },
  {
    id: "harden",
    n: "06",
    title: "Harden & go live",
    time: "~1 day",
    blurb: "Security, pilots, and monitoring before the first 100 stores.",
    items: [
      "Rate limiting + input validation on every write endpoint",
      "Row-level security per role: owner / helper / accountant",
      "Session timeout 30 min, activity log on, remote logout tested",
      "Pilot with 3 stores; test ₱3–5k Androids on throttled 3G",
      "Uptime ping on /health, Sentry wired, backup restore drill done",
    ],
  },
];

const COSTS = [
  { item: "Vercel (web hosting)", min: 0, max: 500 },
  { item: "Railway / Render (API)", min: 500, max: 1000 },
  { item: "PostgreSQL", min: 500, max: 1000 },
  { item: "Google Sheets API", min: 0, max: 0 },
  { item: "Google Drive backups", min: 1000, max: 1000 },
  { item: "Semaphore SMS gateway", min: 1000, max: 2000 },
  { item: "Domain & SSL", min: 100, max: 100 },
];

/* --------------------------- small pieces -------------------------- */

function CodeBlock({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable — no-op */
    }
  };
  return (
    <div className="overflow-hidden rounded-lg border border-pine-deep bg-pine-deep">
      <div className="flex items-center justify-between border-b border-card/10 px-3 py-1.5">
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-mango">{label}</span>
        <button
          onClick={copy}
          className="btn-press flex items-center gap-1.5 rounded px-2 py-1 font-mono text-[10px] font-bold text-card/70 transition hover:bg-card/10 hover:text-card"
        >
          {copied ? <IconCheck className="h-3 w-3 text-leaf" /> : <IconCopy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto px-3.5 py-3 font-mono text-[11px] leading-relaxed text-[#d8e5d5]">{text}</pre>
    </div>
  );
}

function ArchDiagram() {
  return (
    <svg viewBox="0 0 760 250" className="w-full">
      <defs>
        <marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L8,4 L0,8 z" fill="#103524" />
        </marker>
      </defs>
      {/* nodes */}
      {[
        { x: 20, y: 30, w: 150, h: 62, t1: "Android app", t2: "React Native · SQLite", c: "#103524" },
        { x: 20, y: 158, w: 150, h: 62, t1: "Web dashboard", t2: "React + Vite · PWA", c: "#103524" },
        { x: 300, y: 94, w: 170, h: 62, t1: "Express API", t2: "Railway / Render", c: "#f6a81c" },
        { x: 590, y: 30, w: 150, h: 62, t1: "PostgreSQL", t2: "source of truth", c: "#103524" },
        { x: 590, y: 158, w: 150, h: 62, t1: "Google Sheets", t2: "hourly sync", c: "#103524" },
      ].map((n, i) => (
        <g key={i}>
          <rect x={n.x} y={n.y} width={n.w} height={n.h} rx="10" fill={n.c} />
          <text x={n.x + n.w / 2} y={n.y + 27} textAnchor="middle" fill={n.c === "#f6a81c" ? "#0b271b" : "#f6a81c"} fontSize="14" fontWeight="800" fontFamily="Bricolage Grotesque, sans-serif">
            {n.t1}
          </text>
          <text x={n.x + n.w / 2} y={n.y + 45} textAnchor="middle" fill={n.c === "#f6a81c" ? "#0b271b" : "#fcfcf7"} opacity="0.75" fontSize="10" fontFamily="Spline Sans Mono, monospace">
            {n.t2}
          </text>
        </g>
      ))}
      {/* side services */}
      {[
        { x: 300, y: 200, w: 170, h: 34, t: "Semaphore SMS · Cloudinary · Drive" },
      ].map((n, i) => (
        <g key={i}>
          <rect x={n.x} y={n.y} width={n.w} height={n.h} rx="17" fill="none" stroke="#103524" strokeWidth="1.5" strokeDasharray="4 4" />
          <text x={n.x + n.w / 2} y={n.y + 21} textAnchor="middle" fill="#4c5c51" fontSize="10" fontWeight="700" fontFamily="Instrument Sans, sans-serif">
            {n.t}
          </text>
        </g>
      ))}
      {/* connectors */}
      <path d="M170,61 C240,61 240,115 300,120" fill="none" stroke="#103524" strokeWidth="2" markerEnd="url(#arr)" className="flow-dash" />
      <path d="M170,189 C240,189 240,135 300,130" fill="none" stroke="#103524" strokeWidth="2" markerEnd="url(#arr)" className="flow-dash" />
      <path d="M470,110 C530,95 540,61 590,61" fill="none" stroke="#103524" strokeWidth="2" markerEnd="url(#arr)" className="flow-dash" />
      <path d="M470,140 C530,155 540,189 590,189" fill="none" stroke="#c9a24b" strokeWidth="2" strokeDasharray="5 5" markerEnd="url(#arr)" className="flow-dash" />
      <path d="M385,156 L385,200" fill="none" stroke="#c9a24b" strokeWidth="1.5" strokeDasharray="4 4" />
      <text x="505" y="84" fontSize="10" fontFamily="Spline Sans Mono, monospace" fill="#4c5c51">real-time</text>
      <text x="505" y="176" fontSize="10" fontFamily="Spline Sans Mono, monospace" fill="#c9a24b">every hour</text>
    </svg>
  );
}

/* ------------------------------- view ------------------------------ */

export default function DeployView() {
  const { settings } = useStore();
  const slug = settings.storeName.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 12) || "sukibook";

  const [checks, setChecks] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem("sukibook-deploy-checks") ?? "{}");
    } catch {
      return {};
    }
  });
  useEffect(() => {
    localStorage.setItem("sukibook-deploy-checks", JSON.stringify(checks));
  }, [checks]);

  const allItems = PHASES.flatMap((p) => p.items.map((it) => `${p.id}:${it}`));
  const doneCount = allItems.filter((k) => checks[k]).length;
  const progress = allItems.length > 0 ? doneCount / allItems.length : 0;

  const [stores, setStores] = useState(100);
  const costMin = COSTS.reduce((s, c) => s + c.min, 0);
  const costMax = COSTS.reduce((s, c) => s + c.max, 0);
  const perMin = Math.round(costMin / stores);
  const perMax = Math.ceil(costMax / stores);
  const marginMin = 199 - perMax;
  const marginMax = 299 - perMin;

  return (
    <div className="space-y-6">
      {/* runbook header */}
      <Reveal>
        <div className="relative overflow-hidden rounded-xl bg-pine text-card shadow-md">
          <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(600px 260px at 85% 0%, rgba(246,168,28,0.16), transparent 60%)" }} />
          <div className="relative flex flex-wrap items-end justify-between gap-4 px-6 py-6">
            <div>
              <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-mango/40 bg-mango/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-mango">
                <IconRocket className="h-3.5 w-3.5" /> Deployment runbook
              </p>
              <h2 className="font-display text-3xl font-extrabold leading-tight">
                From <span className="text-mango">localhost</span> to {slug}.ph
              </h2>
              <p className="mt-1.5 max-w-xl text-sm text-card/70">
                Six phases, roughly one afternoon of work. Full detail lives in <span className="font-mono text-mango">DEPLOYMENT.md</span> in the repo —
                tick items off here as you ship.
              </p>
            </div>
            <div className="min-w-56">
              <div className="flex items-baseline justify-between text-[11px] font-bold uppercase tracking-wider text-card/60">
                <span>Progress</span>
                <span className="tnum font-mono text-mango">{doneCount}/{allItems.length}</span>
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-pine-deep">
                <div className="width-grow h-full rounded-full bg-mango transition-all duration-500" style={{ width: `${progress * 100}%` }} />
              </div>
              <p className="mt-1.5 text-[11px] text-card/60">
                {progress === 1 ? "Naka-deploy na — congrats! 🎉" : progress > 0 ? "Padayon — you're shipping." : "Walang in-progress — start with phase 01."}
              </p>
            </div>
          </div>
        </div>
      </Reveal>

      {/* architecture */}
      <Reveal delay={80}>
        <div className="rounded-xl border border-line bg-card p-5 shadow-sm">
          <SectionHead eyebrow="Architecture" title="One backend, two fronts" desc="Mobile for action, web for insight — both read the same PostgreSQL, with Sheets as the owners' familiar mirror." />
          <ArchDiagram />
        </div>
      </Reveal>

      {/* phases */}
      <div className="grid gap-4 md:grid-cols-2">
        {PHASES.map((p, idx) => {
          const phaseDone = p.items.every((it) => checks[`${p.id}:${it}`]);
          return (
            <Reveal key={p.id} delay={idx * 60}>
              <div className={`flex h-full flex-col rounded-xl border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${phaseDone ? "border-leaf/50" : "border-line"}`}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-lg font-mono text-sm font-extrabold ${phaseDone ? "bg-leaf text-card" : "bg-pine text-mango"}`}>
                      {phaseDone ? <IconCheck className="h-5 w-5" /> : p.n}
                    </span>
                    <div>
                      <h3 className="font-display text-base font-extrabold leading-tight">{p.title}</h3>
                      <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-mango-deep">{p.time}</p>
                    </div>
                  </div>
                  {phaseDone && <span className="rounded-full bg-leaf-soft px-2 py-0.5 text-[10px] font-extrabold uppercase text-leaf">Done</span>}
                </div>
                <p className="mb-3 text-xs leading-relaxed text-ink-soft">{p.blurb}</p>
                <ul className="mb-4 space-y-1.5">
                  {p.items.map((it) => {
                    const key = `${p.id}:${it}`;
                    const on = !!checks[key];
                    return (
                      <li key={it}>
                        <button
                          onClick={() => setChecks((prev) => ({ ...prev, [key]: !prev[key] }))}
                          className={`btn-press flex w-full items-start gap-2.5 rounded-md px-2 py-1.5 text-left text-xs transition ${on ? "text-ink-soft line-through decoration-mango/60" : "text-ink"} hover:bg-paper`}
                        >
                          <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${on ? "border-leaf bg-leaf text-card" : "border-line bg-card"}`}>
                            {on && <IconCheck className="h-2.5 w-2.5" />}
                          </span>
                          {it}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {p.code && (
                  <div className="mt-auto">
                    <CodeBlock label={p.code.label} text={p.code.text} />
                  </div>
                )}
              </div>
            </Reveal>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        {/* cost model */}
        <Reveal className="lg:col-span-7">
          <div className="h-full rounded-xl border border-line bg-card p-5 shadow-sm">
            <SectionHead eyebrow="Cost model" title="Economics at scale" desc="Slide the store count — the business plan targets ₱199–₱299/month per store." />
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="uppercase tracking-wider text-ink-soft">Stores onboarded</span>
                <span className="tnum rounded-md bg-pine px-2.5 py-1 font-mono text-sm text-mango">{stores}</span>
              </div>
              <input type="range" min={10} max={500} step={10} value={stores} onChange={(e) => setStores(parseInt(e.target.value, 10))} className="mt-2 w-full accent-mango" />
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-line">
                {COSTS.map((c) => (
                  <tr key={c.item}>
                    <td className="py-1.5 font-medium">{c.item}</td>
                    <td className="tnum py-1.5 text-right font-mono text-xs text-ink-soft">
                      {c.min === 0 && c.max === 0 ? "Free" : `₱${c.min.toLocaleString()}–${c.max.toLocaleString()}`}
                    </td>
                  </tr>
                ))}
                <tr className="font-bold">
                  <td className="py-2.5">Monthly total</td>
                  <td className="tnum py-2.5 text-right font-mono">₱{costMin.toLocaleString()}–{costMax.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="pb-1 text-xs text-ink-soft">Cost per store at {stores} stores</td>
                  <td className="tnum pb-1 text-right font-mono text-xs font-bold text-cherry">₱{perMin}–{perMax}</td>
                </tr>
                <tr>
                  <td className="pb-1 text-xs text-ink-soft">Margin per store @ ₱199–₱299</td>
                  <td className="tnum pb-1 text-right font-mono text-xs font-bold text-leaf">₱{marginMin}–{marginMax}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Reveal>

        {/* rollback + targets */}
        <Reveal delay={80} className="lg:col-span-5">
          <div className="flex h-full flex-col gap-5">
            <div className="rounded-xl border border-line bg-card p-5 shadow-sm">
              <h3 className="font-display text-base font-extrabold">Rollback plan</h3>
              <ul className="mt-2 space-y-2 text-xs text-ink-soft">
                <li className="flex gap-2"><span className="font-mono font-bold text-cherry">30s</span> Vercel instant rollback to the previous deployment</li>
                <li className="flex gap-2"><span className="font-mono font-bold text-cherry">2m</span> Redeploy the previous tagged API image on Railway</li>
                <li className="flex gap-2"><span className="font-mono font-bold text-cherry">15m</span> pg_restore from the latest nightly encrypted backup</li>
              </ul>
            </div>
            <div className="rounded-xl border border-line bg-card p-5 shadow-sm">
              <h3 className="font-display text-base font-extrabold">Success targets</h3>
              <ul className="mt-2 space-y-1.5 text-xs">
                {[
                  ["Web load", "< 2 s"],
                  ["Mobile load", "< 3 s"],
                  ["Sync error rate", "< 1%"],
                  ["Weekly dashboard usage", "≥ 60%"],
                  ["3-month retention", "75%"],
                ].map(([k, v]) => (
                  <li key={k} className="flex items-center justify-between rounded-md bg-paper/70 px-2.5 py-1.5">
                    <span className="font-medium text-ink-soft">{k}</span>
                    <span className="tnum font-mono font-bold text-pine">{v}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-pine p-4 text-card">
              <IconSync className="h-6 w-6 shrink-0 text-mango" />
              <p className="text-xs leading-relaxed">
                Full runbook with SQL schema, env var reference, Semaphore &amp; Sheets setup, and the security checklist:{" "}
                <span className="font-mono font-bold text-mango">DEPLOYMENT.md</span>
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
