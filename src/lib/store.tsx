import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  genDB,
  startOfDay,
  peso,
  type Cat,
  type DB,
  type Payment,
  type Product,
  type Sale,
} from "./data";
import { STRINGS, type Lang, type StrKey } from "./i18n";
import {
  freshAnchor,
  isCloudConfigured,
  onAuthChange,
  pullStore,
  pushStore,
  sendMagicLink,
  signOutUser,
  type CloudUser,
} from "./supabase";
import LoginGate from "../components/LoginGate";

export type Role = "owner" | "helper" | "accountant";
export type ThemeKey = "awning" | "barako" | "jeepney";

export const THEMES: { key: ThemeKey; name: string; tagline: string; swatches: string[]; font: string; meta: string }[] = [
  {
    key: "awning",
    name: "Awning",
    tagline: "The classic tindahan — pine green & mango under the tarpaulin",
    swatches: ["#103524", "#f6a81c", "#f1f2ea"],
    font: '"Bricolage Grotesque", sans-serif',
    meta: "#103524",
  },
  {
    key: "barako",
    name: "Barako",
    tagline: "Kapeng barako counter — espresso, copper & latte paper",
    swatches: ["#241812", "#cf7a2a", "#efe6d8"],
    font: '"Fraunces", serif',
    meta: "#241812",
  },
  {
    key: "jeepney",
    name: "Jeepney",
    tagline: "Hand-painted livery — maroon body, chrome yellow signwriting",
    swatches: ["#4a101f", "#f7c91f", "#f7f2e7"],
    font: '"Alfa Slab One", sans-serif',
    meta: "#4a101f",
  },
];

export interface Settings {
  lang: Lang;
  storeName: string;
  owner: string;
  autoSync: boolean;
  sheetsSync: boolean;
  role: Role;
  theme: ThemeKey;
}

export interface Toast {
  id: number;
  kind: "ok" | "warn" | "info";
  title: string;
  sub?: string;
}

interface SaleInput {
  lines: { productId: string; qty: number }[];
  payment: Payment;
  customerId?: string;
}

interface StoreCtx {
  db: DB;
  settings: Settings;
  toasts: Toast[];
  sync: { status: "synced" | "syncing"; last: number };
  t: (k: StrKey) => string;
  notify: (kind: Toast["kind"], title: string, sub?: string) => void;
  recordSale: (input: SaleInput) => number;
  deleteSale: (id: string) => void;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  addProduct: (p: { name: string; cat: Cat; price: number; cost: number; stock: number }) => void;
  addStock: (productId: string, qty: number) => void;
  recordPayment: (customerId: string, amount: number) => void;
  addUtang: (customerId: string, amount: number, note?: string) => void;
  addCustomer: (name: string, phone: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetDemo: () => void;
  cloud: { configured: boolean; mode: "demo" | "cloud" | "gate"; email: string | null };
  login: (email: string) => Promise<void>;
  logout: () => void;
  continueDemo: () => void;
}

const KEY = "sukibook:v3";
const uid = () => "u" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
const todayAnchor = () => new Date(startOfDay(Date.now())).toDateString();

function loadInitial(): { db: DB; settings: Settings } {
  const defaults: Settings = {
    lang: "en",
    storeName: "Aling Nena Sari-Sari Store",
    owner: "Aling Nena",
    autoSync: true,
    sheetsSync: true,
    role: "owner",
    theme: "awning",
  };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { db: DB; settings: Settings };
      if (parsed?.db?.anchor === todayAnchor()) {
        return { db: parsed.db, settings: { ...defaults, ...parsed.settings } };
      }
    }
  } catch {
    /* fall through to fresh data */
  }
  return { db: genDB(), settings: defaults };
}

