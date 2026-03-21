# User Stories — Delivery Partner (Driver)

**Product:** B2B Delivery IQ (consolidated batching / milk-run logistics)  
**Persona:** Delivery partner / driver (vehicle operator executing optimized runs)  
**Auth:** Login and sign-up are **out of scope** for this document — handled as a **separate task**. Stories assume the user reaches driver routes via future auth or demo routing.

---

## 1. Persona summary

| Field | Detail |
|--------|--------|
| **Goal** | Execute **one milk-run** per batch with a **clear stop order**, **approximate times**, and **load vs capacity** visible — fewer empty miles, higher trust in the plan. |
| **Primary jobs** | Register/maintain **vehicle capacity**; open **assigned runs**; follow **sequenced manifest** (pickups → drops in v0); update **run/stop progress** minimally. |
| **Success** | Partner always knows **where to go first** (algorithm-decided), **why order is not FIFO** (batched optimization), and **ETA** per stop (estimated). |

---

## 2. How sequencing & time work (product rules for IQ)

These rules drive **acceptance criteria** for manifest and run detail.

| Rule | Description |
|------|-------------|
| **Batch snapshot** | When the batch window **closes**, all **pending** orders in that window form set **O**. Solver runs **once** on **O** — **not** first-ordered-first-routed in isolation. |
| **Sequencing strategy (v0)** | **All pickups first**, then **all drop-offs** (“collect-then-deliver”). Order within each phase by **geo-aware heuristic** (e.g. nearest-neighbor from start / last location). |
| **Capacity** | Total load on truck must never exceed partner **max weight** (server-enforced when building run). |
| **Approx time** | Per stop: **ETA** = cumulative **drive time** (distance / assumed avg speed) + **service minutes** at prior stops. **Not** live traffic — label as **estimate**. |
| **Start time** | Either **fixed** after batch close (e.g. “Run starts 11:00”) or **when partner taps Start run** — pick one and document in API. |

---

## 3. Pages (routes & responsibility)

| # | Route (example) | Page name | Purpose |
|---|-----------------|-----------|---------|
| 1 | `/driver` or `/partner` | **Dashboard (runs)** | List **my** runs: upcoming / active / completed; key stats: stop count, load kg, run id, status. |
| 2 | `/driver/runs/[runId]` | **Run detail & manifest** | **Ordered stops** (1..N), type **Pickup | Dropoff**, location label/address, items/weight summary, **ETA**, segment time optional; **load vs capacity**; actions: Start / Complete stop (optional) / Complete run. |
| 3 | `/driver/vehicle` | **Vehicle profile** | **Max capacity (kg)**; optional vehicle label (e.g. “Van”, “Truck”). |

**Shared layout:**

- Header: “Delivery” / partner name; nav: **Runs** (home), **Vehicle**.
- No login/sign-up UI in this scope.

---

## 4. User stories — functional

### Epic P1 — Vehicle profile

**P1.1 — View capacity**  
**As a** delivery partner, **I want** to see my **vehicle max weight capacity**, **so that** I trust assigned runs fit my truck.  
**AC:**

- Page displays **capacityKg** from server for current partner.
- If not set, show prompt to set before receiving runs (or use seeded demo default — document).

**P1.2 — Set / update capacity**  
**As a** delivery partner, **I want** to **save** my **maximum load (kg)**, **so that** the IQ engine only assigns **feasible** runs.  
**AC:**

- **capacityKg > 0** validated.
- Persisted; subsequent manifests respect limit **or** API returns error if assignment impossible (define behavior).

---

### Epic P2 — Runs list (dashboard)

**P2.1 — See assigned runs**  
**As a** delivery partner, **I want** a list of **runs assigned to me**, **so that** I know what to execute today.  
**AC:**

- Each row: **Run ID**, **Status** (`scheduled` | `in_transit` | `completed` — or team subset), **Stop count**, **Total load (kg)**, **Batch/window label** (optional).
- Only runs for **this** partner id.

**P2.2 — Open run**  
**As a** delivery partner, **I want** to **click** a run to open details, **so that** I can see the full manifest.  
**AC:**

- Navigates to `/driver/runs/[runId]` with correct data loaded.

**P2.3 — Distinguish active run**  
**As a** delivery partner, **I want** **in_transit** runs **highlighted**, **so that** I resume the right job.  
**AC:**

- Visual emphasis (badge or section) for active run if any.

---

