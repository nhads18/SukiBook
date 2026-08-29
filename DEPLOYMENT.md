# SukiBook — Deployment Runbook

Full instructions for taking this Sari-Sari Store Manager from localhost to production,
following the architecture in the requirements doc:

> **Vercel** (web frontend) · **Railway / Render** (Node.js + Express API) · **PostgreSQL**
> · **Google Sheets** sync · **Semaphore PH** SMS · **Cloudinary / Google Drive** files · **Supabase** auth

---

## 0 · Prerequisites

| What you need | Where | Notes |
| --- | --- | --- |
| Node.js 18+ and npm | https://nodejs.org | LTS recommended |
| Git + a GitHub repo | https://github.com | Push this project there |
| Vercel account | https://vercel.com | Free Hobby tier is enough to start |
| Railway **or** Render account | https://railway.app / https://render.com | Free tier for the API |
| PostgreSQL | Railway plugin, Render, or Neon | Any Postgres 14+ works |
| Supabase project (auth) | https://supabase.com | Phone-number login enabled |
| Google Cloud service account | https://console.cloud.google.com | For Sheets + Drive sync |
| Semaphore PH account (SMS) | https://semaphore.co | Load ₱1,000 credits to start |
| Cloudinary account (photos) | https://cloudinary.com | Free tier: 25 GB |
| A domain | Any registrar (e.g. `.ph`) | SSL is automatic on Vercel |

---

## 1 · Run it locally

```bash
git clone https://github.com/<you>/sukibook.git
cd sukitab
npm install

# Web dashboard (this repo)
npm run dev            # http://localhost:5173

# Type-check and production build
npm run typecheck
npm run build          # output → dist/
npm run preview        # serve the built app locally
```

The dashboard is a static Vite + React SPA. In production it talks to the Express API
via `VITE_API_URL` and to Supabase Auth via `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.

### 1.1 Frontend environment (`.env.production`)

```ini
VITE_API_URL=https://api.sukibook.ph
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-public-key>
VITE_SHEETS_VIEW_URL=https://docs.google.com/spreadsheets/d/<sheet-id>   # public "view" link for owners
VITE_LOW_STOCK_THRESHOLD=5
```

---

## 2 · Set up the database (PostgreSQL)

Create the database (Railway: **New → Database → PostgreSQL**; Neon: new project), then run:

```sql
create table products (
  id text primary key, name text not null, cat text not null,
  price numeric(10,2) not null, cost numeric(10,2) not null,
  stock int not null default 0, updated_at timestamptz default now()
);

create table customers (
  id text primary key, name text not null, phone text,
  balance numeric(10,2) not null default 0, updated_at timestamptz default now()
);

create table utang_entries (
  id text primary key, customer_id text references customers(id),
  type text check (type in ('utang','payment')), amount numeric(10,2) not null,
  note text, ts timestamptz default now()
);

create table sales (
  id text primary key, payment text check (payment in ('cash','gcash','utang')),
  customer_id text references customers(id), total numeric(10,2) not null, ts timestamptz default now()
);

create table sale_items (
  id text primary key, sale_id text references sales(id),
  product_id text references products(id), name text, qty int, price numeric(10,2), cost numeric(10,2)
);

create table stock_movements (
  id text primary key, product_id text references products(id), name text,
  type text check (type in ('sale','restock')), qty int not null, ts timestamptz default now()
);

create table users (
  id text primary key, phone text unique, name text,
  role text check (role in ('owner','helper','accountant')) default 'owner'
);

create table activity_log (
  id bigserial primary key, user_id text, action text, detail text, ts timestamptz default now()
);

create index on sales (ts);
create index on sale_items (sale_id);
create index on stock_movements (product_id, ts);
create index on utang_entries (customer_id, ts);
create index on products (name);
```

Save the connection string — you'll need it as `DATABASE_URL` in step 3.

---

## 3 · Deploy the backend API (Railway — recommended)

The Express server lives in a sibling repo (`sukibook-api`).

1. Push `sukibook-api` to GitHub.
2. Railway → **New Project → Deploy from GitHub repo**.
3. **Add plugin → PostgreSQL** (or point `DATABASE_URL` at your own Postgres).
4. Set environment variables:

```ini
PORT=8080
DATABASE_URL=postgres://user:pass@host:5432/sukibook
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>        # server-side only, never ship to the client
SEMAPHORE_API_KEY=<your-key>
SEMAPHORE_SENDER=SukiBook
GOOGLE_SHEETS_ID=<sheet-id>
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account", ...}
CLOUDINARY_CLOUD_NAME=<name>
CLOUDINARY_API_KEY=<key>
CLOUDINARY_API_SECRET=<secret>
DRIVE_BACKUP_FOLDER_ID=<folder-id>
SYNC_SHEETS_EVERY_MS=3600000                        # hourly Sheets sync
SESSION_TIMEOUT_MIN=30
CORS_ORIGIN=https://sukibook.ph
```

5. Railway auto-detects the start command (`npm start`). Add a healthcheck at `GET /health`.
6. Note your public URL, e.g. `https://sukibook-api.up.railway.app`.

