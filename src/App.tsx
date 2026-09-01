import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, type ComponentType } from "react";
import { StoreProvider, useStore, THEMES, type ThemeKey } from "./lib/store";
import { lowStock, overdueDays, peso0 } from "./lib/data";
import type { StrKey, Lang } from "./lib/i18n";
import { Seg, SyncPill, ToastHost } from "./components/ui";
import {
  IconAlert,
  IconBasket,
  IconBell,
  IconBox,
  IconChart,
  IconCheck,
  IconDash,
  IconGear,
  IconLock,
  IconPalette,
  IconPeso,
  IconPower,
  IconReceipt,
  IconRocket,
  IconShield,
  IconUsers,
  LogoMark,
} from "./components/Icons";
import Dashboard from "./views/Dashboard";

/* Route-level code splitting: every non-landing view ships as its own chunk. */
const SalesView = lazy(() => import("./views/Sales"));
const ProductsView = lazy(() => import("./views/Products"));
const StockView = lazy(() => import("./views/Stock"));
const UtangView = lazy(() => import("./views/Utang"));
const ReportsView = lazy(() => import("./views/Reports"));
const DeployView = lazy(() => import("./views/Deploy"));
const GoLiveView = lazy(() => import("./views/GoLive"));
const SettingsView = lazy(() => import("./views/Settings"));

type View = "dashboard" | "sales" | "products" | "stock" | "utang" | "reports" | "deploy" | "golive" | "settings";

const NAV: { key: View; icon: ComponentType<{ className?: string }>; label: StrKey }[] = [
  { key: "dashboard", icon: IconDash, label: "nav.dashboard" },
  { key: "sales", icon: IconReceipt, label: "nav.sales" },
  { key: "products", icon: IconBox, label: "nav.products" },
  { key: "stock", icon: IconBasket, label: "nav.stock" },
  { key: "utang", icon: IconUsers, label: "nav.utang" },
  { key: "reports", icon: IconChart, label: "nav.reports" },
  { key: "deploy", icon: IconRocket, label: "nav.deploy" },
  { key: "golive", icon: IconPower, label: "nav.golive" },
  { key: "settings", icon: IconGear, label: "nav.settings" },
];

const VIEWS: Record<View, ComponentType> = {
  dashboard: Dashboard,
  sales: SalesView,
  products: ProductsView,
  stock: StockView,
  utang: UtangView,
  reports: ReportsView,
  deploy: DeployView,
  golive: GoLiveView,
  settings: SettingsView,
};

/** Role chips — access control per spec §10. Deploy & Go Live are owner-only. */
const ROLE_META: Record<string, { label: string; tint: string }> = {
  owner: { label: "Owner", tint: "bg-mango text-pine-deep" },
  helper: { label: "Helper", tint: "bg-leaf-soft text-leaf" },
  accountant: { label: "Accountant", tint: "bg-gcash-soft text-gcash" },
};

function LockedPanel({ title, note }: { title: string; note: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="pop max-w-sm rounded-2xl border border-line bg-card p-8 text-center shadow-sm">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-pine text-mango">
          <IconShield className="h-7 w-7" />
        </span>
        <h2 className="mt-4 font-display text-xl font-extrabold">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{note}</p>
        <p className="mt-4 rounded-lg bg-paper px-3 py-2 font-mono text-[11px] text-ink-soft">
          Settings → Team &amp; roles to switch
        </p>
      </div>
    </div>
  );
}

/** Branded loading state for lazy routes — awning shimmer, never a spinner. */
function ViewSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading view">
      <div className="skel h-24 w-full" />
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="skel h-64 lg:col-span-7" />
        <div className="skel h-64 lg:col-span-5" />
      </div>
      <div className="skel h-40 w-full" />
    </div>
  );
}

