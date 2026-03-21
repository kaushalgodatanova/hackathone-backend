# Testing guide & user journeys — B2B Delivery IQ

This document describes **end-to-end flows** for every role, **where AI is used**, how to **configure and test** the system, and how it ties to the backend spec ([V1-DELIVERY-BATCH-SPEC.md](./V1-DELIVERY-BATCH-SPEC.md)).

---

## 1. What you are testing

| Layer | Role |
|--------|------|
| **Retailer** | Buys from distributors (catalog, cart, checkout, orders). |
| **Distributor** | Manages product catalog/stock; sees retailer orders. |
| **Delivery partner** | Vehicle capacity; sees assigned runs and stop manifests. |

**Cross-cutting:** **batch windows** (time-boxed order collection), **static delivery sites** (Ahmedabad demo), **orchestration** (deterministic routing heuristics), **AI Option A** (LLM picks between two pre-scored plans — optional; falls back if AI is off or fails).

---

## 2. Prerequisites

| Requirement | Notes |
|-------------|--------|
| **Node.js** | LTS recommended (e.g. 20+). |
| **MySQL** | Accessible DB; `DATABASE_URL` in backend `.env`. |
| **npm** | Install dependencies in `hackathon-backend` and `hackhathon-frontend`. |
| **OpenAI (optional)** | For full NL ordering + AI plan choice. Set `OPENAI_API_KEY` on the **server** only. |

---

## 3. One-time backend setup

From `hackathon-backend/`:

1. **Copy env**  
   `cp .env.example .env`  
   Fill `DATABASE_URL`, `JWT_SECRET` (≥16 chars), `FRONTEND_URL` (e.g. `http://localhost:3000`).

2. **Run migrations**  
   `npm run migrate`  
   Applies Drizzle migrations (including batches, delivery sites, runs).

3. **Seed delivery sites** (Ahmedabad demo coordinates)  
   `npm run seed:delivery-sites`

4. **Optional — demo catalog for all distributors**  
   `npm run seed:mock-products`  
   Requires at least one distributor user in the DB (or register via UI first, then re-run).

5. **Optional — batch tuning for demos**  
   In `.env`:  
   - `BATCH_WINDOW_MINUTES=2` — short windows for demos.  
   - `ROLLING_GAP_MINUTES=1` — short gap before next window.  
   - `EARLY_CLOSE_ENABLED=true` — early close when load fits one vehicle (see spec).

6. **Optional — pin a delivery partner for runs**  
   Register a user with role `delivery_partner`, note their user `id`, set `DEFAULT_DELIVERY_PARTNER_ID=<id>` in `.env`.

7. **Start API**  
   `npm run dev`  
   Default: `http://localhost:8000`  
   Swagger: `http://localhost:8000/api/docs`

---

## 4. One-time frontend setup

From `hackhathon-frontend/`:

1. **Env**  
   Create `.env.local` (or `.env`):

   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

   Must match the backend origin (no trailing slash).

2. **Install & run**  
   `npm install`  
   `npm run dev`  
   App: `http://localhost:3000`

---

## 5. Where AI is used (and what works without it)

| Feature | Needs `OPENAI_API_KEY`? | Behavior without AI |
|---------|-------------------------|------------------------|
| **Retailer — NL cart preview** (`/retailer` NL panel, `POST /retailer/cart/nl-preview`) | Yes | Endpoint returns **503** with a clear message. |
| **Retailer — catalog chat** (`POST /retailer/catalog/chat`) | Yes | Same. |
| **Batch close — Option A (plan choice)** | Yes | Backend **scores two feasible plans in code**; if AI fails or is missing, **the lower-distance plan is chosen** automatically. |

**Important:**  
- AI does **not** invent routes from free text. Routes are built by **deterministic heuristics**; the LLM only **chooses between labeled options** (A/B) with a short reason when configured.  
- **Natural-language ordering** uses structured JSON from the model + Zod validation, same pattern as other NL flows.

---

## 6. User journeys (detailed)

### 6.1 Retailer

1. **Register** at `/register` with role **Retailer**.  
2. **Login** → redirected to retailer home (`/retailer`).  
3. **Delivery site (required for checkout)**  
   - Open **Cart** (`/cart`).  
   - Choose **Delivery location** from the dropdown (Ahmedabad demo sites).  
   - This saves `default_delivery_site_id` via `PATCH /me/profile`.  
4. **Shop**  
   - Select a distributor, add products to cart.  
5. **Optional — AI-assisted ordering** (if `OPENAI_API_KEY` is set)  
   - Use the NL panel on the catalog page to describe what you want; preview matches products to the catalog.  
6. **Checkout**  
   - From cart, **Place order**.  
   - Orders are tied to the **current open batch** and snapshot `delivery_site_id`.  
