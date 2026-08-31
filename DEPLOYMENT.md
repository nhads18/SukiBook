# SukiBook — Deployment Runbook (Vercel + Supabase)

Full instructions for taking this Sari-Sari Store Manager from localhost to a live,
multi-store product:

> **Vercel** (web dashboard) · **Supabase** (auth + PostgreSQL + storage + sync)
> One frontend build. No custom backend to operate. Offline-first on every device.

The app ships in two modes, decided at build time by environment variables:

| Mode | When | Behaviour |
| --- | --- | --- |
| **Demo** | no Supabase env vars | seeded on-device data (localStorage) — perfect for public demos |
| **Live** | `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` set | magic-link login, per-store cloud sync, RLS-secured data |

---

## 0 · Prerequisites

| What you need | Where | Notes |
| --- | --- | --- |
| Node.js 18+ and npm | https://nodejs.org | LTS recommended |
| Git + a GitHub repo | https://github.com | push this project there |
| Vercel account | https://vercel.com | Free Hobby tier is enough |
| Supabase project | https://supabase.com | Free tier: 500 MB DB, 50k MAU, 1 GB storage |
| A domain (optional) | any registrar, `.ph` works | SSL is automatic on Vercel |

---

## 1 · Run it locally

```bash
git clone https://github.com/<you>/sukibook.git
cd sukitab
npm install
npm run dev        # http://localhost:5173  (demo mode)
npm run build      # production build → dist/
npm run preview    # serve the built app locally
```

Copy `.env.example` to `.env.local` once you have Supabase keys (step 2) and
the same `npm run dev` becomes the live app with a login gate.

---

## 2 · Create the Supabase backend (~15 min)

### 2.1 New project

1. https://supabase.com → **New project** → name it (e.g. `sukibook`), pick a
   strong DB password, region **Singapore** (closest to PH users).

### 2.2 Run the schema

1. Dashboard → **SQL Editor** → **New query**.
2. Paste the entire contents of [`supabase/schema.sql`](supabase/schema.sql) → **Run**.

This creates five tables (`sb_products`, `sb_customers`, `sb_sales`,
`sb_movements`, `sb_settings`), the `product-photos` storage bucket, indexes,
and — critically — **Row Level Security policies**: every row is only visible
to the authenticated user whose `auth.uid()` matches `store_id`. The anon key
you expose to the browser is therefore safe by design.

### 2.3 Enable magic-link login

1. **Authentication → Providers → Email** → ensure **Email** is enabled and
   **Magic Link** (one-time link) is on. Supabase sends the email for free.
2. (Optional) **Authentication → URL Configuration** → set Site URL to your
   Vercel domain once you have one, so magic links land back on the app.

### 2.4 Copy the keys

**Project Settings → API** → you need:

- `Project URL` → `VITE_SUPABASE_URL`
- `anon public` key → `VITE_SUPABASE_ANON_KEY` (safe for the browser — RLS does the locking)

> Never use the `service_role` key in this repo. Nothing here needs it.

---

## 3 · Connect the app

Add to `.env.local` (local) — same keys go to Vercel in step 4:

```ini
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
```

Restart `npm run dev`. You'll now see the **login gate** instead of the demo:

1. Enter any email → receive a magic link → click it.
2. First login: the seeded starter catalog is **pushed up** as your store's
   initial cloud data.
3. Every later login: the store is **pulled** from Postgres and hydrated.
4. Every mutation (sale, stock, utang, settings) is **debounced ~1.5 s and
   pushed** — offline-first: if the network drops, the change stays on-device
   and syncs on the next action (last-write-wins, per the spec).

---

## 4 · Deploy to Vercel (~10 min)

1. Push the repo to GitHub.
2. https://vercel.com → **Add New Project** → import the repo.
   - Framework preset: **Vite** (auto-detected)
   - Build command: `npm run build` · Output: `dist` (defaults are fine)
3. **Environment Variables** → add `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` → **Deploy**.
4. Back in Supabase → **Authentication → URL Configuration** → set the Site
   URL to `https://your-app.vercel.app`.
5. **Domains** (Vercel project settings) → add `sukibook.ph` (or yours):
   - Vercel gives you an `A`/`CNAME` value → add it at your registrar.
   - SSL issues automatically; force-HTTPS is on by default.

Every `git push` to `main` now rebuilds and deploys in ~1 minute, with
instant rollback from the Vercel dashboard if anything goes wrong.

---

## 5 · How sync & security actually work

- **Offline-first:** the app always reads/writes a local DB (localStorage on
  web; the Android app uses SQLite). Cloud sync is a background concern —
  sales keep working on dead-signal barangays.
- **Push:** on each mutation, dirty state is debounced 1.5 s, then the store's
  collections are replaced in Postgres (`delete where store_id → insert`).
  Simple, correct at sari-sari scale, idempotent on retry.
- **Pull:** on every authenticated load — the freshest cloud copy hydrates the
  local DB. Conflict rule = last write wins (spec §6), timestamps on rows.
