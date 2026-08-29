import { useEffect, useState } from "react";
import { Reveal } from "../components/ui";
import {
  BadgeApple,
  BadgePlay,
  IconAlert,
  IconCheck,
  IconCopy,
  IconRocket,
} from "../components/Icons";

/* ------------------------------ content ---------------------------- */

const MATRIX: [string, string, string][] = [
  ["Developer account", "Play Console — $25 one-time (organization account recommended)", "Apple Developer Program — $99 / year"],
  ["Binary", "App Bundle (.aab) only; Play App Signing is mandatory for new apps", ".ipa built with the latest Xcode and current SDK"],
  ["Target SDK", "Latest Android API (35+ in 2026)", "Current iOS SDK; deployment target iOS 16+"],
  ["Privacy", "Data Safety form + public privacy-policy URL", "Privacy “nutrition labels” + policy URL; export-compliance question"],
  ["Beta track", "Internal → closed → open. New personal accounts: 20 testers for 14 days first", "TestFlight — 100 internal, 10,000 external testers"],
  ["Review time", "~1–7 days (longer for brand-new apps)", "Typically 24–48 hours"],
  ["Rollout control", "Staged rollout: 10% → 100%", "Phased release: automatic 7-day ramp"],
];

const CHANGES: { id: string; title: string; items: string[] }[] = [
  {
    id: "platform",
    title: "Platform & storage",
    items: [
      "Web localStorage → MMKV (react-native-mmkv) for app state",
      "Session tokens in Keychain (iOS) / Keystore (Android) via react-native-keychain",
      "PIN / fingerprint lock with expo-local-authentication (already in the spec)",
      "Adaptive icon + splash via expo-splash-screen",
    ],
  },
  {
    id: "sync",
    title: "Sync & updates",
    items: [
      "Keep the SQLite offline queue; add retry/backoff + a “last sync” chip",
      "EAS Update channels — dev / pilot / production — for OTA fixes without review",
      "minAppVersion endpoint on the API → force-update screen on stale builds",
    ],
  },
  {
    id: "pushcam",
    title: "Push & camera",
    items: [
      "FCM + APNs via Expo Notifications (low-stock & utang alerts replace web toasts)",
      "expo-camera for product photos (Phase 2 of the roadmap)",
      "Barcode scanning hook ready for Phase 4 (vision-camera)",
    ],
  },
  {
    id: "money",
    title: "Payments & SMS",
    items: [
      "Sell the ₱199–₱299 subscription on the web (Stripe, or Xendit/GCash) — skip 15–30% fees",
      "Google Play Billing only if you ever add true in-app purchases",
      "Keep Semaphore server-side — request zero SMS permissions",
    ],
  },
  {
    id: "compliance",
    title: "Compliance & listings",
    items: [
      "Public privacy-policy URL — mandatory, you store phone numbers and utang data",
      "Play Data Safety form + Apple privacy labels filled honestly",
      "IARC content rating in both consoles",
      "Tagalog + English store copy; ASO keywords: “sari-sari”, “tindahan”, “POS Philippines”",
    ],
  },
  {
    id: "ci",
    title: "CI & release",
    items: [
      "EAS build profiles: development / preview / production",
      "Play staged rollout + App Store phased release on every launch",
      "Sentry React Native + PostHog wired to the same events as the web dashboard",
      "versionCode / buildNumber auto-incremented by EAS on each build",
    ],
  },
];

const RADAR: { title: string; body: string; tag: string }[] = [
  {
    tag: "Google",
    title: "SMS permissions are poison",
    body: "Requesting SEND_SMS / READ_SMS triggers Google's restricted-permission review and frequent rejection. Our Semaphore gateway is server-side HTTP — the app should request nothing SMS-related.",
  },
  {
    tag: "Apple",
    title: "Guideline 4.2 — minimum functionality",
    body: "Apple rejects thin web wrappers. The Capacitor fast-track only survives with genuinely native hooks: camera photos, biometric lock, push notifications, offline SQLite.",
  },
  {
    tag: "Both",
    title: "Login wall before value",
    body: "Reviewers bounce apps that force sign-up before showing anything. Ship a demo-store mode — exactly what this dashboard does with seeded data.",
  },
  {
    tag: "Apple",
    title: "Sign in with Apple (4.8)",
    body: "Phone-OTP login via Supabase is fine. But the moment you add a Google or Facebook button on iOS, Apple requires Sign in with Apple alongside it.",
  },
];