**Render alternative:** New → Web Service → pick the repo → Build `npm install && npm run build`
→ Start `node dist/server.js` → add the same env vars → add healthcheck path `/health`.

### 3.1 Hourly Google Sheets sync

The API ships with a scheduler (node-cron) that writes `products`, `sales`, and `utang`
tabs to the shared Google Sheet every `SYNC_SHEETS_EVERY_MS`. Share the sheet with the
service-account email (`...@...gserviceaccount.com`) as **Editor**.

---

## 4 · Deploy the web dashboard (Vercel)

1. Vercel → **Add New → Project → Import** the GitHub repo of this app.
2. Framework preset: **Vite** (auto-detected). Build command `npm run build`, output `dist`.
3. Add the environment variables from **§1.1**.
4. Click **Deploy**. Every push to `main` now auto-deploys; pull requests get preview URLs.
5. **Domain:** Project → Settings → Domains → add `sukibook.ph` → point your registrar's
   `A`/`CNAME` records to Vercel. HTTPS/SSL certificates are issued automatically.

The dashboard is also a **PWA** (`vite-plugin-pwa`): once installed to the home screen it
serves cached reports while offline and re-syncs on reconnect.

---

## 5 · Mobile app (React Native, Phase note)

The Android app shares 60–70% of this codebase's data layer. Its deploy path:

1. Expo project pointing at the same `VITE_API_URL` + Supabase keys.
2. Offline writes go to SQLite → a sync queue POSTs to the API when connectivity returns
   (conflict rule: **last write wins** with server timestamps; version history kept).
3. Test on ₱3,000–₱5,000 Android devices and throttled 3G before release.
4. Internal track on Google Play → production release.

---

## 6 · Integrations

### 6.1 SMS — Semaphore PH

1. Register at semaphore.co → API → create key → note the key.
2. Load credits (₱1,000 ≈ 6,250 messages).
3. Put `SEMAPHORE_API_KEY` in the API env. Test:
   `POST /api/sms/test` from the dashboard's Settings → Team/SMS section.
4. Reminders are **queued on mobile when offline** and sent on next sync.
5. Fallback provider: Globe Labs (same message interface).

### 6.2 Photos & backups

- Product photos → Cloudinary (signed uploads from the mobile/web clients).
- Nightly `pg_dump` → encrypted upload to the Google Drive folder in `DRIVE_BACKUP_FOLDER_ID`
  (cron on Railway or a GitHub Action). Keep 30 days of backups.

### 6.3 Auth — Supabase

- Enable **Phone** provider; users sign in with OTP (no passwords to forget).
- Web session timeout: 30 minutes (matches `SESSION_TIMEOUT_MIN`).
- Roles: `owner` (everything), `helper` (sales + stock, no profits), `accountant` (read-only reports).

---

## 7 · Security & hardening checklist

- [ ] HTTPS everywhere (automatic on Vercel; Railway/Render provide TLS)
- [ ] `SUPABASE_SERVICE_ROLE_KEY`, `SEMAPHORE_API_KEY`, DB credentials **only** in server env
- [ ] Rate limiting on `/api/*` (e.g. `express-rate-limit`, 100 req/15 min/IP)
- [ ] Input validation on every write endpoint
- [ ] Row-level security on Supabase tables per role
- [ ] Activity log on all mutations (who, what, when)
- [ ] Remote-logout endpoint for lost phones
- [ ] Nightly encrypted backups verified monthly (restore drill)

---

## 8 · Go-live & monitoring

1. **Pilot:** onboard 3 stores; watch the first week of real traffic.
2. **Targets:** web load < 2 s, mobile < 3 s, sync error rate < 1 %, weekly dashboard usage ≥ 60%.
3. **Monitoring:** Railway/Render metrics + a simple `/health` uptime ping (e.g. UptimeRobot),
   error logging (Sentry free tier), Sheets-sync failure alerts to the owner's phone.
4. **Rollback plan:** Vercel instant rollback to previous deployment; `pg_restore` from the
   latest nightly backup; keep the previous API image tagged for one release cycle.

---

## 9 · Monthly cost at 100 stores (from the business plan)

| Item | Cost (₱) |
| --- | --- |
| Vercel (web hosting) | 0 – 500 |
| Railway / Render (API) | 500 – 1,000 |
| PostgreSQL | 500 – 1,000 |
| Google Sheets API | 0 |
| Google Drive (10 GB/store backups) | 1,000 |
| Semaphore SMS | 1,000 – 2,000 |
| Domain & SSL | 100 |
| **Total** | **₱3,600 – ₱5,600** |

→ **₱36–₱56 per store/month** at 100 stores. Selling at ₱199–₱299/month leaves a healthy margin.

---

## 10 · Quick command reference

```bash
npm run dev        # local development (web)
npm run build      # production build → dist/
npm run preview    # preview the production build
npm run typecheck  # TypeScript check
```

**Done.** Mobile for action, web for insight — now live at your domain. 🎉
