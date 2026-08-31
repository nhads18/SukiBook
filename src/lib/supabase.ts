import type { SupabaseClient } from "@supabase/supabase-js";
import type { Customer, DB, Movement, Product, Sale } from "./data";

/** True once real Supabase credentials are provided at build time (Vercel env vars). */
export const isCloudConfigured = (): boolean =>
  URL.startsWith("http") && ANON.length > 20;

const URL = import.meta.env.VITE_SUPABASE_URL ?? "";
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

let _client: SupabaseClient | null = null;
let _clientPromise: Promise<SupabaseClient | null> | null = null;

function getClient(): Promise<SupabaseClient | null> {
  if (_client) return Promise.resolve(_client);
  if (!isCloudConfigured()) return Promise.resolve(null);
  if (!_clientPromise) {
    _clientPromise = import("@supabase/supabase-js").then(({ createClient }) => {
      _client = createClient(URL, ANON, {
        auth: { persistSession: true, autoRefreshToken: true },
      });
      return _client;
    });
  }
  return _clientPromise;
}

export interface CloudUser {
  id: string;
  email: string;
}

export async function sendMagicLink(email: string): Promise<{ ok: boolean; error?: string }> {
  const supa = await getClient();
  if (!supa) return { ok: false, error: "Cloud not configured" };
  const { error } = await supa.auth.signInWithOtp({ email });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function signOutUser(): Promise<void> {
  const supa = await getClient();
  if (supa) await supa.auth.signOut();
}

export function onAuthChange(cb: (user: CloudUser | null) => void): () => void {
  if (!isCloudConfigured()) return () => undefined;
  let unsub: (() => void) | null = null;
  let cancelled = false;
  void getClient().then((supa) => {
    if (!supa || cancelled) return;
    const { data } = supa.auth.onAuthStateChange((_event, session) => {
      const u = session?.user;
      cb(u ? { id: u.id, email: u.email ?? "" } : null);
    });
    unsub = () => data.subscription.unsubscribe();
  });
  return () => {
    cancelled = true;
    unsub?.();
  };
}

/* ---------- row mapping (local DB shape ⇄ Postgres) ---------- */

function toRows(storeId: string, db: DB) {
  return {
    products: db.products.map((p) => ({
      id: p.id, store_id: storeId, name: p.name, cat: p.cat,
      price: p.price, cost: p.cost, stock: p.stock, updated_at: new Date().toISOString(),
    })),
    customers: db.customers.map((c) => ({
      id: c.id, store_id: storeId, name: c.name, phone: c.phone,
      balance: c.balance, history: c.history,
    })),
    sales: db.sales.map((s) => ({
      id: s.id, store_id: storeId, payment: s.payment, total: s.total,
      ts: new Date(s.ts).toISOString(), customer_id: s.customerId ?? null, items: s.items,
    })),
    movements: db.movements.map((m) => ({
      id: m.id, store_id: storeId, product_id: m.productId, name: m.name,
      type: m.type, qty: m.qty, ts: new Date(m.ts).toISOString(),
    })),
  };
}

export function freshAnchor(): string {
  return new Date().toDateString();
}

/** Hydrate the local DB from the cloud (returns null bundle for a fresh store). */
export async function pullStore(
  storeId: string,
): Promise<{ bundle: Omit<DB, "anchor"> | null; settings: Record<string, unknown> | null }> {
  const supa = await getClient();
  if (!supa) throw new Error("Supabase is not configured");
  const [p, c, s, m, cfg] = await Promise.all([
    supa.from("sb_products").select("*").eq("store_id", storeId),
    supa.from("sb_customers").select("*").eq("store_id", storeId),
    supa.from("sb_sales").select("*").eq("store_id", storeId).order("ts", { ascending: false }),
    supa.from("sb_movements").select("*").eq("store_id", storeId).order("ts", { ascending: false }),
    supa.from("sb_settings").select("doc").eq("store_id", storeId).maybeSingle(),
  ]);
  if (p.error) throw new Error(p.error.message);
  if (c.error) throw new Error(c.error.message);
  if (s.error) throw new Error(s.error.message);
  if (m.error) throw new Error(m.error.message);
  if (cfg.error) throw new Error(cfg.error.message);

  if (!p.data || p.data.length === 0) return { bundle: null, settings: (cfg.data?.doc as Record<string, unknown>) ?? null };

  const products: Product[] = (p.data ?? []).map((r) => ({
    id: r.id, name: r.name, cat: r.cat, price: Number(r.price), cost: Number(r.cost), stock: r.stock,
  }));
  const customers: Customer[] = (c.data ?? []).map((r) => ({
    id: r.id, name: r.name, phone: r.phone ?? "", balance: Number(r.balance),
    history: Array.isArray(r.history) ? r.history : [],
  }));
  const sales: Sale[] = (s.data ?? []).map((r) => ({
    id: r.id, ts: new Date(r.ts).getTime(), items: Array.isArray(r.items) ? r.items : [],
    payment: r.payment, total: Number(r.total), customerId: r.customer_id ?? undefined,
  }));
  const movements: Movement[] = (m.data ?? []).map((r) => ({
    id: r.id, ts: new Date(r.ts).getTime(), productId: r.product_id, name: r.name,
    type: r.type, qty: Number(r.qty),
  }));
  return {
    bundle: { products, customers, sales, movements },
    settings: (cfg.data?.doc as Record<string, unknown>) ?? null,
  };
}

/**
 * Atomic push via the `sb_push_store` RPC — ONE Postgres transaction.
 * The server stamps store_id from the JWT (auth.uid()); the client payload
 * carries no ownership, so a tampered client cannot target another store.
 */
export async function pushStore(
  _storeId: string,
  db: DB,
  settings: Record<string, unknown>,
): Promise<void> {
  const supa = await getClient();
  if (!supa) throw new Error("Supabase is not configured");
  const rows = toRows(_storeId, db);
  const { error } = await supa.rpc("sb_push_store", {
    p_products: rows.products,
    p_customers: rows.customers,
    p_sales: rows.sales,
    p_movements: rows.movements,
    p_settings: settings,
  });
  if (error) throw new Error(error.message);
}
