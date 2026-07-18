# StockSense Backend

Node.js/Express REST API for StockSense — an ML-powered inventory management
system for Nigerian retail. Handles auth, inventory, suppliers, purchase
orders, sales history, and dashboard stats, and proxies prediction/training
requests to the Flask ML service.

For the full system (frontend, ML service, Docker setup), see the
[root README](../README.md).

---

## Tech Stack

- **Express** — REST API
- **PostgreSQL** (`pg`, hosted on Supabase in production) — with an
  in-memory fallback store for local dev without a database
- **JWT** — stateless auth via `Authorization: Bearer <token>`
- **Brevo** — transactional email (verification, password reset, daily alert digest)
- **Axios** — talks to the Flask ML service for predictions/training

## Project Structure

```
src/
 ├─ config/         # env var loading (src/config/index.js)
 ├─ controllers/     # route handlers
 ├─ db/
 │   ├─ index.js     # Postgres pool + in-memory fallback (memStore)
 │   └─ migrations/  # 6 SQL migrations, run automatically on startup
 ├─ docs/
 │   └─ openapi.yaml  # OpenAPI 3.0 spec, served at /api/docs
 ├─ middleware/
 │   ├─ auth.js       # JWT auth
 │   └─ cronAuth.js   # shared-secret auth for the alerts cron endpoint
 ├─ models/           # query layer per table
 ├─ routes/           # Express routers
 ├─ services/         # email.service.js (Brevo)
 └─ utils/            # inventory + alert helpers
app.js                # Express app setup, route mounting
```

## Environment Variables

Set these in `backend/.env`:

| Variable | Required | Notes |
|---|---|---|
| `PORT` | No (default `3001`) | |
| `JWT_SECRET` | Yes | Signs and verifies login tokens |
| `ML_URL` | Yes | Base URL of the Flask ML service |
| `CRON_SECRET` | Yes, for `/api/alerts/run` | Shared secret the GitHub Actions cron job sends in `X-Cron-Secret` |
| `DATABASE_URL` | No | If set, used as-is for the Postgres connection |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | No | Used instead of `DATABASE_URL` if that isn't set |
| `APP_URL` | No (default `http://localhost:5173`) | Used to build links inside verification/reset emails |
| `BREVO_API_KEY` | Yes, for email to actually send | Brevo transactional email API key |
| `SMTP_USER` | No | Used as the "from" address for outgoing email |
| `NODE_ENV` | No | `production` enables SSL for the Postgres connection |

If no database is reachable, the app logs a warning and runs on an
in-memory store instead — handy for local development, but data won't
persist across restarts.

## Running Locally

```bash
npm install
npm run dev     # nodemon, port 3001
# or
npm start
```

Migrations run automatically against Postgres on startup if a database is
reachable.

## API Documentation

Interactive docs (Swagger UI) are served at:

```

- Local: http://localhost:3001/api/docs
- Live: https://stock-sense-backend-vyg2.onrender.com/api/docs

```

They're generated from `src/docs/openapi.yaml`. Update that file whenever
routes, request bodies, or response shapes change — it's the source of
truth for the API surface.

### Route groups

All routes are mounted directly under `/api` — there's no `/auth` or `/ml`
sub-prefix.

| Prefix | Description |
|---|---|
| `/api/register`, `/api/login`, `/api/me`, `/api/verify-email`, `/api/resend-verification`, `/api/forgot-password`, `/api/reset-password` | Auth |
| `/api/inventory` | Inventory CRUD, restock |
| `/api/predict`, `/api/predict/simulate`, `/api/predict/:id` | ML predictions (proxied) |
| `/api/train`, `/api/metrics` | ML training + metrics (proxied) |
| `/api/stats` | Dashboard aggregates |
| `/api/suppliers` | Supplier CRUD |
| `/api/purchase-orders` | Purchase order CRUD, mark received |
| `/api/sales-history`, `/api/sales-history/summary` | Sales logging + summaries |
| `/api/alerts/run` | Daily alert digest — cron-secret protected, not for logged-in users |
| `/api/health` | Health check |

See `/api/docs` for full request/response schemas, or `src/docs/openapi.yaml`
directly.

## Auth

Protected routes expect:

```
Authorization: Bearer <token>
```

Tokens are issued by `/api/register` (indirectly, after email verification)
and `/api/login`, and are valid for 7 days. There's currently no
refresh-token or logout endpoint — a token is valid until it expires.

## Notes on What's Actually Wired Up

A few packages are listed in `package.json` but aren't used anywhere in
`src/` yet: `multer`, `csv-parser`, `nodemailer`, `resend`. Email actually
goes out through Brevo's HTTP API (`src/services/email.service.js`), not
Nodemailer or Resend. If you're planning CSV import or file-based bulk
upload, that still needs to be built — `POST /api/inventory` currently
accepts a JSON array for bulk creation, but not a file upload.