const WEEKS = [
  {
    label: "Week 1",
    name: "Foundation",
    tone: "#103524",
    points: ["EAS project wiring & signing keys", "Adaptive icons + splash", "MMKV / Keychain storage", "Push notifications online", "minAppVersion endpoint"],
  },
  {
    label: "Week 2",
    name: "Compliance & beta",
    tone: "#d98a0b",
    points: ["Privacy policy page on your domain", "Data Safety + privacy labels", "TestFlight + Play closed testing", "Tagalog screenshots & ASO copy", "Pilot with 3 real store owners"],
  },
  {
    label: "Week 3",
    name: "Review & launch",
    tone: "#2f8f5b",
    points: ["Production submissions, both stores", "Play staged rollout 10% → 100%", "App Store phased release", "Sentry + sync error watch (< 1%)"],
  },
];

const EAS_CMDS = `npm i -g eas-cli && eas login
eas build:configure
eas build -p android --profile production   # → signed .aab
eas build -p ios --profile production       # → .ipa, cloud build (no Mac needed)
eas submit -p android                       # → Google Play Console
eas submit -p ios                           # → App Store Connect / TestFlight`;

/* ----------------------------- small bits --------------------------- */

function Cmds() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(EAS_CMDS);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <div className="overflow-hidden rounded-lg border border-pine-deep bg-pine-deep">
      <div className="flex items-center justify-between border-b border-card/10 px-3 py-1.5">
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-mango">EAS — one codebase, two binaries</span>
        <button onClick={copy} className="btn-press flex items-center gap-1.5 rounded px-2 py-1 font-mono text-[10px] font-bold text-card/70 transition hover:bg-card/10 hover:text-card">
          {copied ? <IconCheck className="h-3 w-3 text-leaf" /> : <IconCopy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto px-3.5 py-3 font-mono text-[11px] leading-relaxed text-[#d8e5d5]">{EAS_CMDS}</pre>
    </div>
  );
}

/* ------------------------------- view ------------------------------- */