- **Security:** Supabase Auth (magic link) + RLS on every table + per-store
  `store_id`. Helper/accountant roles (spec §10) land in Phase 2 as extra RLS
  policies on a `store_members` table.
- **PWA:** the dashboard is installable (manifest + SVG app icon) and a small
  service worker caches the app shell, so previously-loaded reports stay
  readable with no signal — the web half of the spec's offline requirement
  (§9) without any extra infra. The worker caches same-origin assets **only**
  — no store data ever lands in the SW cache.

---

## 6 · Security audit & hardening (done, in code)

A full pass over client, schema and transport. What was found and fixed:

| # | Finding | Fix |
| --- | --- | --- |
| 1 | **Push race / data loss** — the client pushed 4 deletes + 4 inserts as separate requests; two devices syncing at once could interleave and drop rows | `sb_push_store()` RPC: one Postgres transaction; `store_id` stamped server-side from the JWT, so the client never sends ownership at all |
| 2 | **CSV formula injection** — product/customer names are user input and exports open in Excel/WPS, which execute cells starting `= + - @` | Every exported cell starting with a formula prefix is neutralized with a `'` prefix |
| 3 | **No security headers** | `vercel.json` ships CSP, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` (Vercel adds HSTS automatically) |
| 4 | **Schema abuse vectors** — unbounded strings, no storage UPDATE policy | Length caps on every text column, price/qty/balance ranges, `payment`/`type` enums, owner-only photo folder policies incl. replace |
| 5 | **Bundle exposure** | Supabase SDK is code-split — downloaded only in live cloud mode, never in demo builds |

Clean by inspection: no `dangerouslySetInnerHTML` / `innerHTML` / `eval`
anywhere (React escapes all rendering); no `service_role` key in the frontend;
magic-link `emailRedirectTo` is validated by Supabase against your redirect
allow-list.

### Owner checklist in the Supabase dashboard

1. **Authentication → URL Configuration:** Site URL = your Vercel domain and
   the Redirect URLs list contains *only* that domain (blocks open-redirect
   abuse of magic links).
2. **Providers:** Email only — leave social providers OFF.
3. The **anon key** is the only key in the frontend. `service_role` never
   leaves the dashboard / Edge Functions.
4. **RLS spot-check:** create a second account and confirm it cannot read
   your tables (`select * from sb_sales` returns 0 rows).
5. **Backups:** nightly `pg_dump` export (Free) or PITR (Pro) — and run one
   restore drill before launch.

### Accepted notes (documented, not bugs)

- Demo mode keeps data in browser `localStorage` — Settings shows a live
  advisory with the exact count of phone numbers on device.
- Supabase stores the session token in `localStorage` (standard for SPA
  auth); `httpOnly` cookies would require a custom backend — revisit with
  the Phase-2 API if you add accountant/helper web roles.

---

## 7 · Go-live checklist & targets

1. Sign up with a real email, record 5 sales, refresh the page, open another
   browser — data is there. ✅ That's the whole acceptance test.
2. **Targets** (from the business plan): web load < 2 s, sync error rate < 1 %,
   weekly dashboard usage ≥ 60%, 75 % 3-month retention.
3. **Monitoring:** Supabase dashboard (DB size, API errors, auth events) +
   Vercel analytics (free) + Sentry free tier when you add the API layer.
4. **Rollback:** Vercel instant rollback (30 s) · Supabase point-in-time
   recovery on the Pro plan, or nightly `pg_dump` exports on Free.

---

## 8 · Phase-2 add-ons (after launch, not before)

The Express/Railway API from the original architecture becomes relevant when
you need server-side secrets:

- **Semaphore PH SMS** — serverless Edge Function on Supabase is enough:
  store `SEMAPHORE_API_KEY` as a function secret, call it from the utang
  reminder button.
- **Google Sheets mirror** — hourly Edge Function writes product/sales tabs.
- **Cloudinary product photos** — the `product-photos` bucket above can be
  swapped for Cloudinary when you want transforms/CDN.

---

## 9 · Monthly cost

| Item | Cost |
| --- | --- |
| Vercel (web hosting) | Free – ₱500 |
| Supabase (auth + Postgres + storage) | Free – ₱1,400 (Pro) |
| Semaphore SMS (Phase 2) | ₱1,000 – 2,000 |
| Domain & SSL | ₱100 |
| **Total (Phase 1)** | **₱100 – ₱2,000** |

→ At 100 stores selling ₱199–₱299/month, margins stay fat; you only graduate
to Supabase Pro when you pass ~500 MB of sales history.

---

## 10 · Mobile app stores

**Deferred until after web launch.** When ready, wrap the React codebase with
React Native + Expo EAS (one codebase → Play `.aab` + App Store `.ipa`); see
the product roadmap. Web + PWA covers the field until then.

---

## 11 · Quick command reference

```bash
npm run dev        # local development
npm run build      # production build → dist/
npm run preview    # preview the production build
npm run typecheck  # TypeScript check
```

**Done.** Mag-login, mag-benta, naka-sync. 🎉