### Epic P3 — Run detail, sequence, and smart manifest

**P3.1 — Ordered stop list (where to go first)**  
**As a** delivery partner, **I want** stops in **exact sequence 1..N** with **pickup before dropoff** (v0), **so that** I follow the **optimized** route, not order placement time.  
**AC:**

- Stops sorted by server-provided **`sequence`** (integer).
- Each stop shows: **sequence**, **type** (Pickup/Dropoff), **party name** (distributor or retailer), **address** or coordinates label.
- **Banner** text acceptable: “Stops optimized for this batch — not first-come-first-served.”

**P3.2 — Manifest payload per stop**  
**As a** delivery partner, **I want** **what to load or unload** at each stop, **so that** I execute without calling each client separately.  
**AC:**

- Line items or **aggregated weight/SKU description** per stop (minimum: **total kg** + short text).

**P3.3 — Approximate arrival time per stop**  
**As a** delivery partner, **I want** an **ETA** per stop (clock time), **so that** I can plan roughly.  
**AC:**

- Each stop shows **eta** (ISO or localized time) from server **or** client computed from leg metadata if API returns `segmentDurationMin`.
- Disclaimer visible: “Estimates; not live traffic.”

**P3.4 — Load vs capacity**  
**As a** delivery partner, **I want** to see **total run weight vs my vehicle capacity**, **so that** the “full truck” value is obvious.  
**AC:**

- Displays e.g. `780 / 1200 kg` or progress bar; matches server totals.

**P3.5 — Run summary for judges (optional)**  
**As a** delivery partner, **I want** one line summarizing **batch efficiency** (e.g. orders batched, stops count), **so that** optimization is visible.  
**AC:**

- Static + dynamic counts from API: e.g. “6 orders · 7 stops · 1 vehicle.”

---

### Epic P4 — Execution (status updates)

**P4.1 — Start run**  
**As a** delivery partner, **I want** to **start** a run, **so that** status becomes **in_transit** for stakeholders.  
**AC:**

- Button **Start run** only when status `scheduled` (or equivalent).
- Backend sets run + linked orders (optional) to appropriate state.

**P4.2 — Complete stop (optional — cut if time)**  
**As a** delivery partner, **I want** to **mark a stop complete**, **so that** progress is visible on the manifest.  
**AC:**

- Stop shows completed state; sequence cannot skip ahead if you enforce strict flow (team choice).

**P4.3 — Complete run**  
**As a** delivery partner, **I want** to **complete** the run, **so that** it closes and disappears from active.  
**AC:**

- Run status → `completed`; dashboard list updates.

**Hackathon shortcut:** If stop-level is too heavy, **only** P4.1 + P4.3 with **all stops informational** until final complete.

---

## 5. Technical tasks (checklist)

| Area | Task |
|------|------|
| **API** | `GET /partners/me` or embed in session: `capacityKg`. |
| **API** | `PATCH /partners/me/vehicle` — set capacity. |
| **API** | `GET /runs?partnerId=…` — list runs with summary fields. |
| **API** | `GET /runs/:id` — stops with **sequence**, **type**, **location**, **items/weight**, **eta**, **segment** optional. |
| **Orchestration** | On batch close: build run, assign **partner**, compute **stop order** (pickups-then-drops + heuristic), compute **ETAs** (haversine + avg speed + service time). |
| **Frontend** | Three pages: dashboard table/cards, run detail scrollable manifest, vehicle form. |

---

## 6. Definition of Done (driver scope)

- [ ] Vehicle page: view + set **capacityKg**.
- [ ] Dashboard: list assigned runs with status, load, stop count.
- [ ] Run detail: **sequenced** stops, pickup-then-drop (v0), manifest lines, **ETAs**, load/capacity display.
- [ ] **Start run** + **Complete run** (and optional **Complete stop**).
- [ ] No login/sign-up in this epic.

---

## 7. Out of scope (this document)

- Authentication and registration.
- Live GPS tracking map (optional polish).
- Turn-by-turn navigation integration.
- Proof-of-delivery photos, signatures, disputes.
- Earnings / payouts.

---

## 8. Dependencies

- **Batch orchestration** produces **Run** + **Stops** + assigns **partnerId**.
- **Distributor / Retailer** addresses (or lat/lng) must exist for routing and ETAs.
- **Order weights** must be computable from order lines for **feasible** run building.

---

*Last updated: sequencing v0 = pickups then drops + heuristic order; auth tracked separately.*
