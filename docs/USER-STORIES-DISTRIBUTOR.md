# User Stories — Distributor

**Product:** B2B Delivery IQ (consolidated batching / milk-run logistics)  
**Persona:** Distributor (wholesale seller)  
**Auth:** Login and sign-up are **out of scope** for this document — handled as a **separate task**. Stories assume the user is already routed to distributor routes (e.g. via session, demo flag, or future auth).

---

## 1. Persona summary


| Field            | Detail                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Goal**         | Move stock efficiently; see orders batched into fewer, fuller pickups instead of chaotic one-off dispatches.              |
| **Primary jobs** | Maintain catalog (weight + quantity matter for IQ); monitor batch windows; see orders and pickup-oriented manifest slice. |
| **Success**      | Accurate stock; visible pending vs batched orders; clear view of “what to stage” for the next run.                        |


---

## 2. Pages (routes & responsibility)

All paths are **suggestions** — align with your Next.js App Router structure (e.g. `/distributor/...`).


| #   | Route (example)                                                   | Page name                 | Purpose                                                                                                       |
| --- | ----------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | `/distributor` or `/distributor/dashboard`                        | **Dashboard**             | At-a-glance: order counts, pending-in-window count, next batch countdown, recent orders.                      |
| 2   | `/distributor/stock`                                              | **Stock & items**         | CRUD (or create/edit/deactivate) catalog: name, SKU, weight, quantity on hand, price; search/filter.          |
| 3   | `/distributor/orders`                                             | **Orders & batch window** | Full order list with statuses; prominent **current batch window** timer; link or expand to batch/run context. |
| 4   | *(optional)* `/distributor/batches/[batchId]` or drawer on Orders | **Batch / pickup detail** | Aggregated pick list for **this distributor’s SKUs** for a given batch/run (quantities to stage).             |


**Shared layout (all distributor pages):**

- Header: app name / “Distributor”, user label (no auth UI in scope).
- **Navigation:** Dashboard · Stock · Orders.
- Max width ~`6xl`, responsive.

---

## 3. User stories — functional

Story format: **As a … I want … So that …**  
Each story includes **Acceptance criteria (AC)**.

### Epic D1 — Dashboard

**D1.1 — View key metrics**  
**As a** distributor, **I want** a dashboard with **current orders** count and **pending in batch** count, **so that** I can anticipate workload.  
**AC:**

- Displays **Total open orders** (or “today’s orders” — define one rule in implementation).
- Displays **Pending in batch** = orders in `pending_batch` (or equivalent) for this distributor.
- Numbers match API / DB for the logged-in distributor tenant.

**D1.2 — Next batch window visibility**  
**As a** distributor, **I want** to see **time until the current batch window closes**, **so that** I and stakeholders understand the intelligence window.  
**AC:**

- Shows countdown **MM:SS** (or **HH:MM:SS** if >1h) synced from **server** `windowEndsAt` (or poll endpoint).
- Shows label e.g. “Next batch closes in”.
- When window rolls, UI refreshes counts without full page reload (poll or revalidate).

**D1.3 — Recent activity**  
**As a** distributor, **I want** a **recent orders** list on the dashboard, **so that** I can spot anomalies quickly.  
**AC:**

- Table or list: Order ID, Retailer (name), Status, Placed at (time).
- Shows at least the **N** most recent (e.g. 10), configurable.

---

### Epic D2 — Stock & items (catalog)

**D2.1 — List products**  
**As a** distributor, **I want** to see all **my** products in a table, **so that** I can manage inventory.  
**AC:**

- Columns include: **Name**, **SKU**, **Weight** (per unit, e.g. kg), **Quantity on hand**, **Price** (optional if MVP tight).
- Only products belonging to this distributor.

**D2.2 — Add product**  
**As a** distributor, **I want** to **add** a new product with **weight** and **quantity**, **so that** batching can respect **capacity**.  
**AC:**

