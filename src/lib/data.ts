/* ------------------------------------------------------------------ */
/* SukiBook data engine — types, seeded demo data, derived selectors  */
/* ------------------------------------------------------------------ */

export type Payment = "cash" | "gcash" | "utang";
export type Cat =
  | "noodles"
  | "coffee"
  | "snacks"
  | "drinks"
  | "staples"
  | "household"
  | "personal";

export interface Product {
  id: string;
  name: string;
  cat: Cat;
  price: number;
  cost: number;
  stock: number;
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
  customerId?: string;
  total: number;
}

export interface HistEntry {
  ts: number;
  type: "utang" | "payment";
  amount: number;
  note?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  history: HistEntry[];
  balance: number;
}

export interface Movement {
  id: string;
  ts: number;
  productId: string;
  name: string;
  type: "sale" | "restock";
  qty: number;
  saleId?: string;
}

export interface DB {
  anchor: string;
  products: Product[];
  sales: Sale[];
  customers: Customer[];
  movements: Movement[];
}

export const CATS: { key: Cat; en: string; tl: string; color: string }[] = [
  { key: "noodles", en: "Noodles", tl: "Pansit", color: "#d98a0b" },
  { key: "coffee", en: "Coffee & Milk", tl: "Kape at Gatas", color: "#8a5a2b" },
  { key: "snacks", en: "Snacks", tl: "Meryenda", color: "#c9463d" },
  { key: "drinks", en: "Drinks", tl: "Inumin", color: "#2e6fd0" },
  { key: "staples", en: "Bigas & Pantry", tl: "Bigas at Pantry", color: "#2f8f5b" },
  { key: "household", en: "Household", tl: "Gamit-bahay", color: "#7a6bbf" },
  { key: "personal", en: "Personal Care", tl: "Pang-katawan", color: "#c05a8f" },
];

export const catMeta = (c: Cat) => CATS.find((x) => x.key === c) ?? CATS[0];

/* ------------------------------ seeded RNG ------------------------ */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY = 86400000;
export const startOfDay = (ts: number) => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/* ------------------------------ products -------------------------- */

const SEED_PRODUCTS: [string, Cat, number, number, number][] = [
  ["Lucky Me! Pancit Canton", "noodles", 15, 11.4, 46],
  ["Nescafé 3-in-1", "coffee", 8, 6.1, 64],
  ["Bear Brand 33g", "coffee", 13, 10.6, 28],
  ["Kopiko Brown Coffee", "coffee", 7, 5.3, 4],
  ["Skyflakes (pack)", "snacks", 12, 9.1, 18],
  ["Piattos Cheese", "snacks", 12, 9.2, 34],
  ["Nova Multigrain", "snacks", 12, 9.3, 15],
  ["Chippy BBQ", "snacks", 12, 9.2, 2],
  ["Rebisco (10s pack)", "snacks", 7, 5.4, 42],
  ["Coca-Cola Sakto 290ml", "drinks", 12, 9.4, 30],
  ["Royal Tru-Orange 290ml", "drinks", 12, 9.5, 3],
  ["Absolute Mineral 500ml", "drinks", 12, 8.9, 22],
  ["Itlog (per piece)", "staples", 9, 7.4, 52],
  ["Bigas Dinorado (per kg)", "staples", 52, 45.5, 24],
  ["Sinigang Mix (pork)", "staples", 11, 8.6, 16],
  ["Toyo 150ml", "staples", 15, 12.1, 9],
  ["Surf Powder 65g", "household", 10, 7.9, 33],
  ["Downy Sunrise sachet", "household", 8, 6.3, 21],
  ["Head & Shoulders sachet", "personal", 9, 6.9, 25],
  ["Safeguard Soap 60g", "personal", 18, 14.8, 7],
];

const POP_WEIGHT = [10, 9, 5, 4, 4, 6, 4, 3, 5, 6, 3, 4, 7, 3, 2, 2, 3, 2, 2, 2];

const HOUR_W: [number, number][] = [
  [6, 1], [7, 3], [8, 2], [9, 1], [10, 2], [11, 3], [12, 3], [13, 1],
  [14, 1], [15, 2], [16, 3], [17, 4], [18, 4], [19, 3], [20, 2],
];

/* ------------------------------ generator ------------------------- */

