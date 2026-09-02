# SukiBook — Deployment Runbook (Vercel + Supabase)

Take this Sari-Sari Store Manager from localhost to a live product:

> **Vercel** (web dashboard) · **Supabase** (auth + PostgreSQL + storage)
> One frontend build. No custom backend to operate. Offline-first everywhere.
>
> 🚦 The app also ships an interactive version of this checklist — open the
> **Go Live** tab (owner-only) in the dashboard.

The build runs in two modes, decided at build time by env vars:

| Mode | When | Behaviour |
| --- | --- | --- |
| **Demo** | no Supabase env vars | seeded on-device data — public demo |
| **Live** | `VITE_SUPABASE_*` set | magic-link login, per-store cloud sync, RLS-secured |

---

## 1 · Local

```bash
git clone https://github.com/<you>/sukibook.git && cd sukitab
npm install
npm run dev        # http://localhost:5173 (demo mode)
npm run build      # production build → dist/
```

## 2 · Supabase (~15 min)

1. https://supabase.com → **New project** → region **Singapore**.
2. **SQL Editor** → paste the whole [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
   Creates `sb_products`, `sb_customers`, `sb_sales`, `sb_movements`, `sb_settings`,
   the atomic `sb_push_store()` RPC, and the `product-photos` bucket — all behind
   **row-level security** scoped to `auth.uid()`.
3. **Authentication → Providers → Email** → enable **Magic Link**.
4. **Project Settings → API** → copy `Project URL` and `anon public key`.

> The anon key is safe in the browser — RLS does the locking. Never use `service_role` here.

## 3 · Connect the app

`.env.local` (and later Vercel):

```ini
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
```

Restart `npm run dev` → login gate appears. First login seeds the cloud store
with the starter catalog; every mutation debounces ~1.5 s and pushes.

## 4 · Vercel (~10 min)

1. Push repo to GitHub → https://vercel.com → **Add New Project** → import.
   Vite preset, output `dist` (defaults fine).
2. Add the two `VITE_SUPABASE_*` env vars → **Deploy**.
3. Supabase → **Authentication → URL Configuration** → Site URL = your Vercel domain.
4. **Domains** → add yours; SSL is automatic.

Every push to `main` redeploys in ~1 minute; instant rollback from the dashboard.

## 5 · How sync & security work

- **Offline-first:** the app always reads/writes a local snapshot; cloud sync is
  background. Sales keep working with no signal.
- **Push:** mutations debounce 1.5 s, then `sb_push_store()` replaces the store's
  collections in **one Postgres transaction** (idempotent, conflict-safe).
- **Security:** magic-link auth + RLS on every table + per-store `store_id`.
  Security headers (CSP, X-Frame-Options, HSTS) come from `vercel.json`.
- **Roles** (spec §10): owner/helper/accountant in-app today; server-side via a
  `store_members` table + RLS in Phase 2.

## 6 · Go-live checklist & targets

1. Sign up with a real email → record 5 sales → refresh → second browser. ✅
2. **Targets:** web load < 2 s · sync errors < 1 % · weekly usage ≥ 60 % · 75 % 3-month retention.
3. **Rollback:** Vercel instant rollback (30 s) · nightly `pg_dump` (Free) or PITR (Pro).

## 7 · Phase-2 add-ons

When server-side secrets are needed, use **Supabase Edge Functions** (no server to run):

- **Google Sheets mirror** — hourly function writes product/sales tabs.

## 8 · Monthly cost

| Item | Cost |
| --- | --- |
| Vercel (web) | Free – ₱500 |
| Supabase (auth + Postgres + storage) | Free – ₱1,400 (Pro) |
| Domain & SSL | ₱100 |
| **Total** | **₱100 – ₱2,000** |

## 9 · Commands

```bash
npm run dev        # local development
npm run build      # production build → dist/
npm run preview    # preview the production build
npm run typecheck  # TypeScript check
```

**Done.** Mag-login, mag-benta, naka-sync. 🎉
