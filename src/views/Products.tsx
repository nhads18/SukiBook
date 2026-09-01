import { useEffect, useMemo, useRef, useState } from "react";
import { catMeta, downloadCSV, peso, productAgg, type Cat } from "../lib/data";
import { useStore } from "../lib/store";
import { Field, Modal, Reveal } from "../components/ui";
import { CategoryGlyph, IconDown, IconDownload, IconPlus, IconSearch, IconUp } from "../components/Icons";

type SortKey = "name" | "price" | "cost" | "margin" | "stock" | "sold";

function EditableNum({
  value,
  onCommit,
  integer = false,
  className = "",
}: {
  value: number;
  onCommit: (n: number) => void;
  integer?: boolean;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const commit = () => {
    const n = integer ? parseInt(draft, 10) : parseFloat(draft);
    if (!Number.isNaN(n) && n >= 0) onCommit(n);
    setEditing(false);
  };
  if (editing)
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        className="field w-20 px-2 py-1 text-right font-mono text-sm"
        type="number"
        step={integer ? 1 : 0.25}
      />
    );
  return (
    <button
      onClick={() => {
        setDraft(String(value));
        setEditing(true);
      }}
      title="Click to edit"
      className={`tnum rounded border border-dashed border-transparent px-1.5 py-0.5 text-right font-mono text-sm font-semibold transition hover:border-mango hover:bg-mango-soft ${className}`}
    >
      {integer ? value : peso(value)}
    </button>
  );
}