export default function StoresView() {
  const [checks, setChecks] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem("sukibook-stores-checks") ?? "{}");
    } catch {
      return {};
    }
  });
  useEffect(() => {
    localStorage.setItem("sukibook-stores-checks", JSON.stringify(checks));
  }, [checks]);

  const allItems = CHANGES.flatMap((g) => g.items.map((it) => `${g.id}:${it}`));
  const done = allItems.filter((k) => checks[k]).length;
  const progress = allItems.length ? done / allItems.length : 0;

  return (
    <div className="space-y-6">
      {/* manifest header with both store plates */}
      <Reveal>
        <div className="relative overflow-hidden rounded-xl bg-pine text-card shadow-md">
          <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(700px 300px at 15% 0%, rgba(246,168,28,0.14), transparent 60%), radial-gradient(500px 300px at 95% 100%, rgba(50,187,255,0.10), transparent 60%)" }} />
          <div className="relative grid gap-6 px-6 py-6 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-mango/40 bg-mango/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-mango">
                <IconRocket className="h-3.5 w-3.5" /> Store distribution
              </p>
              <h2 className="font-display text-3xl font-extrabold leading-tight">
                Same codebase, <span className="text-mango">two storefronts.</span>
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-card/70">
                React Native is already the plan — the work is packaging, compliance, and payments, not a rewrite.
                Here's exactly what changes to reach both stores in ~3 weeks.
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex-1 max-w-60">
                  <div className="flex items-baseline justify-between text-[10px] font-bold uppercase tracking-wider text-card/60">
                    <span>Code changes</span>
                    <span className="tnum font-mono text-mango">{done}/{allItems.length}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-pine-deep">
                    <div className="h-full rounded-full bg-mango transition-all duration-500" style={{ width: `${progress * 100}%` }} />
                  </div>
                </div>
              </div>
            </div>
            <div className="grid content-start gap-3 sm:grid-cols-2 lg:col-span-7">
              <div className="group rounded-xl border border-card/15 bg-pine-deep/60 p-4 transition hover:-translate-y-0.5 hover:border-mango/50 hover:shadow-lg">
                <div className="flex items-center gap-3">
                  <BadgePlay className="h-9 w-9 transition-transform group-hover:scale-110" />
                  <div>
                    <p className="font-display text-base font-extrabold">Google Play</p>
                    <p className="font-mono text-[10px] text-card/60">Android · primary per the spec</p>
                  </div>
                </div>
                <ul className="mt-3 space-y-1.5 text-xs text-card/80">
                  {["$25 one-time console fee", "Ship a signed .aab (Play App Signing)", "Target API 35+ · review ~1–7 days"].map((x) => (
                    <li key={x} className="flex gap-2"><IconCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mango" />{x}</li>
                  ))}
                </ul>
              </div>
              <div className="group rounded-xl border border-card/15 bg-pine-deep/60 p-4 transition hover:-translate-y-0.5 hover:border-card/40 hover:shadow-lg">
                <div className="flex items-center gap-3">
                  <BadgeApple className="h-9 w-9 text-card transition-transform group-hover:scale-110" />
                  <div>
                    <p className="font-display text-base font-extrabold">App Store</p>
                    <p className="font-mono text-[10px] text-card/60">iOS · “later” can be now — EAS builds in cloud</p>
                  </div>
                </div>
                <ul className="mt-3 space-y-1.5 text-xs text-card/80">
                  {["$99 / year developer program", ".ipa via latest Xcode SDK — no Mac needed", "Privacy labels · review 24–48 h"].map((x) => (
                    <li key={x} className="flex gap-2"><IconCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-card/70" />{x}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* build path verdict */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Reveal className="lg:col-span-3">
          <div className="relative h-full overflow-hidden rounded-xl border-2 border-mango bg-card p-5 shadow-md">
            <span className="absolute right-4 top-4 rounded-full bg-mango px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-pine-deep">Recommended</span>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-mango-deep">Path A</p>
            <h3 className="mt-1 font-display text-xl font-extrabold">React Native + Expo EAS</h3>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-soft">
              The spec's stack, upgraded with Expo's build cloud: one repo produces the Play <span className="font-mono text-xs font-bold">.aab</span> and the
              App Store <span className="font-mono text-xs font-bold">.ipa</span> — iOS included without owning a Mac. OTA patches via EAS Update skip review for bug fixes.
            </p>
            <ul className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
              {["60–70% code shared with this dashboard", "EAS Submit uploads to both consoles", "vision-camera → photos & barcode later", "Staged rollouts on both stores"].map((x) => (
                <li key={x} className="flex items-start gap-2 rounded-md bg-paper px-2.5 py-2 font-medium">
                  <IconCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-leaf" /> {x}
                </li>
              ))}
            </ul>
            <div className="mt-4"><Cmds /></div>
          </div>
        </Reveal>
        <Reveal delay={90} className="lg:col-span-2">
          <div className="flex h-full flex-col rounded-xl border border-line bg-card p-5 shadow-sm">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-ink-soft">Path B · fast-track</p>
            <h3 className="mt-1 font-display text-xl font-extrabold">Capacitor web wrap</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              Wrap <span className="font-semibold text-ink">this exact dashboard</span> as a native shell and ship a v0 in ~1 week — 100% code reuse, zero RN ramp-up.
            </p>
            <div className="mt-3 rounded-lg border border-cherry/30 bg-cherry-soft/60 px-3.5 py-3">
              <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-cherry">
                <IconAlert className="h-4 w-4" /> Apple 4.2 risk
              </p>
              <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                Pure wrappers get rejected for “minimum functionality”. Only viable with native hooks: camera, biometrics, push, offline SQLite.
              </p>
            </div>
            <p className="mt-auto pt-4 text-[11px] font-medium text-ink-soft">
              Use B to validate distribution while A matures — then migrate screens incrementally. The backend, auth and data model stay identical either way.
            </p>
          </div>
        </Reveal>
      </div>

      {/* requirements matrix */}
      <Reveal>
        <div className="overflow-hidden rounded-xl border border-line bg-card shadow-sm">
          <div className="flex flex-wrap items-center gap-4 border-b border-line px-5 py-4">
            <div>
              <h2 className="font-display text-lg font-extrabold">Store requirements, side by side</h2>
              <p className="text-xs text-ink-soft">Where the two processes actually differ</p>
            </div>
            <div className="ml-auto flex items-center gap-3 text-xs font-bold">
              <span className="flex items-center gap-1.5 rounded-full bg-paper px-2.5 py-1"><BadgePlay className="h-3.5 w-3.5" /> Play</span>
              <span className="flex items-center gap-1.5 rounded-full bg-paper px-2.5 py-1"><BadgeApple className="h-3.5 w-3.5" /> App Store</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-line bg-paper/70 text-left text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                <tr>
                  <th className="w-40 px-5 py-2.5">Requirement</th>
                  <th className="px-4 py-2.5">Google Play</th>
                  <th className="px-4 py-2.5">Apple App Store</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {MATRIX.map(([k, play, apple]) => (
                  <tr key={k} className="align-top transition hover:bg-paper/70">
                    <td className="px-5 py-3 font-bold">{k}</td>
                    <td className="px-4 py-3 text-ink-soft">{play}</td>
                    <td className="px-4 py-3 text-ink-soft">{apple}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Reveal>

      {/* code changes checklist */}
      <div>
        <Reveal>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-extrabold">What changes in our code</h2>
              <p className="text-xs text-ink-soft">Tick items off as the mobile repo adopts them — progress is saved</p>
            </div>
            <span className="tnum rounded-md bg-pine px-2.5 py-1 font-mono text-xs font-bold text-mango">{Math.round(progress * 100)}% ready</span>
          </div>
        </Reveal>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {CHANGES.map((g, gi) => {
            const groupDone = g.items.every((it) => checks[`${g.id}:${it}`]);
            return (
              <Reveal key={g.id} delay={gi * 50}>
                <div className={`h-full rounded-xl border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${groupDone ? "border-leaf/50" : "border-line"}`}>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-display text-sm font-extrabold uppercase tracking-wide">{g.title}</h3>
                    {groupDone && <span className="rounded-full bg-leaf-soft px-2 py-0.5 text-[10px] font-extrabold uppercase text-leaf">Done</span>}
                  </div>
                  <ul className="space-y-1">
                    {g.items.map((it) => {
                      const key = `${g.id}:${it}`;
                      const on = !!checks[key];
                      return (
                        <li key={it}>
                          <button
                            onClick={() => setChecks((prev) => ({ ...prev, [key]: !prev[key] }))}
                            className={`btn-press flex w-full items-start gap-2.5 rounded-md px-2 py-1.5 text-left text-xs leading-relaxed transition ${on ? "text-ink-soft line-through decoration-mango/60" : "text-ink"} hover:bg-paper`}
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
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>

      {/* rejection radar */}
      <Reveal>
        <div className="rounded-xl border border-line bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cherry-soft text-cherry"><IconAlert className="h-5 w-5" /></span>
            <div>
              <h2 className="font-display text-lg font-extrabold leading-tight">Rejection radar</h2>
              <p className="text-xs text-ink-soft">Four flags that sink store submissions — and how this build avoids each one</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {RADAR.map((r, i) => (
              <div key={r.title} className="rise group rounded-lg border border-line bg-paper/60 p-4 transition hover:border-cherry/40 hover:bg-cherry-soft/40" style={{ animationDelay: `${i * 70}ms` }}>
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="rounded bg-pine px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-mango">{r.tag}</span>
                  <h3 className="font-display text-sm font-extrabold">{r.title}</h3>
                </div>
                <p className="text-xs leading-relaxed text-ink-soft">{r.body}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <div className="grid gap-5 lg:grid-cols-12">
        {/* timeline */}
        <Reveal className="lg:col-span-7">
          <div className="h-full rounded-xl border border-line bg-card p-5 shadow-sm">
            <h2 className="font-display text-lg font-extrabold">Three weeks to both stores</h2>
            <p className="mb-4 text-xs text-ink-soft">From code-complete to live listings — buffer included for review</p>
            <div className="mb-4 flex h-9 overflow-hidden rounded-lg">
              {WEEKS.map((w, i) => (
                <div key={w.label} className="width-grow flex flex-1 items-center justify-center gap-2 font-mono text-[11px] font-bold text-card" style={{ background: w.tone, animationDelay: `${i * 150}ms` }}>
                  <span className="hidden sm:inline">{w.label}</span>·<span className="uppercase tracking-wider">{w.name}</span>
                </div>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {WEEKS.map((w) => (
                <div key={w.label} className="rounded-lg bg-paper/70 p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-ink-soft">
                    <span className="h-2 w-2 rounded-full" style={{ background: w.tone }} /> {w.label} · {w.name}
                  </p>
                  <ul className="space-y-1.5">
                    {w.points.map((pt) => (
                      <li key={pt} className="flex items-start gap-1.5 text-[11px] leading-snug text-ink-soft">
                        <IconCheck className="mt-0.5 h-3 w-3 shrink-0 text-leaf" /> {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="mt-3 rounded-md bg-mango-soft px-3 py-2 text-[11px] font-semibold text-mango-deep">
              New <em>personal</em> Google accounts must run a 20-tester closed test for 14 days before production — register an organization account to skip the wait.
            </p>
          </div>
        </Reveal>

        {/* cost shelf */}
        <Reveal delay={80} className="lg:col-span-5">
          <div className="flex h-full flex-col rounded-xl border border-line bg-card p-5 shadow-sm">
            <h2 className="font-display text-lg font-extrabold">Store shelf price</h2>
            <p className="mb-3 text-xs text-ink-soft">On top of the ₱3,600–₱5,600/month infra budget</p>
            <ul className="space-y-2.5">
              {[
                { k: "Google Play Console", v: "$25", n: "one-time", tone: "text-leaf" },
                { k: "Apple Developer Program", v: "$99", n: "per year", tone: "text-cherry" },
                { k: "EAS Build & Submit", v: "$0–29", n: "free tier → per seat/mo", tone: "text-mango-deep" },
                { k: "Store cut on subscriptions", v: "15–30%", n: "only if sold in-app — avoid via web billing", tone: "text-cherry" },
              ].map((c) => (
                <li key={c.k} className="flex items-baseline justify-between gap-3 rounded-lg border border-line bg-paper/60 px-3.5 py-2.5 transition hover:border-pine/30">
                  <div>
                    <p className="text-sm font-bold">{c.k}</p>
                    <p className="text-[10px] text-ink-soft">{c.n}</p>
                  </div>
                  <span className={`tnum font-mono text-lg font-extrabold ${c.tone}`}>{c.v}</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-4">
              <p className="rounded-lg bg-pine px-4 py-3 text-xs leading-relaxed text-card">
                Selling the <span className="tnum font-mono font-bold text-mango">₱199–₱299</span> subscription on the web dashboard (Stripe / Xendit-GCash) keeps
                the full margin — Apple's <span className="font-mono font-bold">3.1.5(a)</span> allows external purchase for business SaaS consumed outside the app.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