export function genDB(): DB {
  const rand = mulberry32(20260117);
  const weighted = (pairs: [number, number][]) => {
    const tot = pairs.reduce((s, [, w]) => s + w, 0);
    let r = rand() * tot;
    for (const [v, w] of pairs) {
      r -= w;
      if (r <= 0) return v;
    }
    return pairs[pairs.length - 1][0];
  };
  const pickIdx = (weights: number[]) => {
    const tot = weights.reduce((s, w) => s + w, 0);
    let r = rand() * tot;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) return i;
    }
    return weights.length - 1;
  };

  const products: Product[] = SEED_PRODUCTS.map(([name, cat, price, cost, stock], i) => ({
    id: `p${i + 1}`,
    name,
    cat,
    price,
    cost,
    stock,
  }));

  const now = Date.now();
  const today0 = startOfDay(now);

  const customers: Customer[] = [
    { id: "c1", name: "Aling Marites", phone: "0917 555 2341", history: [{ ts: now - 9 * DAY, type: "utang", amount: 220, note: "Paninda + bigas" }, { ts: now - 6 * DAY, type: "payment", amount: 40 }], balance: 0 },
    { id: "c2", name: "Mang Jun (tricycle)", phone: "0928 555 7712", history: [{ ts: now - 4 * DAY, type: "utang", amount: 130, note: "Kape at yosi" }, { ts: now - 1 * DAY, type: "payment", amount: 35 }], balance: 0 },
    { id: "c3", name: "Kuya Boy", phone: "0906 555 9918", history: [{ ts: now - 19 * DAY, type: "utang", amount: 300, note: "Pambahay minggo" }, { ts: now - 14 * DAY, type: "payment", amount: 60 }], balance: 0 },
    { id: "c4", name: "Ate Ging", phone: "0917 555 4480", history: [{ ts: now - 2 * DAY, type: "utang", amount: 85, note: "Ulilng kids" }, { ts: now - 0.5 * DAY, type: "payment", amount: 25 }], balance: 0 },
    { id: "c5", name: "Tatang Romy", phone: "0919 555 6034", history: [{ ts: now - 12 * DAY, type: "utang", amount: 150, note: "Bills week" }, { ts: now - 5 * DAY, type: "payment", amount: 150, note: "Sahod!" }], balance: 0 },
    { id: "c6", name: "Nanay Caring", phone: "0920 555 1177", history: [{ ts: now - 11 * DAY, type: "utang", amount: 175, note: "Gamot + sabon" }, { ts: now - 7 * DAY, type: "payment", amount: 40 }], balance: 0 },
  ];

  const sales: Sale[] = [];
  const movements: Movement[] = [];
  let sid = 0;
  let mid = 0;

  for (let d = 13; d >= 0; d--) {
    const dayStart = today0 - d * DAY;
    const dow = new Date(dayStart).getDay();
    const weekend = dow === 0 || dow === 6;
    let count = 14 + Math.floor(rand() * 9) + (weekend ? 6 : 0);
    if (d === 0) count = 21;
    for (let i = 0; i < count; i++) {
      const hour = weighted(HOUR_W);
      const ts = dayStart + hour * 3600000 + Math.floor(rand() * 3540000);
      const nItems = rand() < 0.78 ? 1 : rand() < 0.7 ? 2 : 3;
      const chosen = new Set<number>();
      const items: SaleItem[] = [];
      for (let k = 0; k < nItems; k++) {
        const pi = pickIdx(POP_WEIGHT);
        if (chosen.has(pi)) continue;
        chosen.add(pi);
        const p = products[pi];
        const qty = p.name.startsWith("Bigas") ? 1 + Math.floor(rand() * 2) : 1 + (rand() < 0.28 ? 1 : 0);
        items.push({ productId: p.id, name: p.name, cat: p.cat, qty, price: p.price, cost: p.cost });
      }
      const total = items.reduce((s, it) => s + it.qty * it.price, 0);
      const pr = rand();
      const payment: Payment = pr < 0.6 ? "cash" : pr < 0.84 ? "gcash" : "utang";
      const sale: Sale = { id: `s${++sid}`, ts, items, payment, total };
      if (payment === "utang" && d > 0) {
        const c = customers[Math.floor(rand() * 5)];
        sale.customerId = c.id;
        c.history.push({ ts, type: "utang", amount: total, note: items[0].name + (items.length > 1 ? " +" + (items.length - 1) : "") });
      } else if (payment === "utang") {
        sale.payment = "cash";
      }
      sales.push(sale);
      for (const it of items) {
        movements.push({ id: `m${++mid}`, ts, productId: it.productId, name: it.name, type: "sale", qty: -it.qty, saleId: sale.id });
      }
    }
  }

  /* restock deliveries */
  for (const d of [11, 8, 5, 2]) {
    const dayStart = today0 - d * DAY;
    const n = 4 + Math.floor(rand() * 3);
    for (let k = 0; k < n; k++) {
      const p = products[Math.floor(rand() * products.length)];
      const qty = 12 + Math.floor(rand() * 36);
      movements.push({
        id: `m${++mid}`,
        ts: dayStart + (8 + Math.floor(rand() * 3)) * 3600000,
        productId: p.id,
        name: p.name,
        type: "restock",
        qty,
      });
    }
  }

  for (const c of customers) {
    c.history.sort((a, b) => a.ts - b.ts);
    c.balance = Math.round(
      c.history.reduce((s, h) => s + (h.type === "utang" ? h.amount : -h.amount), 0),
    );
    if (c.balance < 0) c.balance = 0;
  }

  movements.sort((a, b) => b.ts - a.ts);
  sales.sort((a, b) => b.ts - a.ts);

  return { anchor: new Date(today0).toDateString(), products, sales, customers, movements };
}