7. **Orders**  
   - `/retailer/orders` — history + **batch window countdown** (server `closesAt`).  

**Failure to test:** Checkout without a delivery site → API returns **400** with a message to set profile or pass `deliverySiteId`.

---

### 6.2 Distributor

1. **Register** at `/register` with role **Distributor**.  
2. **Login** → `/distributor` (or stock flows as implemented).  
3. **Depot site**  
   - On the distributor dashboard, set **Depot / pickup site** (saved via `PATCH /me/profile`).  
   - Used when **batch closes** to build pickup stops (with retailer orders in that batch).  
4. **Catalog**  
   - Manage products/stock (existing product flows).  
5. **Orders**  
   - See recent retailer orders; **batch countdown** reflects current open window.  

---

### 6.3 Delivery partner

1. **Register** at `/register` with role **Delivery partner**.  
2. **Login** → `/driver`.  
3. **Vehicle**  
   - `/driver/vehicle` — set **capacity (kg)** and optional label (required for realistic early-close and feasibility).  
4. **Runs**  
   - After a **batch closes** with orders and orchestration succeeds, a **run** appears for the default partner (or `DEFAULT_DELIVERY_PARTNER_ID`).  
   - Open a run → stop sequence (pickups/drops), optional **AI plan reason** if Option A ran.  

**If no runs:** No batch has closed with orders yet, or no partner resolved / capacity not set — see troubleshooting.

---

## 7. Batch / orchestration — what to observe

1. **Open batch** exists after API start (`ensureOpenBatchOnStartup`).  
2. **Timer close** — when `closes_at` passes, `tick()` closes the batch and may create a run + next window.  
3. **Early close** — if `EARLY_CLOSE_ENABLED=true` and total batch weight ≤ partner `capacity_kg`, batch may close before the timer.  
4. **Empty batch** — outcome `no_run`; next window still scheduled (rolling gap).  
5. **IST display** — `GET /batch/current` returns `closesAtDisplay` (for judges); storage is UTC.

---

## 8. Suggested testing checklist

| # | Step | Expected |
|---|------|----------|
| 1 | `GET /api/health` | `200` `{ message: "OK" }` |
| 2 | `GET /api/batch/current` | Open batch with `closesAt`, `closesAtDisplay` |
| 3 | `GET /api/delivery-sites` | List of demo sites |
| 4 | Register + login (smoke test) | JWT; `/me` returns user + profile fields |
| 5 | Retailer sets site on cart; checkout | `201`, orders have `batchId` |
| 6 | Distributor sets depot on dashboard | Profile updated |
| 7 | Partner sets capacity on `/driver/vehicle` | Profile updated |
| 8 | Wait for batch close OR shorten `BATCH_WINDOW_MINUTES` | New batch; run may appear for partner |
| 9 | With `OPENAI_API_KEY` | NL preview and catalog chat succeed |
| 10 | Without `OPENAI_API_KEY` | NL endpoints return 503; routing still uses heuristic fallback for plan choice |

---

## 9. Troubleshooting

| Symptom | Things to check |
|---------|------------------|
| Frontend “cannot reach API” | `NEXT_PUBLIC_API_URL` in frontend `.env.local`; backend running; CORS (`FRONTEND_URL` on server). |
| Checkout “delivery site” error | Retailer must pick a site on **Cart** (or set profile) before checkout. |
| No driver runs | Batch must **close** with orders; at least one **delivery_partner** with `partner_capacity_kg`; optional `DEFAULT_DELIVERY_PARTNER_ID`. |
| NL / chat 503 | Set `OPENAI_API_KEY` in **backend** `.env` and restart. |
| Countdown unchanged after editing `.env` | Restart API; **current** batch keeps old `closes_at` until it closes — shorten `BATCH_WINDOW_MINUTES` for **new** windows. |
| Migration errors | MySQL version, `DATABASE_URL`, run `npm run migrate` from `hackathon-backend`. |

---

## 10. API & docs

- **Interactive API:** `http://localhost:8000/api/docs` (Swagger UI).  
- **Health:** `GET /api/health`.  
- **Product specs:** [docs/README.md](./README.md) (links to V1 batch spec and user stories).

---

## 11. Related documents

| Doc | Purpose |
|-----|---------|
| [V1-DELIVERY-BATCH-SPEC.md](./V1-DELIVERY-BATCH-SPEC.md) | Batch rules, IST, early close, Option A, idempotency |
| [QUICK-START-BRIEF.md](./QUICK-START-BRIEF.md) | One-page briefing for demos |
| [USER-STORIES-*.md](./USER-STORIES-DISTRIBUTOR.md) | Role-specific stories |
</think>


<｜tool▁calls▁begin｜><｜tool▁call▁begin｜>
StrReplace