const Ctx = createContext<StoreCtx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [init] = useState(loadInitial);
  const [db, setDb] = useState<DB>(init.db);
  const [settings, setSettings] = useState<Settings>(init.settings);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [sync, setSync] = useState<{ status: "synced" | "syncing"; last: number }>({
    status: "synced",
    last: Date.now(),
  });
  const syncTimer = useRef<number | null>(null);
  const toastId = useRef(0);

  /* ---------------- cloud (Supabase) layer ---------------- */
  const configured = isCloudConfigured();
  const [cloudUser, setCloudUser] = useState<CloudUser | null>(null);
  const [bypass, setBypass] = useState(false);
  const [gateBusy, setGateBusy] = useState(false);
  const [gateSent, setGateSent] = useState(false);
  const cloudUserRef = useRef<CloudUser | null>(null);
  cloudUserRef.current = cloudUser;
  const dbRef = useRef(db);
  dbRef.current = db;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const cloudTimer = useRef<number | null>(null);
  const bootRef = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ db, settings }));
    } catch {
      /* storage full — demo continues in memory */
    }
  }, [db, settings]);

  /* Apply the active theme: re-skins every token + browser chrome color. */
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    const found = THEMES.find((t) => t.key === settings.theme);
    if (meta && found) meta.setAttribute("content", found.meta);
  }, [settings.theme]);

  const notify = useCallback((kind: Toast["kind"], title: string, sub?: string) => {
    const id = ++toastId.current;
    setToasts((ts) => [...ts.slice(-3), { id, kind, title, sub }]);
    window.setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 3600);
  }, []);

  /* debounced offline-first push: every local mutation lands in Supabase */
  const schedulePush = useCallback(() => {
    if (!configured) return;
    if (cloudTimer.current) window.clearTimeout(cloudTimer.current);
    cloudTimer.current = window.setTimeout(async () => {
      const u = cloudUserRef.current;
      if (!u) return;
      try {
        await pushStore(u.id, dbRef.current, settingsRef.current as unknown as Record<string, unknown>);
        setSync({ status: "synced", last: Date.now() });
      } catch (e) {
        setSync({ status: "synced", last: Date.now() });
        notify("warn", "Cloud sync failed", e instanceof Error ? e.message : "Kept on device — retries on next change");
      }
    }, 1600);
  }, [configured, notify]);

  /* auth: hydrate from cloud on login, seed cloud on first login */
  useEffect(() => {
    if (!configured) return;
    const unsub = onAuthChange(async (user) => {
      setCloudUser(user);
      if (!user || bootRef.current) return;
      bootRef.current = true;
      try {
        const { bundle, settings: remote } = await pullStore(user.id);
        if (bundle) {
          setDb({ anchor: freshAnchor(), ...bundle });
          if (remote) setSettings((s) => ({ ...s, ...(remote as unknown as Partial<Settings>) }));
          notify("ok", "Synced from cloud", "Your store data is loaded");
        } else {
          await pushStore(user.id, dbRef.current, settingsRef.current as unknown as Record<string, unknown>);
          notify("ok", "Store connected", "Starter catalog uploaded to your cloud store");
        }
      } catch (e) {
        notify("warn", "Cloud sync failed", e instanceof Error ? e.message : "Check your connection");
      }
    });
    return unsub;
  }, [configured, notify]);

  const markSync = useCallback(() => {
    setSync({ status: "syncing", last: Date.now() });
    if (syncTimer.current) window.clearTimeout(syncTimer.current);
    syncTimer.current = window.setTimeout(
      () => setSync({ status: "synced", last: Date.now() }),
      1100,
    );
    schedulePush();
  }, [schedulePush]);

  const t = useCallback(
    (k: StrKey) => STRINGS[settings.lang][k] ?? STRINGS.en[k] ?? k,
    [settings.lang],
  );

  const recordSale = useCallback(
    (input: SaleInput): number => {
      let total = 0;
      const now = Date.now();
      const sale: Sale = {
        id: uid(),
        ts: now,
        items: [],
        payment: input.payment,
        total: 0,
      };
      const movs: DB["movements"] = [];
      setDb((prev) => {
        const products = prev.products.map((p) => {
          const line = input.lines.find((l) => l.productId === p.id);
          if (!line) return p;
          const qty = Math.min(line.qty, p.stock);
          if (qty <= 0) return p;
          sale.items.push({
            productId: p.id,
            name: p.name,
            cat: p.cat,
            qty,
            price: p.price,
            cost: p.cost,
          });
          movs.push({
            id: uid(),
            ts: now,
            productId: p.id,
            name: p.name,
            type: "sale",
            qty: -qty,
            saleId: sale.id,
          });
          return { ...p, stock: p.stock - qty };
        });
        sale.total = sale.items.reduce((s, it) => s + it.qty * it.price, 0);
        let customers = prev.customers;
        if (sale.payment === "utang" && input.customerId) {
          sale.customerId = input.customerId;
          customers = prev.customers.map((c) =>
            c.id === input.customerId
              ? {
                  ...c,
                  balance: c.balance + sale.total,
                  history: [
                    ...c.history,
                    {
                      ts: now,
                      type: "utang" as const,
                      amount: sale.total,
                      note: sale.items[0]?.name ?? "Tinda",
                    },
                  ],
                }
              : c,
          );
        }
        return {
          ...prev,
          products,
          customers,
          sales: [sale, ...prev.sales],
          movements: [...movs, ...prev.movements],
        };
      });
      total = sale.total;
      markSync();
      notify(
        "ok",
        `${peso(sale.total)} nairekord`,
        `${sale.items.reduce((s, i) => s + i.qty, 0)} items · ${
          sale.payment === "gcash" ? "GCash" : sale.payment === "utang" ? "Utang" : "Cash"
        }`,
      );
      return total;
    },
    [markSync, notify],
  );

  const deleteSale = useCallback(
    (id: string) => {
      setDb((prev) => {
        const sale = prev.sales.find((s) => s.id === id);
        if (!sale) return prev;
        const products = prev.products.map((p) => {
          const it = sale.items.find((i) => i.productId === p.id);
          return it ? { ...p, stock: p.stock + it.qty } : p;
        });
        let customers = prev.customers;
        if (sale.payment === "utang" && sale.customerId) {
          customers = prev.customers.map((c) =>
            c.id === sale.customerId
              ? {
                  ...c,
                  balance: Math.max(0, c.balance - sale.total),
                  history: [
                    ...c.history,
                    {
                      ts: Date.now(),
                      type: "payment" as const,
                      amount: sale.total,
                      note: "Voided entry",
                    },
                  ],
                }
              : c,
          );
        }
        return {
          ...prev,
          products,
          customers,
          sales: prev.sales.filter((s) => s.id !== id),
          movements: prev.movements.filter((m) => m.saleId !== id),
        };
      });
      markSync();
      notify("info", "Entry voided", "Stock returned to shelf");
    },
    [markSync, notify],
  );

  const updateProduct = useCallback(
    (id: string, patch: Partial<Product>) => {
      setDb((prev) => ({
        ...prev,
        products: prev.products.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      }));
      markSync();
    },
    [markSync],
  );

  const addProduct = useCallback(
    (p: { name: string; cat: Cat; price: number; cost: number; stock: number }) => {
      setDb((prev) => ({
        ...prev,
        products: [{ id: uid(), ...p }, ...prev.products],
      }));
      markSync();
      notify("ok", "Produkto naidagdag", p.name);
    },
    [markSync, notify],
  );

  const addStock = useCallback(
    (productId: string, qty: number) => {
      setDb((prev) => {
        const prod = prev.products.find((p) => p.id === productId);
        if (!prod || qty <= 0) return prev;
        return {
          ...prev,
          products: prev.products.map((p) =>
            p.id === productId ? { ...p, stock: p.stock + qty } : p,
          ),
          movements: [
            {
              id: uid(),
              ts: Date.now(),
              productId,
              name: prod.name,
              type: "restock" as const,
              qty,
            },
            ...prev.movements,
          ],
        };
      });
      markSync();
      notify("ok", `+${qty} stock`, "Naitala ang delivery");
    },
    [markSync, notify],
  );

  const recordPayment = useCallback(
    (customerId: string, amount: number) => {
      if (amount <= 0) return;
      setDb((prev) => ({
        ...prev,
        customers: prev.customers.map((c) =>
          c.id === customerId
            ? {
                ...c,
                balance: Math.max(0, c.balance - amount),
                history: [
                  ...c.history,
                  { ts: Date.now(), type: "payment" as const, amount, note: "Bayad" },
                ],
              }
            : c,
        ),
      }));
      markSync();
      notify("ok", `${peso(amount)} nabayaran`, "Salamat, suki!");
    },
    [markSync, notify],
  );

  const addUtang = useCallback(
    (customerId: string, amount: number, note?: string) => {
      if (amount <= 0) return;
      setDb((prev) => ({
        ...prev,
        customers: prev.customers.map((c) =>
          c.id === customerId
            ? {
                ...c,
                balance: c.balance + amount,
                history: [
                  ...c.history,
                  { ts: Date.now(), type: "utang" as const, amount, note: note ?? "Tinda" },
                ],
              }
            : c,
        ),
      }));
      markSync();
      notify("warn", `${peso(amount)} utang naitala`, "Naidagdag sa ledger");
    },
    [markSync, notify],
  );

  const addCustomer = useCallback(
    (name: string, phone: string) => {
      setDb((prev) => ({
        ...prev,
        customers: [...prev.customers, { id: uid(), name, phone, history: [], balance: 0 }],
      }));
      markSync();
      notify("ok", "Suking naidagdag", name);
    },
    [markSync, notify],
  );

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      setSettings((s) => ({ ...s, ...patch }));
      schedulePush();
    },
    [schedulePush],
  );

  const resetDemo = useCallback(() => {
    localStorage.removeItem(KEY);
    window.location.reload();
  }, []);

  /* ---------------- cloud auth actions ---------------- */
  const login = useCallback(async (email: string) => {
    setGateBusy(true);
    const res = await sendMagicLink(email);
    setGateBusy(false);
    if (!res.ok) throw new Error(res.error ?? "Could not send the magic link");
    setGateSent(true);
  }, []);

  const logout = useCallback(() => {
    void signOutUser();
    setCloudUser(null);
    setGateSent(false);
    bootRef.current = false;
  }, []);

  const continueDemo = useCallback(() => setBypass(true), []);

  const mode: "demo" | "cloud" | "gate" = !configured || bypass ? "demo" : cloudUser ? "cloud" : "gate";

  if (mode === "gate") {
    return <LoginGate busy={gateBusy} sent={gateSent} onSend={login} onDemo={continueDemo} />;
  }

  return (
    <Ctx.Provider
      value={{
        db,
        settings,
        toasts,
        sync,
        t,
        notify,
        recordSale,
        deleteSale,
        updateProduct,
        addProduct,
        addStock,
        recordPayment,
        addUtang,
        addCustomer,
        updateSettings,
        resetDemo,
        cloud: { configured, mode, email: cloudUser?.email ?? null },
        login,
        logout,
        continueDemo,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useStore(): StoreCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
