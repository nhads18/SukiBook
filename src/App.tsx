import { useEffect, useState, type ComponentType } from "react";
import { StoreProvider, useStore } from "./lib/store";
import { lowStock, overdueDays } from "./lib/data";
import type { StrKey } from "./lib/i18n";
import type { Lang } from "./lib/i18n";
import { Seg, SyncPill, ToastHost } from "./components/ui";
import {
  IconBasket,
  IconBox,
  IconChart,
  IconDash,
  IconGear,
  IconMonitor,
  IconPhone,
  IconReceipt,
  IconRocket,
  IconStorefront,
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
import StoresView from "./views/Stores";
import SettingsView from "./views/Settings";
import MobileScene from "./Mobile";

type View = "dashboard" | "sales" | "products" | "stock" | "utang" | "reports" | "deploy" | "stores" | "settings";

const NAV: { key: View; icon: ComponentType<{ className?: string }>; label: StrKey }[] = [
  { key: "dashboard", icon: IconDash, label: "nav.dashboard" },
  { key: "sales", icon: IconReceipt, label: "nav.sales" },
  { key: "products", icon: IconBox, label: "nav.products" },
  { key: "stock", icon: IconBasket, label: "nav.stock" },
  { key: "utang", icon: IconUsers, label: "nav.utang" },
  { key: "reports", icon: IconChart, label: "nav.reports" },
  { key: "deploy", icon: IconRocket, label: "nav.deploy" },
  { key: "stores", icon: IconStorefront, label: "nav.stores" },
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
  stores: StoresView,
  settings: SettingsView,
};

function Shell() {
  const { db, t, settings, updateSettings, sync, toasts } = useStore();
  const [view, setView] = useState<View>("dashboard");
  const [device, setDevice] = useState<"web" | "mobile">("web");

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
  const badgeTint = (key: View) => (key === "stock" ? "bg-cherry" : "bg-mango text-pine-deep");

  const Current = VIEWS[view];

  if (device === "mobile") {
    return (
      <div className="noise">
        <MobileScene onSwitch={() => setDevice("web")} />
        <ToastHost toasts={toasts} />
      </div>
    );
  }

  return (
    <div className="noise min-h-screen">
      <div className="stripes stripes-anim h-2.5" />
      <div className="flex">
        {/* sidebar */}
        <aside className="no-print sticky top-0 hidden h-screen w-16 shrink-0 flex-col border-r border-pine-deep bg-pine text-card md:flex lg:w-60">
          <div className="flex items-center gap-2.5 px-3 py-5 lg:px-5">
            <LogoMark className="h-9 w-9 shrink-0" />
            <div className="hidden lg:block">
              <p className="font-display text-lg font-extrabold leading-none">SukiBook</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-mango/80">sari-sari OS</p>
            </div>
          </div>

          <nav className="mt-2 flex-1 space-y-1 px-2 lg:px-3">
            {NAV.map((n) => {
              const active = view === n.key;
              const b = badge(n.key);
              return (
                <button
                  key={n.key}
                  onClick={() => setView(n.key)}
                  className={`btn-press group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                    active ? "bg-pine-deep text-mango" : "text-card/70 hover:bg-pine-deep/60 hover:text-card"
                  }`}
                >
                  {active && <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r bg-mango" />}
                  <n.icon className="h-5 w-5 shrink-0" />
                  <span className="hidden flex-1 text-left lg:block">{t(n.label)}</span>
                  {b !== null && (
                    <span className={`tnum hidden rounded-full px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-card lg:block ${badgeTint(n.key)}`}>
                      {b}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="border-t border-card/10 p-3 lg:p-4">
            <div className="hidden rounded-lg bg-pine-deep/70 px-3.5 py-3 lg:block">
              <p className="truncate font-display text-sm font-bold">{settings.storeName}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-card/60">
                <span className={`h-1.5 w-1.5 rounded-full ${sync.status === "syncing" ? "pulse-dot bg-mango" : "bg-leaf"}`} />
                {sync.status === "syncing" ? t("syncing") : "PostgreSQL · synced"}
              </p>
            </div>
            <p className="mt-3 text-center font-mono text-[10px] text-card/40">MVP v1.0 · mobile for action</p>
          </div>
        </aside>

        {/* main column */}
        <div className="min-w-0 flex-1">
          <header className="no-print sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-sm">
            <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-4 py-3.5 md:px-6">
              <LogoMark className="h-8 w-8 md:hidden" />
              <div className="min-w-0">
                <h1 className="truncate font-display text-xl font-extrabold leading-tight md:text-2xl">{t(`nav.${view}` as StrKey)}</h1>
                <p className="hidden truncate text-[11px] text-ink-soft sm:block">{t(`sub.${view}` as StrKey)}</p>
              </div>
              <div className="ml-auto flex items-center gap-2.5">
                <div className="hidden xl:block">
                  <SyncPill status={sync.status} last={sync.last} syncedLabel={t("synced")} syncingLabel={t("syncing")} />
                </div>
                <Seg<Lang>
                  size="sm"
                  value={settings.lang}
                  onChange={(v) => updateSettings({ lang: v })}
                  options={[
                    { key: "en", label: "EN" },
                    { key: "tl", label: "TL" },
                  ]}
                />
                <div className="hidden sm:block">
                  <Seg<"web" | "mobile">
                    size="sm"
                    value={device}
                    onChange={setDevice}
                    options={[
                      { key: "web", label: <IconMonitor className="h-4 w-4" /> },
                      { key: "mobile", label: <IconPhone className="h-4 w-4" /> },
                    ]}
                  />
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-mango font-display text-sm font-extrabold text-pine-deep shadow-sm" title={settings.owner}>
                  {settings.owner.replace("Aling ", "").replace("Mang ", "")[0] ?? "N"}
                </span>
              </div>
            </div>
            {/* mobile web nav */}
            <nav className="flex gap-1 overflow-x-auto border-t border-line px-3 py-2 md:hidden">
              {NAV.map((n) => (
                <button
                  key={n.key}
                  onClick={() => setView(n.key)}
                  className={`btn-press shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold transition ${
                    view === n.key ? "bg-pine text-mango" : "bg-card text-ink-soft"
                  }`}
                >
                  {t(n.label)}
                </button>
              ))}
            </nav>
          </header>

          {/* small-screen device switch */}
          <div className="no-print border-b border-line bg-card px-4 py-2 sm:hidden">
            <Seg<"web" | "mobile">
              value={device}
              onChange={setDevice}
              options={[
                { key: "web", label: "Web dashboard" },
                { key: "mobile", label: "Mobile app" },
              ]}
            />
          </div>

          <main className="mx-auto max-w-[1440px] px-4 py-5 md:px-6 md:py-7">
            <Current />
          </main>

          <footer className="no-print mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-2 px-4 pb-8 pt-2 text-[11px] text-ink-soft md:px-6">
            <p>
              <span className="font-display font-extrabold text-pine">SukiBook</span> — palitan na ang notebook. Demo data, resets daily.
            </p>
            <p className="font-mono">
              press <kbd className="rounded border border-line bg-card px-1.5 py-0.5 font-mono">/</kbd> to search products
            </p>
          </footer>
        </div>
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
