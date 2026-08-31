import { useEffect, useRef, useState, type ComponentType } from "react";
import { StoreProvider, useStore, THEMES, type ThemeKey } from "./lib/store";
import { lowStock, overdueDays } from "./lib/data";
import type { StrKey, Lang } from "./lib/i18n";
import { Seg, SyncPill, ToastHost } from "./components/ui";
import {
  IconBasket,
  IconBox,
  IconChart,
  IconCheck,
  IconDash,
  IconGear,
  IconLock,
  IconMonitor,
  IconPalette,
  IconPhone,
  IconPower,
  IconReceipt,
  IconRocket,
  IconShield,
  IconUsers,
  LogoMark,
} from "./components/Icons";
import Dashboard from "./views/Dashboard";
import SalesView from "./views/Sales";
import ProductsView from "./views/Products";
import StockView from "./views/Stock";
import UtangView from "./views/Utang";
import ReportsView from "./views/Reports";
import DeployView from "./views/Deploy";
import GoLiveView from "./views/GoLive";
import SettingsView from "./views/Settings";
import MobileScene from "./Mobile";

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

function Shell() {
  const { db, t, settings, updateSettings, sync, toasts, lockNow, auth } = useStore();
  const [view, setView] = useState<View>("dashboard");
  const [device, setDevice] = useState<"web" | "mobile">("web");

  /* ---- role-based access (spec §10) — Deploy & Go Live are owner-only ---- */
  const isAdmin = settings.role === "owner";
  const visibleNav = NAV.filter((n) => (n.key !== "deploy" && n.key !== "golive") || isAdmin);
  useEffect(() => {
    if ((view === "deploy" || view === "golive") && !isAdmin) setView("dashboard");
  }, [view, isAdmin]);

  /* cross-view navigation from inside views */
  useEffect(() => {
    const onNav = (e: Event) => {
      const detail = (e as CustomEvent).detail as View;
      if (detail) {
        setDevice("web");
        setView(detail);
      }
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
      setDevice("web");
      setView("products");
      window.setTimeout(() => window.dispatchEvent(new Event("sukibook-focus-search")), 90);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const lowCount = lowStock(db).length;
  const overdueCount = db.customers.filter((c) => overdueDays(c) > 7).length;
  const badge = (key: View) =>
    key === "stock" && lowCount > 0 ? lowCount : key === "utang" && overdueCount > 0 ? overdueCount : null;
  const badgeTint = (key: View) => (key === "stock" ? "bg-cherry text-cherry-soft" : "bg-mango text-pine-deep");

  if (device === "mobile") return <MobileScene onSwitch={() => setDevice("web")} />;

  const Current = VIEWS[view];

  return (
    <div className="noise flex min-h-screen">
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
        <nav className="mt-2 flex-1 space-y-1 px-2 lg:px-3">
          {visibleNav.map((n) => {
            const active = view === n.key;
            const b = badge(n.key);
            return (
              <button
                key={n.key}
                onClick={() => setView(n.key)}
                title={t(n.label)}
                className={`btn-press relative flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-semibold transition md:px-3 ${
                  active ? "bg-card/10 text-mango" : "text-card/65 hover:bg-card/5 hover:text-card"
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
      <div className="flex min-h-screen flex-1 flex-col pl-[68px] md:pl-60">
        {/* topbar */}
        <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur">
          <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-4 py-3 md:px-6">
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-lg font-extrabold leading-tight md:text-xl">{t(`nav.${view}` as StrKey)}</h1>
              <p className="hidden truncate text-xs text-ink-soft sm:block">{t(`sub.${view}` as StrKey)}</p>
            </div>
            <ThemeMenu value={settings.theme} onChange={(theme) => updateSettings({ theme })} />
            <Seg<Lang>
              value={settings.lang}
              onChange={(lang) => updateSettings({ lang })}
              options={[
                { key: "en", label: "EN" },
                { key: "tl", label: "TL" },
              ]}
            />
            <div className="hidden rounded-lg border border-line bg-card p-0.5 sm:block" title="Device preview">
              <div className="flex">
                <button
                  onClick={() => setDevice("web")}
                  className={`btn-press rounded-md p-2 transition ${device === "web" ? "bg-pine text-mango" : "text-ink-soft hover:text-pine"}`}
                  aria-label="Web dashboard"
                >
                  <IconMonitor className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDevice("mobile")}
                  className="btn-press rounded-md p-2 text-ink-soft transition hover:text-pine"
                  aria-label="Mobile app preview"
                >
                  <IconPhone className="h-4 w-4" />
                </button>
              </div>
            </div>
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
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 backdrop-blur md:hidden">
          <nav className="flex gap-1 overflow-x-auto px-3 py-2">
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

        <main className="relative mx-auto w-full max-w-[1440px] flex-1 px-4 py-5 pb-24 md:px-6 md:py-7 md:pb-7">
          <div key={view} className="rise">
            {view === "dashboard" ? (
              <Dashboard go={(v) => setView(v as View)} />
            ) : (view === "deploy" || view === "golive") && !isAdmin ? (
              <LockedPanel
                title="Owner access only"
                note="Deployment, production and infra settings are restricted to the store owner (admin). Helpers and accountants keep their day-to-day views."
              />
            ) : (
              <Current />
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
