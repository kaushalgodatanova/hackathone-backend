# User Stories — Retailer (End Customer)

**Product:** B2B Delivery IQ (consolidated batching / milk-run logistics)  
**Persona:** Retailer (small B2B shop placing wholesale orders)  
**Auth:** Login and sign-up are **out of scope** for this document — handled as a **separate task**. Common login will eventually redirect by role to `/retailer` (or equivalent). Stories assume the user is already routed to retailer routes (session, demo flag, or future auth).

---

## 1. Persona summary


| Field            | Detail                                                                                                                                             |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Goal**         | Order wholesale stock from known distributors at **lower delivery cost** by opting into **Smart Batch** (shared milk-run) instead of fragmented trips. |
| **Primary jobs** | Browse **shared/allowed catalog**, build a cart with **quantities**, place orders, track **pending → batched → in transit → delivered**, see **batch window** timing. |
| **Success**      | Clear **saved vs express** (if express exists in v2), honest **status** and **run/batch** visibility after close, no surprise stock (respect distributor qty). |


---

## 2. Pages (routes & responsibility)

All paths are **suggestions** — align with your Next.js App Router structure (e.g. `/retailer/...`).


| #   | Route (example)                        | Page name              | Purpose                                                                                                       |
| --- | -------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1   | `/retailer` or `/retailer/dashboard`    | **Dashboard**          | Quick stats: **pending** orders, **in batch window** countdown link, recent orders, optional “estimated savings” placeholder. |
| 2   | `/retailer/catalog`                    | **Catalog (browse)**   | List **available products** (from one or many distributors — define MVP); search/filter; show price, weight, stock, **add to cart**. |
| 3   | `/retailer/cart`                       | **Cart & checkout**    | Line items, qty edit, **delivery option** (see Epic R2), **delivery address** snapshot, **place order**.      |
| 4   | `/retailer/orders`                     | **My orders**          | Table of **my** orders: placed at, id, status, total, link to detail.                                       |
| 5   | `/retailer/orders/[orderId]`           | **Order detail**       | Lines, status timeline, **batch window** message while `pending_batch`, **run/batch id** when `batched`, optional **ETA** after run assigned. |


**Shared layout (all retailer pages):**

- Header: “Retailer” / shop name; **Navigation:** Dashboard · Catalog · Cart · Orders.
- Optional cart badge with item count.
- Max width ~`6xl`, responsive.
- No login/sign-up UI in this scope.

---

## 3. Product rules (retailer-visible)

| Rule                     | Description                                                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Smart Batch default**  | New orders enter **`pending_batch`** until the **current window closes**; then orchestration assigns **batch/run** and statuses update.       |
| **Not instant dispatch** | Retailer should see messaging: “Included in next batch — delivery grouped with nearby stops.”                                                |
| **Stock**                | Cannot order more than **distributor quantity on hand** (or backend rejects with clear error).                                             |
| **Weight**               | Cart/order **total weight** contributes to IQ; retailer may see **order weight** summary (optional, high value for demo).                     |


---

## 4. User stories — functional

Story format: **As a … I want … So that …**  
Each story includes **Acceptance criteria (AC)**.

### Epic R1 — Dashboard

**R1.1 — Overview**  
**As a** retailer, **I want** a dashboard showing **how many orders are open** and a **link or embed to the batch countdown**, **so that** I understand when the next consolidation happens.  
**AC:**

- Shows count of orders in **`pending_batch`** + **`batched`** + **`in_transit`** (define “open” in API; document).
- Countdown matches **same** `windowEndsAt` source as distributor/driver (server).

**R1.2 — Recent orders**  
**As a** retailer, **I want** a short list of **recent orders**, **so that** I can jump to status quickly.  
**AC:**

- At least **N** recent rows (e.g. 5) with id, status, placed time, total.

**R1.3 — Value hook (optional)**  
**As a** retailer, **I want** a **simple “Smart Batch” benefit** line (static + one dynamic number if API provides), **so that** judges see relevance.  
**AC:**

- e.g. “Batching with nearby shops reduces dedicated trip fees” + optional `estimatedSavings` from backend **or** hidden if null.

---

### Epic R2 — Catalog

**R2.1 — Browse products**  
**As a** retailer, **I want** to **browse** products I’m allowed to buy, **so that** I can fill my shop.  
**AC:**

- List shows name, price, **unit weight**, **in stock** flag or qty (policy: hide exact qty vs show “low” — pick one).
- MVP: **single distributor catalog** OR **multi-distributor** with distributor label on row — team decides; document in API.

**R2.2 — Search / filter**  
**As a** retailer, **I want** to **search** by product name or SKU, **so that** I find items quickly.  
**AC:**

- Client-side filter acceptable for small catalogs.