/* ------------------------------ selectors ------------------------- */

export interface DayAgg {
  ts: number;
  revenue: number;
  profit: number;
  count: number;
  items: number;
}

export const inRange = (ts: number, days: number) => {
  const t0 = startOfDay(Date.now()) - (days - 1) * DAY;
  return ts >= t0;
};

export function dailySeries(db: DB, days: number): DayAgg[] {
  const t0 = startOfDay(Date.now()) - (days - 1) * DAY;
  const out: DayAgg[] = Array.from({ length: days }, (_, i) => ({
    ts: t0 + i * DAY,
    revenue: 0,
    profit: 0,
    count: 0,
    items: 0,
  }));
  for (const s of db.sales) {
    if (s.ts < t0) continue;
    const idx = Math.floor((startOfDay(s.ts) - t0) / DAY);
    if (idx < 0 || idx >= days) continue;
    out[idx].revenue += s.total;
    out[idx].count += 1;
    for (const it of s.items) {
      out[idx].profit += (it.price - it.cost) * it.qty;
      out[idx].items += it.qty;
    }
  }
  return out;
}

export function prevDailySeries(db: DB, days: number): DayAgg[] {
  const t0 = startOfDay(Date.now()) - (2 * days - 1) * DAY;
  const t1 = startOfDay(Date.now()) - days * DAY + DAY - 1;
  const out: DayAgg[] = Array.from({ length: days }, (_, i) => ({
    ts: t0 + i * DAY,
    revenue: 0,
    profit: 0,
    count: 0,
    items: 0,
  }));
  for (const s of db.sales) {
    if (s.ts < t0 || s.ts > t1) continue;
    const idx = Math.floor((startOfDay(s.ts) - t0) / DAY);
    if (idx >= 0 && idx < days) out[idx].revenue += s.total;
  }
  return out;
}

export function productAgg(db: DB, days: number) {
  const map = new Map<string, { units: number; revenue: number; profit: number }>();
  for (const p of db.products) map.set(p.id, { units: 0, revenue: 0, profit: 0 });
  const t0 = startOfDay(Date.now()) - (days - 1) * DAY;
  for (const s of db.sales) {
    if (s.ts < t0) continue;
    for (const it of s.items) {
      const a = map.get(it.productId);
      if (!a) continue;
      a.units += it.qty;
      a.revenue += it.qty * it.price;
      a.profit += it.qty * (it.price - it.cost);
    }
  }
  return map;
}

export function paymentMix(db: DB, days: number) {
  const mix: Record<Payment, number> = { cash: 0, gcash: 0, utang: 0 };
  const t0 = startOfDay(Date.now()) - (days - 1) * DAY;
  for (const s of db.sales) if (s.ts >= t0) mix[s.payment] += s.total;
  return mix;
}

/** 7 rows (Mon..Sun) x 17 cols (hour 5..21) */
export function heatmap(db: DB, days = 28): number[][] {
  const grid: number[][] = Array.from({ length: 7 }, () => Array(17).fill(0));
  const t0 = Date.now() - days * DAY;
  for (const s of db.sales) {
    if (s.ts < t0) continue;
    const d = new Date(s.ts);
    const row = (d.getDay() + 6) % 7;
    const col = d.getHours() - 5;
    if (col >= 0 && col < 17) grid[row][col] += s.total;
  }
  return grid;
}

export const lowStock = (db: DB) => db.products.filter((p) => p.stock < 5);

export const overdueDays = (c: Customer) => {
  if (c.balance <= 0) return 0;
  const pays = c.history.filter((h) => h.type === "payment");
  const ref = pays.length ? pays[pays.length - 1].ts : c.history[0]?.ts ?? Date.now();
  return Math.max(0, Math.floor((Date.now() - ref) / DAY));
};

export const collectedSince = (db: DB, ts: number) =>
  db.customers.reduce(
    (s, c) =>
      s + c.history.filter((h) => h.type === "payment" && h.ts >= ts).reduce((a, h) => a + h.amount, 0),
    0,
  );

/* ------------------------------ formatters ------------------------ */

export const peso = (n: number) =>
  "₱" +
  n.toLocaleString("en-PH", {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: Number.isInteger(n) ? 0 : 2,
  });

export const peso0 = (n: number) => "₱" + Math.round(n).toLocaleString("en-PH");

export const fmtTime = (ts: number) =>
  new Date(ts).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });

export const fmtDay = (ts: number) =>
  new Date(ts).toLocaleDateString("en-PH", { month: "short", day: "numeric" });

export const fmtDayFull = (ts: number) =>
  new Date(ts).toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" });

export const timeAgo = (ts: number) => {
  const m = Math.max(0, Math.floor((Date.now() - ts) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

export function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