/** Compact theme popover for the topbar — swatch preview + instant re-skin. */
function ThemeMenu({ value, onChange }: { value: ThemeKey; onChange: (t: ThemeKey) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Theme"
        className={`btn-press flex h-9 w-9 items-center justify-center rounded-lg border transition ${
          open ? "border-pine bg-pine text-mango" : "border-line bg-card text-ink-soft hover:border-pine hover:text-pine"
        }`}
      >
        <IconPalette className="h-[18px] w-[18px]" />
      </button>
      {open && (
        <div className="pop absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-line bg-card p-2 shadow-[0_18px_44px_-12px_rgba(11,39,27,0.35)]">
          <p className="px-2.5 pb-1.5 pt-1 text-[10px] font-extrabold uppercase tracking-widest text-ink-soft">Theme</p>
          {THEMES.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                onChange(t.key);
                setOpen(false);
              }}
              className={`btn-press flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition ${
                t.key === value ? "bg-pine text-card" : "hover:bg-paper"
              }`}
            >
              <span className="flex -space-x-1.5">
                {t.swatches.map((s, i) => (
                  <span key={i} className="h-5 w-5 rounded-full border-2 border-card" style={{ background: s }} />
                ))}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold leading-tight" style={{ fontFamily: t.font }}>
                  {t.name}
                </span>
                <span className={`block truncate text-[10px] leading-snug ${t.key === value ? "text-card/60" : "text-ink-soft"}`}>
                  {t.tagline}
                </span>
              </span>
              {t.key === value && <IconCheck className="h-4 w-4 shrink-0 text-mango" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Notification center — low stock & overdue utang, each a one-tap shortcut. */
function NoticeBell({ onView }: { onView: (v: View) => void }) {
  const { db } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  const lows = lowStock(db);
  const overdue = db.customers
    .map((c) => ({ c, d: overdueDays(c) }))
    .filter((x) => x.d > 7)
    .sort((a, b) => b.d - a.d);
  const count = lows.length + overdue.length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        title="Notifications"
        aria-label={`Notifications${count > 0 ? `, ${count} pending` : ""}`}
        aria-expanded={open}
        className={`btn-press relative flex h-9 w-9 items-center justify-center rounded-lg border transition ${
          open ? "border-pine bg-pine text-mango" : "border-line bg-card text-ink-soft hover:border-pine hover:text-pine"
        }`}
      >
        <IconBell className="h-[18px] w-[18px]" />
        {count > 0 && (
          <span className="tnum absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-cherry px-1 font-mono text-[9px] font-extrabold text-cherry-soft">
            {count}
          </span>
        )}
      </button>
      {open && (
        <div className="pop absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-line bg-card shadow-elev-3">
          <div className="stripes-soft h-1" />
          <div className="flex items-center justify-between px-4 py-3">
            <p className="font-display text-sm font-extrabold">Needs attention</p>
            <span className="tnum rounded bg-paper px-2 py-0.5 font-mono text-[10px] font-bold text-ink-soft">{count}</span>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {count === 0 && (
              <p className="px-4 pb-4 text-xs text-ink-soft">
                Wala — all clear. Stock is healthy and every utang is current.
              </p>
            )}
            {lows.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  onView("stock");
                  setOpen(false);
                }}
                className="btn-press flex w-full items-center gap-3 border-t border-line px-4 py-2.5 text-left transition hover:bg-cherry-soft/40"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cherry-soft text-cherry">
                  <IconAlert className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold">{p.name}</span>
                  <span className="block font-mono text-[10px] text-cherry">{p.stock === 0 ? "out of stock" : `${p.stock} left`}</span>
                </span>
                <span className="shrink-0 font-mono text-[10px] font-bold text-ink-soft">Restock →</span>
              </button>
            ))}
            {overdue.map(({ c, d }) => (
              <button
                key={c.id}
                onClick={() => {
                  onView("utang");
                  setOpen(false);
                }}
                className="btn-press flex w-full items-center gap-3 border-t border-line px-4 py-2.5 text-left transition hover:bg-mango-soft/40"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-mango-soft text-mango-deep">
                  <IconPeso className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold">{c.name}</span>
                  <span className="block font-mono text-[10px] text-mango-deep">
                    {d}d overdue · {peso0(c.balance)}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-[10px] font-bold text-ink-soft">Collect →</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Shell() {
  const { db, t, settings, updateSettings, sync, toasts, lockNow, auth, syncError, clearSyncError } = useStore();
  const [view, setView] = useState<View>("dashboard");

  /* sliding active-nav indicator (measured, transform-only) */
  const navRef = useRef<HTMLElement | null>(null);
  const btnRefs = useRef<Partial<Record<View, HTMLButtonElement | null>>>({});
  const [ind, setInd] = useState<{ top: number; height: number } | null>(null);

  /* ---- role-based access (spec §10) — Deploy & Go Live are owner-only ---- */
  const isAdmin = settings.role === "owner";
  const visibleNav = NAV.filter((n) => (n.key !== "deploy" && n.key !== "golive") || isAdmin);
  useEffect(() => {
    if ((view === "deploy" || view === "golive") && !isAdmin) setView("dashboard");
  }, [view, isAdmin]);

  /* keep the browser tab honest — "Sales · SukiBook" beats nine identical tabs */
  useEffect(() => {
    document.title = `${t(`nav.${view}` as StrKey)} · SukiBook`;
  }, [view, t]);

  /* measure the active nav item so the indicator glides between items */
  useLayoutEffect(() => {
    const measure = () => {
      const el = btnRefs.current[view];
      const nav = navRef.current;
      if (el && nav) {
        const nr = nav.getBoundingClientRect();
        const r = el.getBoundingClientRect();
        setInd({ top: r.top - nr.top + nav.scrollTop, height: r.height });
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [view]);

  /* cross-view navigation from inside views */
  useEffect(() => {
    const onNav = (e: Event) => {
      const detail = (e as CustomEvent).detail as View;
      if (detail) setView(detail);
    };
    window.addEventListener("sukibook-nav", onNav);
    return () => window.removeEventListener("sukibook-nav", onNav);
  }, []);

  /* "/" focuses product search */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/") return;
      const el = document.activeElement as HTMLElement | null;
        if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
        e.preventDefault();
        setView("products");      window.setTimeout(() => window.dispatchEvent(new Event("sukibook-focus-search")), 90);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const lowCount = lowStock(db).length;
  const overdueCount = db.customers.filter((c) => overdueDays(c) > 7).length;
  const badge = (key: View) =>
    key === "stock" && lowCount > 0 ? lowCount : key === "utang" && overdueCount > 0 ? overdueCount : null;
  const badgeTint = (key: View) => (key === "stock" ? "bg-cherry text-cherry-soft" : "bg-mango text-pine-deep");


  const Current = VIEWS[view];

  return (
    <div className="noise app-h flex">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      {/* ---------------- sidebar ---------------- */}
      <aside className="fixed inset-y-0 left-0 z-40 flex w-[68px] flex-col border-r border-pine-deep/40 bg-pine text-card md:w-60">
        <div className="flex items-center gap-2.5 px-3.5 py-4 md:px-5">
          <LogoMark className="h-9 w-9 shrink-0" />
          <div className="hidden min-w-0 md:block">
            <p className="font-display text-base font-extrabold leading-none">SukiBook</p>
            <p className="mt-0.5 truncate text-[10px] text-card/50">{settings.storeName}</p>
          </div>
        </div>
        <div className="stripes-soft mx-3 h-1 rounded-full md:mx-5" />
        <nav ref={navRef} className="relative mt-2 flex-1 space-y-1 px-2 lg:px-3" aria-label="Primary">
          <span
            aria-hidden="true"
            className="absolute inset-x-2 rounded-lg bg-card/10 transition-[top,height,opacity] duration-300 lg:inset-x-3"
            style={{
              top: ind?.top ?? 0,
              height: ind?.height ?? 0,
              opacity: ind ? 1 : 0,
              transitionTimingFunction: "var(--ease-standard)",
            }}
          />
          {visibleNav.map((n) => {
            const active = view === n.key;
            const b = badge(n.key);
            return (
              <button
                key={n.key}
                ref={(el) => {
                  btnRefs.current[n.key] = el;
                }}
                onClick={() => setView(n.key)}
                title={t(n.label)}
                aria-current={active ? "page" : undefined}
                className={`btn-press relative z-10 flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-semibold transition md:px-3 ${
                  active ? "text-mango" : "text-card/65 hover:bg-card/5 hover:text-card"
                }`}
              >
                {active && <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-mango" />}
                <n.icon className="h-5 w-5 shrink-0" />
                <span className="hidden flex-1 text-left md:block">{t(n.label)}</span>
                {b !== null && (
                  <span className={`tnum hidden rounded-full px-1.5 py-0.5 font-mono text-[10px] font-extrabold md:block ${badgeTint(n.key)}`}>{b}</span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="border-t border-card/10 p-3 md:p-4">
          <div className="hidden items-center gap-2.5 md:flex">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-mango font-display text-xs font-extrabold text-pine-deep">
              {settings.owner.split(" ").map((w) => w[0]).slice(0, 2).join("")}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold">{settings.owner}</p>
              <p className="text-[10px] text-card/50">{ROLE_META[settings.role]?.label ?? settings.role}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ---------------- main column ---------------- */}
      <div className="app-h flex flex-1 flex-col pl-[68px] md:pl-60">
        {/* topbar */}
        <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur">
          {syncError && (
            <div role="alert" className="rise flex items-center gap-2.5 bg-cherry px-4 py-2 text-xs font-semibold text-cherry-soft md:px-6">
              <span className="pulse-dot h-1.5 w-1.5 shrink-0 rounded-full bg-cherry-soft" />
              <span className="min-w-0 flex-1 truncate">
                Cloud push failed — {syncError}. Data is safe on this device; it retries on the next change.
              </span>
              <button onClick={clearSyncError} className="btn-press shrink-0 rounded px-1.5 py-0.5 font-extrabold uppercase transition hover:bg-cherry-soft/20" aria-label="Dismiss sync warning">
                ✕
              </button>
            </div>
          )}
          <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-4 py-3 md:px-6">
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-lg font-extrabold leading-tight md:text-xl">{t(`nav.${view}` as StrKey)}</h1>
              <p className="hidden truncate text-xs text-ink-soft sm:block">{t(`sub.${view}` as StrKey)}</p>
            </div>
            <NoticeBell onView={(v) => setView(v)} />
            <ThemeMenu value={settings.theme} onChange={(theme) => updateSettings({ theme })} />
            <Seg<Lang>
              value={settings.lang}
              onChange={(lang) => updateSettings({ lang })}
              options={[
                { key: "en", label: "EN" },
                { key: "tl", label: "TL" },
              ]}
            />
            <SyncPill status={sync.status} label={t("synced")} />
            <span
              className={`hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider transition sm:flex ${ROLE_META[settings.role]?.tint ?? "bg-paper text-ink-soft"}`}
              title="Role controls access — change it in Settings → Team & roles"
            >
              <IconShield className="h-3.5 w-3.5" />
              {ROLE_META[settings.role]?.label ?? settings.role}
            </span>
            <button
              onClick={lockNow}
              title={`Lock the register now · auto-locks after 5 min idle${auth.email ? ` · ${auth.email}` : ""}`}
              className="btn-press rounded-md border border-line bg-card p-2 text-ink-soft transition hover:border-pine hover:bg-pine-soft hover:text-pine"
              aria-label="Lock now"
            >
              <IconLock className="h-4 w-4" />
            </button>
          </div>
          <div className="stripes h-1" />
        </header>

        {/* mobile bottom nav */}
        <div className="safe-b fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 backdrop-blur md:hidden">
          <nav className="flex gap-1 overflow-x-auto px-3 py-2" aria-label="Primary mobile">
            {visibleNav.map((n) => (
              <button
                key={n.key}
                onClick={() => setView(n.key)}
                className={`btn-press flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-bold transition ${
                  view === n.key ? "bg-pine text-mango" : "text-ink-soft"
                }`}
              >
                <n.icon className="h-4 w-4" />
                {t(n.label)}
              </button>
            ))}
          </nav>
        </div>

        <main id="main" className="relative mx-auto w-full max-w-[1440px] flex-1 px-4 py-5 pb-24 md:px-6 md:py-7 md:pb-7">
          <div key={view} className="rise">
            {view === "dashboard" ? (
              <Dashboard go={(v) => setView(v as View)} />
            ) : (view === "deploy" || view === "golive") && !isAdmin ? (
              <LockedPanel
                title="Owner access only"
                note="Deployment, production and infra settings are restricted to the store owner (admin). Helpers and accountants keep their day-to-day views."
              />
            ) : (
              <Suspense fallback={<ViewSkeleton />}>
                <Current />
              </Suspense>
            )}
          </div>
        </main>

        <footer className="border-t border-line bg-card/60 py-3">
          <p className="mx-auto max-w-[1440px] px-4 font-mono text-[10px] text-ink-soft md:px-6">
            SukiBook · mobile for action, web for insight · Vercel + Supabase · offline-first
          </p>
        </footer>
      </div>

      <ToastHost toasts={toasts} />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