**R2.3 — Add to cart**  
**As a** retailer, **I want** to **add** a product with quantity to cart, **so that** I can place a B2B order.  
**AC:**

- Quantity ≥ 1; respect **max** = available stock from API error if exceeded.

---

### Epic R3 — Cart & checkout

**R3.1 — View / edit cart**  
**As a** retailer, **I want** to see **line items** and change **quantities** or remove lines, **so that** my order is correct before submit.  
**AC:**

- Persist cart **per session** or **server cart** (`retailerId`) — pick one; survives navigation within demo.

**R3.2 — Delivery option (MVP)**  
**As a** retailer, **I want** to choose **Smart Batch** (default) **so that** I opt into consolidated logistics.  
**AC:**

- Single radio: **Smart Batch** checked by default; copy explains **delay until window closes**.
- *(Optional v1.1)* second option **Express / dedicated** with higher fee — only if backend supports; otherwise omit.

**R3.3 — Delivery address**  
**As a** retailer, **I want** to confirm **delivery address** (or shop location) on checkout, **so that** the batch includes correct **geo** for routing.  
**AC:**

- Address fields or **saved profile** id sent with order; lat/lng if geocoded on server.

**R3.4 — Place order**  
**As a** retailer, **I want** to **submit** the order, **so that** it enters **pending_batch**.  
**AC:**

- Success: redirect to order detail or orders list; status **`pending_batch`**.
- Failure: stock conflict or validation message.

**R3.5 — Order weight (optional)**  
**As a** retailer, **I want** to see **total order weight** on checkout, **so that** I understand capacity impact.  
**AC:**

- Sum of `qty × unitWeight` matches server calculation.

---

### Epic R4 — Orders list & detail

**R4.1 — List my orders**  
**As a** retailer, **I want** to see **only my orders**, **so that** privacy is preserved.  
**AC:**

- API scoped by `retailerId`; columns: placed at, id, status, total.

**R4.2 — Status clarity**  
**As a** retailer, **I want** **plain-language status** (`Pending in batch`, `Batched`, `Out for delivery`, `Delivered`), **so that** I’m not confused.  
**AC:**

- Map internal enums to labels in UI; tooltips optional.

**R4.3 — Pending batch experience**  
**As a** retailer, on order detail **while** `pending_batch`, **I want** to see **when the current window closes**, **so that** I know why delivery is not immediate.  
**AC:**

- Countdown or “Next batch closes at …” from server.

**R4.4 — After batch runs**  
**As a** retailer, **I want** to see **batch or run id** when status is `batched` or later, **so that** I can correlate with the milk-run story.  
**AC:**

- Field visible when non-null; copy: “Your order is on **Run #12**.”

**R4.5 — Delivery progress (optional)**  
**As a** retailer, **I want** an **approximate drop-off ETA** when the run is active, **so that** I can plan receiving.  
**AC:**

- Show ETA only if backend returns stop ETA for this retailer; else hide.

---

## 5. Technical tasks (checklist)


| Area        | Task                                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------ |
| **API**     | `GET /catalog` or `/products` — scoped to retailer access rules; include weight, price, stock.             |
| **API**     | `POST /cart` / `POST /orders` — create order lines; decrement or **reserve** stock per team policy.         |
| **API**     | `GET /orders?retailerId=…` — list; `GET /orders/:id` — detail + window + run fields.                         |
| **API**     | Expose `windowEndsAt` on order detail or shared `GET /batch/window`.                                         |
| **Frontend** | Catalog grid/table, cart page, checkout form, orders table, order detail with timeline.                      |
| **State**   | Cart: React context / Zustand / server session — document for pair dev.                                       |


---

## 6. Definition of Done (retailer scope)

- [ ] Dashboard: counts + countdown + recent orders.
- [ ] Catalog: browse, search, add to cart with stock validation.
- [ ] Cart & checkout: edit qty, address, **Smart Batch** messaging, place order → `pending_batch`.
- [ ] Orders list + detail: statuses, window copy while pending, **run/batch** when available.
- [ ] No login/sign-up in this epic.

---

## 7. Out of scope (this document)

- Login, sign-up, password reset.
- Payments / COD workflow logic (can stub “placed” only).
- Multi-branch retailer orgs, approval chains.
- Returns, partial fulfillment, chat with driver.
- Deep personalization / recommendations.

---

## 8. Dependencies

- **Distributor** catalog and **stock** must exist and stay consistent when orders are placed.
- **Orchestration** batch job sets **`batched`** + **`runId`** / **`batchId`** for retailer visibility.
- **Driver** run execution updates order status (`in_transit`, `delivered`) for end-to-end demo.
- Shared **batch window** contract across **Distributor**, **Retailer**, **Driver** UIs.

---

*Last updated: retailer = end user who orders; auth tracked separately.*
