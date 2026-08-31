/* ---------------- types ---------------- */

export type Cat = "noodles" | "coffee" | "snacks" | "drinks" | "staples" | "household" | "personal";
export type Payment = "cash" | "gcash" | "utang";

export interface Product {
  id: string;
  name: string;
  cat: Cat;
  price: number;
  cost: number;
  stock: number;
}

export interface UtangEntry {
  id: string;
  ts: number;
  type: "utang" | "payment";
  amount: number;
  note?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  balance: number;
  history: UtangEntry[];
}

export interface SaleItem {
  productId: string;
  name: string;
  cat: Cat;
  qty: number;
  price: number;
  cost: number;
}

export interface Sale {
  id: string;
  ts: number;
  items: SaleItem[];
  payment: Payment;
  total: number;
  customerId?: string;
}

export interface Movement {
  id: string;
  ts: number;
  productId: string;
  name: string;
  type: "restock" | "sale";
  qty: number; // positive = in, negative = out
}

export type StaffRole = "helper" | "accountant";

export interface Staff {
  id: string;
  name: string;
  phone: string;
  role: StaffRole;
  active: boolean;
  addedAt: number;
}

export interface DB {
  anchor: string;
  products: Product[];
  customers: Customer[];
  sales: Sale[]; // newest first
  movements: Movement[]; // newest first
  staff: Staff[];
}

export interface DayAgg {
  ts: number;
  revenue: number;
  profit: number;
  count: number;
}

/* ---------------- formatting ---------------- */

export const peso = (n: number) =>
  "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const peso0 = (n: number) => "₱" + Math.round(n).toLocaleString("en-PH");
export const fmtDay = (ts: number) =>
  new Date(ts).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
export const fmtTime = (ts: number) =>
  new Date(ts).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
export const timeAgo = (ts: number) => {
  const m = Math.max(1, Math.round((Date.now() - ts) / 60000));
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
};
export const startOfDay = (ts: number) => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/* ---------------- category meta ---------------- */

const CATS: Record<Cat, { en: string; tl: string; color: string }> = {
  noodles: { en: "Noodles", tl: "Pansit", color: "#d98a0b" },
  coffee: { en: "Coffee", tl: "Kape", color: "#8a5a33" },
  snacks: { en: "Snacks", tl: "Meryenda", color: "#c9463d" },
  drinks: { en: "Drinks", tl: "Inumin", color: "#2e6fd0" },
  staples: { en: "Staples", tl: "Panimbawan", color: "#2f8f5b" },
  household: { en: "Household", tl: "Pangbahay", color: "#2a8c8c" },
  personal: { en: "Personal", tl: "Pansarili", color: "#b0567e" },
};
export const catMeta = (c: Cat) => CATS[c];

/* ---------------- seed data ---------------- */