export default function ProductsView() {
  const { db, t, updateProduct, addProduct, addStock } = useStore();
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<"all" | Cat>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [dir, setDir] = useState<1 | -1>(1);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: "", cat: "noodles" as Cat, price: "", cost: "", stock: "" });
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onFocus = () => searchRef.current?.focus();
    window.addEventListener("sukibook-focus-search", onFocus);
    return () => window.removeEventListener("sukibook-focus-search", onFocus);
  }, []);

  const agg = useMemo(() => productAgg(db, 7), [db]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = db.products
      .filter((p) => cat === "all" || p.cat === cat)
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .map((p) => ({ ...p, sold: agg.get(p.id)?.units ?? 0, margin: p.price > 0 ? ((p.price - p.cost) / p.price) * 100 : 0 }));
    list.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      const c = typeof va === "string" ? String(va).localeCompare(String(vb)) : (va as number) - (vb as number);
      return c * dir;
    });
    return list;
  }, [db.products, agg, query, cat, sortKey, dir]);

  const th = (key: SortKey, label: string, right = false) => (
    <th className={`px-3 py-2.5 ${right ? "text-right" : "text-left"}`}>
      <button
        onClick={() => {
          if (sortKey === key) setDir((d) => (d === 1 ? -1 : 1));
          else {
            setSortKey(key);
            setDir(key === "name" ? 1 : -1);
          }
        }}
        className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider transition hover:text-pine ${
          sortKey === key ? "text-pine" : "text-ink-soft"
        }`}
      >
        {label}
        {sortKey === key && (dir === 1 ? <IconUp className="h-3 w-3" /> : <IconDown className="h-3 w-3" />)}
      </button>
    </th>
  );

  const exportCsv = () =>
    downloadCSV("sukibook-products.csv", [
      ["Name", "Category", "Price", "Cost", "Stock", "Sold (7d)", "Margin %"],
      ...rows.map((p) => [p.name, catMeta(p.cat).en, p.price, p.cost, p.stock, p.sold, p.margin.toFixed(1)]),
    ]);

  const submit = () => {
    const price = parseFloat(form.price);
    const cost = parseFloat(form.cost);
    const stock = parseInt(form.stock, 10);
    if (!form.name.trim() || Number.isNaN(price) || price <= 0) return;
    addProduct({
      name: form.name.trim(),
      cat: form.cat,
      price,
      cost: Number.isNaN(cost) ? price * 0.8 : cost,
      stock: Number.isNaN(stock) ? 0 : stock,
    });
    setForm({ name: "", cat: "noodles", price: "", cost: "", stock: "" });
    setModal(false);
  };

  return (
    <div className="space-y-4">
      <Reveal>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-56 flex-1">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <label htmlFor="product-search" className="sr-only">Search products</label>
            <input id="product-search" ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("searchPh")} className="field pl-9" />
          </div>
          <button
            onClick={exportCsv}
            className="btn-press inline-flex items-center gap-2 rounded-lg border border-line bg-card px-3.5 py-2 text-xs font-bold text-ink transition hover:border-pine hover:bg-pine-soft"
          >
            <IconDownload className="h-4 w-4" /> {t("exportCsv")}
          </button>
          <button
            onClick={() => setModal(true)}
            className="btn-press inline-flex items-center gap-2 rounded-lg bg-pine px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-mango shadow-md transition hover:bg-pine-deep"
          >
            <IconPlus className="h-4 w-4" /> {t("addProduct")}
          </button>
        </div>
      </Reveal>

      <Reveal delay={60}>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setCat("all")}
            className={`btn-press rounded-full px-3 py-1.5 text-[11px] font-bold transition ${cat === "all" ? "bg-pine text-mango" : "bg-card text-ink-soft hover:bg-pine-soft"}`}
          >
            All · {db.products.length}
          </button>
          {(["noodles", "coffee", "snacks", "drinks", "staples", "household", "personal"] as Cat[]).map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`btn-press rounded-full px-3 py-1.5 text-[11px] font-bold transition ${cat === c ? "bg-pine text-mango" : "bg-card text-ink-soft hover:bg-pine-soft"}`}
            >
              {catMeta(c).en} · {db.products.filter((p) => p.cat === c).length}
            </button>
          ))}
        </div>
      </Reveal>

      <Reveal delay={120}>
        {rows.length === 0 && (
          <div className="rise mb-4 rounded-card border border-dashed border-line bg-card px-6 py-12 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-pine-soft text-pine">
              <IconSearch className="h-6 w-6" />
            </span>
            <p className="mt-3 font-display text-lg font-extrabold">Walang tugmang produkto</p>
            <p className="mt-1 text-sm text-ink-soft">
              Nothing matches {query ? `"${query}"` : "these filters"} — try another spelling, or add it to the shelf.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              {query && (
                <button onClick={() => setQuery("")} className="btn-press rounded-lg border border-line bg-card px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-ink-soft transition hover:border-pine hover:text-pine">
                  Clear search
                </button>
              )}
              <button onClick={() => setModal(true)} className="btn-press rounded-lg bg-mango px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-pine-deep transition hover:bg-mango-deep">
                {t("addProduct")}
              </button>
            </div>
          </div>
        )}
        <div className={`overflow-x-auto rounded-xl border border-line bg-card shadow-sm ${rows.length === 0 ? "hidden" : ""}`}>
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-b border-line bg-paper/70">
              <tr>
                {th("name", "Product")}
                {th("price", "Price", true)}
                {th("cost", "Cost", true)}
                {th("margin", "Margin", true)}
                {th("stock", "Stock", true)}
                {th("sold", "Sold 7d", true)}
                <th className="px-3 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-ink-soft">Quick</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((p) => (
                <tr key={p.id} className={`group transition hover:bg-paper/70 ${p.stock < 5 ? "bg-cherry-soft/30" : ""}`}>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-paper" style={{ color: catMeta(p.cat).color }}>
                        <CategoryGlyph cat={p.cat} className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="font-semibold leading-tight">{p.name}</p>
                        <p className="text-[11px] text-ink-soft">{catMeta(p.cat).en}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <EditableNum value={p.price} onCommit={(n) => updateProduct(p.id, { price: n })} />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <EditableNum value={p.cost} onCommit={(n) => updateProduct(p.id, { cost: n })} className="text-ink-soft" />
                  </td>
                  <td className="tnum px-3 py-2.5 text-right font-mono text-xs font-semibold" style={{ color: p.margin > 25 ? "#2f8f5b" : p.margin > 12 ? "#d98a0b" : "#c9463d" }}>
                    {p.margin.toFixed(0)}%
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="inline-flex items-center gap-2">
                      {p.stock < 5 && (
                        <span className="rounded bg-cherry px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-cherry-soft">
                          {p.stock === 0 ? "Out" : "Low"}
                        </span>
                      )}
                      <EditableNum integer value={p.stock} onCommit={(n) => updateProduct(p.id, { stock: Math.round(n) })} className={p.stock < 5 ? "font-bold text-cherry" : ""} />
                    </div>
                  </td>
                  <td className="tnum px-3 py-2.5 text-right font-mono text-xs text-ink-soft">{p.sold}</td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      onClick={() => addStock(p.id, 12)}
                      className="btn-press rounded-md bg-pine-soft px-2.5 py-1 text-[11px] font-bold text-pine transition hover:bg-mango hover:text-pine-deep md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
                    >
                      +12 stock
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-line px-4 py-2.5 text-[11px] text-ink-soft">
            Tip: click any <span className="font-mono font-semibold">price, cost or stock</span> cell to edit it in place — spreadsheet style.
          </p>
        </div>
      </Reveal>

      <Modal open={modal} onClose={() => setModal(false)} title={t("addProduct")}>
        <div className="space-y-3.5">
          <Field label="Product name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Fita Choco Mallow" />
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-ink-soft">Category</span>
            <select value={form.cat} onChange={(e) => setForm({ ...form, cat: e.target.value as Cat })} className="field">
              {(["noodles", "coffee", "snacks", "drinks", "staples", "household", "personal"] as Cat[]).map((c) => (
                <option key={c} value={c}>{catMeta(c).en}</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Selling ₱" type="number" inputMode="decimal" step="0.25" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="12" />
            <Field label="Cost ₱" type="number" inputMode="decimal" step="0.25" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="9.5" />
            <Field label="Stock" type="number" inputMode="numeric" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="24" />
          </div>
          <button
            onClick={submit}
            disabled={!form.name.trim() || !(parseFloat(form.price) > 0)}
            className="btn-press w-full rounded-lg bg-mango py-2.5 font-display text-sm font-extrabold uppercase tracking-wide text-pine-deep transition enabled:hover:bg-mango-deep disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save product
          </button>
        </div>
      </Modal>
    </div>
  );
}
