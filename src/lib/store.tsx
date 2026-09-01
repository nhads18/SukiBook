import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  type Staff,
  type StaffRole,
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
import AuthScreen, { type AuthPhase } from "../components/AuthScreen";
import {
  endSession,
  getValidSession,
  IDLE_LIMIT_MS,
  isIdleLocked,
  listUsers,
  registerAccount,
  remainingFails,
  resetAccount,
  touchSession,
  verifyPin,
} from "./auth";

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
  recordPayment: (customerId: string, amount: number) => void;
  addUtang: (customerId: string, amount: number, note?: string) => void;
  /** Adds a suki and returns the new id so pickers can auto-select it. */
  addCustomer: (name: string, phone: string) => string;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  addProduct: (p: Omit<Product, "id">) => void;
  addStock: (id: string, qty: number) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetDemo: () => void;
  addStaff: (name: string, role: StaffRole, phone: string) => void;
  updateStaff: (id: string, patch: Partial<Omit<Staff, "id">>) => void;
  removeStaff: (id: string) => void;
  cloud: { configured: boolean; mode: "demo" | "cloud" | "gate"; email: string | null };
  login: (email: string) => Promise<void>;
  logout: () => void;
  continueDemo: () => void;
  auth: { phase: AuthPhase | "ready"; email: string | null };
  authUsers: { email: string; name: string; storeName: string }[];
  authRegister: (email: string, name: string, storeName: string, pin: string) => Promise<string | null>;
  authSignIn: (email: string, pin: string) => Promise<string | null>;
  authUnlock: (pin: string) => Promise<string | null>;
  lockNow: () => void;
  signOut: () => void;
  resetAccountAction: (email: string) => void;
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
        /* Backfill for snapshots saved before the staff ledger existed. */
        return { db: { ...parsed.db, staff: parsed.db.staff ?? [] }, settings: { ...defaults, ...parsed.settings } };
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
  const bootRef = useRef(false);
  const cloudTimer = useRef<number | null>(null);

  /* persist local snapshot (offline-first) */
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ db, settings }));
    } catch {
      /* storage full — demo continues in memory */
    }
  }, [db, settings]);

  /* Apply the active theme: re-skins every token + browser chrome color. */
  useEffect(() => {
    const theme = THEMES.some((t) => t.key === settings.theme) ? settings.theme : "awning";
    document.documentElement.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    const found = THEMES.find((t) => t.key === theme);
    if (meta && found) meta.setAttribute("content", found.meta);
  }, [settings.theme]);

  const notify = useCallback((kind: Toast["kind"], title: string, sub?: string) => {
    const id = ++toastId.current;
    setToasts((ts) => [...ts.slice(-3), { id, kind, title, sub }]);
    window.setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 3600);
  }, []);

  /* ---------------- local auth (PIN + session, spec §10) ---------------- */
  const [auth, setAuth] = useState<{ phase: AuthPhase | "ready"; email: string | null }>(() => {
    const users = listUsers();
    if (users.length === 0) return { phase: "register", email: null };
    const s = getValidSession();
    if (!s) return { phase: "login", email: null };
    if (isIdleLocked(s)) return { phase: "locked", email: s.email };
    return { phase: "ready", email: s.email };
  });
  const lastTouch = useRef(Date.now());

  /* activity tracking: idle 5 min → auto-lock */
  useEffect(() => {
    const touch = () => {
      lastTouch.current = Date.now();
      touchSession();
    };
    window.addEventListener("pointerdown", touch);
    window.addEventListener("keydown", touch);
    const iv = window.setInterval(() => {
      setAuth((a) =>
        a.phase === "ready" && Date.now() - lastTouch.current > IDLE_LIMIT_MS
          ? { phase: "locked", email: a.email }
          : a,
      );
    }, 15_000);
    return () => {
      window.removeEventListener("pointerdown", touch);
      window.removeEventListener("keydown", touch);
      window.clearInterval(iv);
    };
  }, []);

  const authRegister = useCallback(
    async (email: string, name: string, storeName: string, pin: string) => {
      const res = await registerAccount(email, name, storeName, pin);
      if (!res.ok) return res.error;
      setSettings((s) => ({
        ...s,
        storeName: storeName.trim() || s.storeName,
        owner: name.trim() || s.owner,
      }));
      lastTouch.current = Date.now();
      setAuth({ phase: "ready", email: email.trim().toLowerCase() });
      notify("ok", "Store opened", "Account created — PIN is salted & hashed on-device");
      return null;
    },
    [notify],
  );

  const verify = useCallback(async (email: string, pin: string) => {
    const res = await verifyPin(email, pin);
    if (res.ok) return null;
    if (res.reason === "locked") return `Locked for ${res.remaining}s — too many wrong PINs`;
    if (res.reason === "no-user") return "No account for that email";
    return `Wrong PIN — ${remainingFails(email)} tries left`;
  }, []);

  const authSignIn = useCallback(
    async (email: string, pin: string) => {
      const err = await verify(email, pin);
      if (err) return err;
      lastTouch.current = Date.now();
      setAuth({ phase: "ready", email: email.trim().toLowerCase() });
      return null;
    },
    [verify],
  );

  const authUnlock = useCallback(
    async (pin: string) => {
      const email = auth.email;
      if (!email) return "Session expired — sign in again";
      const err = await verify(email, pin);
      if (err) return err;
      lastTouch.current = Date.now();
      setAuth({ phase: "ready", email });
      return null;
    },
    [auth.email, verify],
  );

  const lockNow = useCallback(() => {
    setAuth((a) => (a.phase === "ready" ? { phase: "locked", email: a.email } : a));
  }, []);

  const signOut = useCallback(() => {
    endSession();
    const users = listUsers();
    setAuth(users.length ? { phase: "login", email: null } : { phase: "register", email: null });
    notify("info", "Signed out", "Session ended — PIN required to reopen");
  }, [notify]);

  const resetAccountAction = useCallback(
    (email: string) => {
      const left = resetAccount(email);
      setAuth(left ? { phase: "login", email: null } : { phase: "register", email: null });
      notify("info", "Account removed", "Ledger data was kept on this device");
    },
    [notify],
  );

  const authUsers = useMemo(
    () => listUsers().map(({ email, name, storeName }) => ({ email, name, storeName })),
    // recompute whenever the gate re-renders
    [auth.phase],
  );

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

  /* ---------------- mutations ---------------- */

  const recordSale = useCallback(
    (input: SaleInput): number => {
      let total = 0;
      const now = Date.now();
      const sale: Sale = { id: uid(), ts: now, items: [], payment: input.payment, total: 0 };
      const movs: DB["movements"] = [];
      setDb((prev) => {
        const products = prev.products.map((p) => {
          const line = input.lines.find((l) => l.productId === p.id);
          if (!line) return p;
          const qty = Math.min(line.qty, p.stock);
          if (qty <= 0) return p;
          sale.items.push({ productId: p.id, name: p.name, cat: p.cat, qty, price: p.price, cost: p.cost });
          movs.push({ id: uid(), ts: now, productId: p.id, name: p.name, type: "sale", qty: -qty });
          return { ...p, stock: p.stock - qty };
        });
        total = sale.items.reduce((s, i) => s + i.price * i.qty, 0);
        sale.total = total;
        if (input.payment === "utang" && input.customerId) sale.customerId = input.customerId;
        const customers =
          input.payment === "utang" && input.customerId
            ? prev.customers.map((c) =>
                c.id === input.customerId
                  ? {
                      ...c,
                      balance: c.balance + total,
                      history: [...c.history, { id: uid(), ts: now, type: "utang" as const, amount: total, note: "bili" }],
                    }
                  : c,
              )
            : prev.customers;
        return { ...prev, products, customers, sales: [sale, ...prev.sales], movements: [...movs, ...prev.movements] };
      });
      markSync();
      return total;
    },
    [markSync],
  );

  const recordPayment = useCallback(
    (customerId: string, amount: number) => {
      setDb((prev) => ({
        ...prev,
        customers: prev.customers.map((c) =>
          c.id === customerId
            ? {
                ...c,
                balance: Math.max(0, c.balance - amount),
                history: [...c.history, { id: uid(), ts: Date.now(), type: "payment" as const, amount }],
              }
            : c,
        ),
      }));
      markSync();
      notify("ok", "Bayad recorded", peso(amount));
    },
    [markSync, notify],
  );

  const addUtang = useCallback(
    (customerId: string, amount: number, note?: string) => {
      setDb((prev) => ({
        ...prev,
        customers: prev.customers.map((c) =>
          c.id === customerId
            ? {
                ...c,
                balance: c.balance + amount,
                history: [...c.history, { id: uid(), ts: Date.now(), type: "utang" as const, amount, note }],
              }
            : c,
        ),
      }));
      markSync();
    },
    [markSync],
  );

  const addCustomer = useCallback(
    (name: string, phone: string): string => {
      const id = uid();
      setDb((prev) => ({
        ...prev,
        customers: [...prev.customers, { id, name, phone, balance: 0, history: [] }],
      }));
      markSync();
      notify("ok", "Suki added", name);
      return id;
    },
    [markSync, notify],
  );

  /* ---------------- staff management ---------------- */

  const addStaff = useCallback(
    (name: string, role: StaffRole, phone: string) => {
      setDb((prev) => ({
        ...prev,
        staff: [...(prev.staff ?? []), { id: uid(), name, phone, role, active: true, addedAt: Date.now() }],
      }));
      markSync();
      notify("ok", "Staff added", `${name} · ${role}`);
    },
    [markSync, notify],
  );

  const updateStaff = useCallback(
    (id: string, patch: Partial<Omit<Staff, "id">>) => {
      setDb((prev) => ({
        ...prev,
        staff: (prev.staff ?? []).map((s) => (s.id === id ? { ...s, ...patch } : s)),
      }));
      markSync();
    },
    [markSync],
  );

  const removeStaff = useCallback(
    (id: string) => {
      const gone = dbRef.current.staff?.find((s) => s.id === id);
      setDb((prev) => ({ ...prev, staff: (prev.staff ?? []).filter((s) => s.id !== id) }));
      markSync();
      if (gone) notify("info", "Staff removed", gone.name);
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
    (p: Omit<Product, "id">) => {
      setDb((prev) => ({ ...prev, products: [{ ...p, id: uid() }, ...prev.products] }));
      markSync();
      notify("ok", "Product added", p.name);
    },
    [markSync, notify],
  );

  const addStock = useCallback(
    (id: string, qty: number) => {
      setDb((prev) => {
        const p = prev.products.find((x) => x.id === id);
        if (!p) return prev;
        return {
          ...prev,
          products: prev.products.map((x) => (x.id === id ? { ...x, stock: x.stock + qty } : x)),
          movements: [
            { id: uid(), ts: Date.now(), productId: id, name: p.name, type: "restock" as const, qty },
            ...prev.movements,
          ],
        };
      });
      markSync();
    },
    [markSync],
  );

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      setSettings((s) => ({ ...s, ...patch }));
      schedulePush();
    },
    [schedulePush],
  );

  const resetDemo = useCallback(() => {
    setDb(genDB());
    markSync();
    notify("info", "Demo data reset", "Fresh 14-day ledger generated");
  }, [markSync, notify]);

  const login = useCallback(
    async (email: string) => {
      setGateBusy(true);
      try {
        const res = await sendMagicLink(email);
        if (!res.ok) throw new Error(res.error ?? "Could not send link");
        setGateSent(true);
      } finally {
        setGateBusy(false);
      }
    },
    [],
  );

  const logout = useCallback(() => {
    void signOutUser();
    setBypass(false);
    bootRef.current = false;
    setCloudUser(null);
  }, []);

  const continueDemo = useCallback(() => setBypass(true), []);

  const cloud: StoreCtx["cloud"] = !configured
    ? { configured: false, mode: "demo", email: null }
    : cloudUser
      ? { configured: true, mode: "cloud", email: cloudUser.email }
      : bypass
        ? { configured: true, mode: "demo", email: null }
        : { configured: true, mode: "gate", email: null };

  const value: StoreCtx = {
    db, settings, toasts, sync, t, notify,
    recordSale, recordPayment, addUtang, addCustomer,
    updateProduct, addProduct, addStock, updateSettings, resetDemo,
    addStaff, updateStaff, removeStaff,
    cloud, login, logout, continueDemo,
    auth, authUsers, authRegister, authSignIn, authUnlock, lockNow, signOut, resetAccountAction,
  };

  if (cloud.mode === "gate") {
    return (
      <LoginGate
        busy={gateBusy}
        sent={gateSent}
        onSend={login}
        onDemo={continueDemo}
      />
    );
  }

  /* Local PIN gate — skipped only when a live Supabase session owns auth. */
  if (!cloudUser && auth.phase !== "ready") {
    return (
      <AuthScreen
        phase={auth.phase}
        email={auth.email}
        users={authUsers}
        onRegister={authRegister}
        onSignIn={authSignIn}
        onUnlock={authUnlock}
        onResetAccount={resetAccountAction}
      />
    );
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): StoreCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export { peso };