let seq = 0;
const nid = (p: string) => `${p}${(++seq).toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const ri = (a: number, b: number) => Math.round(rand(a, b));

const SEED_PRODUCTS: [string, Cat, number, number][] = [
  ["Lucky Me Pancit Canton", "noodles", 12, 9.5],
  ["Lucky Me Beef na Beef", "noodles", 12, 9.5],
  ["Payless Xtra Big", "noodles", 5, 3.5],
  ["Bear Brand 3-in-1", "coffee", 8, 6],
  ["Nescafé 3-in-1", "coffee", 7, 5],
  ["Kopiko Brown", "coffee", 5, 3.5],
  ["SkyFlakes 25g", "snacks", 6, 4.5],
  ["Rebisco Crackers", "snacks", 8, 6],
  ["Tangos Tortillos", "snacks", 6, 4.5],
  ["Piattos Cheese", "snacks", 20, 15],
  ["Coke Sakto 290ml", "drinks", 12, 9],
  ["Zesto Orange 220ml", "drinks", 5, 3.5],
  ["SkyLab 330ml", "drinks", 25, 18],
  ["Bear Brand 140ml", "drinks", 13, 10],
  ["Bigas Rice 1kg", "staples", 45, 38],
  ["Cooking Oil 500ml", "staples", 38, 30],
  ["555 Sardines", "staples", 15, 11],
  ["Century Tuna", "staples", 22, 16],
  ["Silver Swan 350ml", "staples", 25, 18],
  ["Surf 65g", "household", 15, 11],
  ["Zonrox 250ml", "household", 15, 11],
  ["Alaska Condensada", "staples", 32, 25],
  ["Safeguard 65g", "personal", 22, 16],
  ["Colgate 60g", "personal", 12, 8],
];

const SEED_CUSTOMERS: [string, string][] = [
  ["Mang Tonyo", "0917 555 2210"],
  ["Aling Marites", "0928 555 8841"],
  ["Kuya Ben", "0906 555 3127"],
  ["Nanay Cora", "0935 555 7402"],
  ["Tatay Jun", "0919 555 6683"],
  ["Inday Lorna", "0927 555 9918"],
  ["Ate Vicky", "0916 555 4455"],
  ["Mang Carding", "0939 555 1102"],
];

export function genDB(): DB {
  const now = Date.now();
  const products: Product[] = SEED_PRODUCTS.map(([name, cat, price, cost], i) => ({
    id: "p" + (i + 1),
    name,
    cat,
    price,
    cost,
    stock: ri(6, 48),
  }));
  // a few deliberately low/out for the alerts
  products[2].stock = 3;
  products[10].stock = 4;
  products[16].stock = 0;

  const customers: Customer[] = SEED_CUSTOMERS.map(([name, phone], i) => ({
    id: "c" + (i + 1),
    name,
    phone,
    balance: 0,
    history: [],
  }));

  const sales: Sale[] = [];
  const movements: Movement[] = [];

  /* 14 days of history */
  for (let d = 13; d >= 0; d--) {
    const day0 = startOfDay(now - d * 86400000);
    const isToday = d === 0;
    const dow = new Date(day0).getDay(); // 0 Sun
    const weekendBoost = dow === 5 || dow === 6 ? 1.35 : 1;
    const count = Math.round(ri(18, 34) * weekendBoost * (isToday ? 0.4 : 1));
    const cap = isToday ? Math.max(0, Math.min((now - day0) / 86400000, 1)) : 1;

    for (let s = 0; s < count; s++) {
      // hour distribution: lunch + evening rush, Fri/Sat peak 17-19h
      let hour: number;
      const r = Math.random();
      const peakEvening = (dow === 5 || dow === 6) && r < 0.5 ? 0.85 : 0.6;
      if (r < 0.32) hour = ri(11, 13);
      else if (r < 0.32 + peakEvening * 0.68) hour = ri(16, 20);
      else hour = ri(6, 21);
      const ts = day0 + hour * 3600000 + ri(0, 59) * 60000 + ri(0, 59) * 1000;
      if (ts > now) continue;

      const nItems = Math.random() < 0.62 ? 1 : Math.random() < 0.8 ? 2 : 3;
      const items: SaleItem[] = [];
      for (let k = 0; k < nItems; k++) {
        const p = products[ri(0, products.length - 1)];
        const qty = Math.random() < 0.78 ? 1 : ri(2, 3);
        const existing = items.find((x) => x.productId === p.id);
        if (existing) existing.qty += qty;
        else items.push({ productId: p.id, name: p.name, cat: p.cat, qty, price: p.price, cost: p.cost });
      }
      const total = items.reduce((a, i2) => a + i2.price * i2.qty, 0);
      const pr = Math.random();
      const payment: Payment = pr < 0.68 ? "cash" : pr < 0.86 ? "gcash" : "utang";
      const customer = payment === "utang" ? customers[ri(0, customers.length - 1)] : undefined;
      const sale: Sale = { id: nid("s"), ts, items, payment, total, customerId: customer?.id };
      sales.push(sale);
      items.forEach((i2) => movements.push({ id: nid("m"), ts, productId: i2.productId, name: i2.name, type: "sale", qty: -i2.qty }));
      if (customer) {
        customer.balance += total;
        customer.history.push({ id: nid("h"), ts, type: "utang", amount: total, note: "bili" });
      }
    }

    /* deliveries every ~3 days */
    if (d % 3 === 2) {
      const ts = day0 + 8 * 3600000 + ri(0, 90) * 60000;
      for (let k = 0; k < 6; k++) {
        const p = products[ri(0, products.length - 1)];
        const q = ri(12, 36);
        p.stock += q;
        movements.push({ id: nid("m"), ts, productId: p.id, name: p.name, type: "restock", qty: q });
      }
    }
  }

  /* utang payments scattered over the last 10 days */
  for (let d = 10; d >= 0; d--) {
    if (Math.random() < 0.45) {
      const c = customers[ri(0, customers.length - 1)];
      if (c.balance > 0) {
        const amt = Math.min(c.balance, ri(1, 4) * 20);
        const ts = startOfDay(now - d * 86400000) + ri(9, 20) * 3600000;
        if (ts <= now) {
          c.balance -= amt;
          c.history.push({ id: nid("h"), ts, type: "payment", amount: amt });
        }
      }
    }
  }
  // make one customer clearly overdue
  const overdue = customers[1];
  overdue.history.push({ id: nid("h"), ts: now - 12 * 86400000, type: "utang", amount: 180, note: "bigas + sardinas" });
  overdue.balance += 180;

  sales.sort((a, b) => b.ts - a.ts);
  movements.sort((a, b) => b.ts - a.ts);

  const staff: Staff[] = [
    { id: "st-jun", name: "Junjun", phone: "0917 555 2210", role: "helper", active: true, addedAt: Date.now() - 62 * 86400000 },
    { id: "st-grace", name: "Ate Grace", phone: "0928 555 8841", role: "accountant", active: true, addedAt: Date.now() - 24 * 86400000 },
  ];

  return { anchor: new Date().toDateString(), products, customers, sales, movements, staff };
}

/* ---------------- selectors ---------------- */

export const lowStock = (db: DB) => db.products.filter((p) => p.stock < 5);

export const overdueDays = (c: Customer): number => {
  if (c.balance <= 0 || c.history.length === 0) return 0;
  const last = Math.max(...c.history.map((h) => h.ts));
  return Math.floor((Date.now() - last) / 86400000);
};

export function dailySeries(db: DB, days: number): DayAgg[] {
  const today0 = startOfDay(Date.now());
  const out: DayAgg[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const from = today0 - i * 86400000;
    const to = from + 86400000;
    const list = db.sales.filter((s) => s.ts >= from && s.ts < to);
    out.push({
      ts: from,
      revenue: list.reduce((a, s) => a + s.total, 0),
      profit: list.reduce((a, s) => a + s.items.reduce((x, it) => x + (it.price - it.cost) * it.qty, 0), 0),
      count: list.length,
    });
  }
  return out;
}

export const prevDailySeries = (db: DB, days: number): DayAgg[] => {
  const today0 = startOfDay(Date.now());
  const out: DayAgg[] = [];
  for (let i = 0; i < days; i++) {
    const from = today0 - (days + i) * 86400000;
    const to = from + 86400000;
    const list = db.sales.filter((s) => s.ts >= from && s.ts < to);
    out.push({
      ts: from,
      revenue: list.reduce((a, s) => a + s.total, 0),
      profit: 0,
      count: list.length,
    });
  }
  return out.reverse();
};

export function productAgg(db: DB, days: number): Map<string, { units: number; revenue: number; profit: number }> {
  const from = startOfDay(Date.now()) - (days - 1) * 86400000;
  const map = new Map<string, { units: number; revenue: number; profit: number }>();
  db.sales
    .filter((s) => s.ts >= from)
    .forEach((s) =>
      s.items.forEach((it) => {
        const cur = map.get(it.productId) ?? { units: 0, revenue: 0, profit: 0 };
        cur.units += it.qty;
        cur.revenue += it.price * it.qty;
        cur.profit += (it.price - it.cost) * it.qty;
        map.set(it.productId, cur);
      }),
    );
  return map;
}

export function paymentMix(db: DB, days: number): { cash: number; gcash: number; utang: number } {
  const from = days <= 1 ? startOfDay(Date.now()) : startOfDay(Date.now()) - (days - 1) * 86400000;
  const out = { cash: 0, gcash: 0, utang: 0 };
  db.sales.filter((s) => s.ts >= from).forEach((s) => (out[s.payment] += s.total));
  return out;
}

/** 7 rows (Mon–Sun) × 17 cols (5:00–21:00) revenue over last 28 days */
export function heatmap(db: DB): number[][] {
  const grid: number[][] = Array.from({ length: 7 }, () => Array(17).fill(0));
  const cutoff = startOfDay(Date.now()) - 27 * 86400000;
  db.sales
    .filter((s) => s.ts >= cutoff)
    .forEach((s) => {
      const d = new Date(s.ts);
      const row = (d.getDay() + 6) % 7; // Monday = 0
      const col = d.getHours() - 5;
      if (col >= 0 && col < 17) grid[row][col] += s.total;
    });
  return grid;
}

/* ---------------- CSV (formula-injection safe) ---------------- */

export function downloadCSV(filename: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    let s = String(v);
    if (/^[=+\-@]/.test(s)) s = "'" + s; // neutralize spreadsheet formulas
    if (/[",\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const csv = rows.map((r) => r.map(esc).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