- Form validates required fields; **weight > 0**; **quantity ≥ 0**.
- Success: row appears in list; failure: inline error.

**D2.3 — Edit product**  
**As a** distributor, **I want** to **edit** stock quantity and price, **so that** retailers see accurate availability.  
**AC:**

- Updates persist; list reflects changes after save.

**D2.4 — Search / filter (optional)**  
**As a** distributor, **I want** to **search** products by name or SKU, **so that** I can find items fast.  
**AC:**

- Client-side filter acceptable for hackathon if catalog small.

**D2.5 — Deactivate or zero-out (optional)**  
**As a** distributor, **I want** to **stop selling** an item (out of stock / delisted), **so that** it cannot be ordered.  
**AC:**

- Item hidden from retailer catalog **or** shown unavailable — team picks one rule; documented in API.

---

### Epic D3 — Orders & batch context

**D3.1 — List orders**  
**As a** distributor, **I want** to see **all relevant orders** (line items include my SKUs), **so that** I can fulfill them.  
**AC:**

- Columns: Placed at, Order ID, Retailer, **items summary** (or count), **Status**.
- Statuses at minimum: `pending_batch`, `batched`, `in_transit`, `delivered` (subset OK if others deferred).

**D3.2 — Batch window on Orders page**  
**As a** distributor, **I want** the **same batch countdown** and **orders-in-window count** on the Orders page, **so that** I can correlate list with timing.  
**AC:**

- Countdown consistent with Dashboard (single source of truth from API).

**D3.3 — Post-batch visibility**  
**As a** distributor, when a batch **closes**, **I want** orders to show **batched** state and **batch/run identifier**, **so that** I can align with pickup.  
**AC:**

- After orchestration runs, affected orders show `batched` + `batchId` / `runId` (whatever your model uses).

---

### Epic D4 — Manifest slice (pick list)

**D4.1 — Distributor pick list for a batch/run**  
**As a** distributor, **I want** an aggregated list of **my SKUs and quantities** for a given **batch/run**, **so that** I can **stage goods** for one milk-run pickup.  
**AC:**

- Only SKUs **this distributor** supplies on that run.
- Shows **total weight** for distributor slice (optional but high value).
- Accessible from Orders (row expand, modal, or `/distributor/batches/[id]`).

---

## 4. Technical tasks (checklist)


| Area         | Task                                                                                                           |
| ------------ | -------------------------------------------------------------------------------------------------------------- |
| **API**      | CRUD products scoped by `distributorId`; list orders filtered by distributor participation.                    |
| **API**      | Expose batch window: `windowEndsAt`, `ordersInWindowCount` (or compute client from orders).                    |
| **API**      | After batch job: attach `batchId`/`runId` to orders; endpoint or field for **manifest slice** per distributor. |
| **Frontend** | Layout + nav for three pages; dashboard cards + recent table; stock table + modal; orders table + banner.      |
| **State**    | Poll window endpoint every 10–30s or server revalidation — document choice.                                    |


---

## 5. Definition of Done (distributor scope)

- Dashboard shows counts + countdown + recent orders.
- Stock page: list, add, edit (weight + qty mandatory for new items).
- Orders page: full list + batch banner + statuses post-batch.
- (Recommended) Manifest slice for at least one batch in demo path.
- No dependency on login/sign-up in this epic — entry via direct URL or dev-only gate is acceptable until auth task lands.

---

## 6. Out of scope (this document)

- Login, sign-up, password reset, SSO.
- Multi-user roles under one distributor org (e.g. warehouse clerk).
- Billing, invoicing, returns workflow.
- Deep analytics beyond dashboard cards.

---

## 7. Dependencies

- **Orchestration service:** batch close job assigns `batchId` / `runId` and statuses.
- **Retailer** placing orders creates **order lines** referencing distributor products (for filters to work).
- **Driver** app not required for distributor MVP except for realistic status updates from backend.

---

*Last updated: aligned with hackathon scope; auth tracked separately.*