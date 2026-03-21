# V1 — Delivery, batch windows, locations & AI (Option A)

**Product:** B2B Delivery IQ (consolidated batching / milk-run logistics)  
**Audience:** Engineers implementing batch close, routing, partner assignment, and AI-assisted plan selection.  
**Related:** [USER-STORIES-DRIVER.md](./USER-STORIES-DRIVER.md), [USER-STORIES-RETAILER.md](./USER-STORIES-RETAILER.md), [USER-STORIES-DISTRIBUTOR.md](./USER-STORIES-DISTRIBUTOR.md)

---

## 1. Goals (v1)

| Goal | Detail |
|------|--------|
| **Batch windows** | Time-boxed collection of orders before orchestration runs. Window length **configurable via env** (default **30 minutes**). |
| **Rolling schedule** | When a window **closes** (timer or early close), the **next** window starts **30 minutes after** that close time (rolling, not clock-aligned to :00/:30). |
| **Early close** | Optional: close the batch **before** the timer if **total weight** of orders in the open batch **fits in one available vehicle** (capacity check). See §5. |
| **Orchestration** | On close: build **feasible** runs (deterministic solver / heuristics — **not** LLM routing). |
| **AI Option A** | After building **2 (or 3) feasible plan variants** with **numeric scores**, call the LLM to **choose one option** and return a **short justification**. Same pattern as NL ordering: structured JSON + validation; **fallback** to best score in code if AI fails. |
| **Locations** | **Static** list of sites with **fake coordinates around Ahmedabad** (demo). Distributor and retailer **select one site** each (dropdown); optional **snapshot** on order at checkout. |
| **Partner vehicles** | **Capacity (kg)** per delivery partner (profile); required for feasibility and early-close rules. |

---

## 2. Timezone

| Layer | Rule |
|-------|------|
| **Storage** | Store `opens_at` / `closes_at` (and similar instants) in **UTC** in the database. |
| **Display** | Show times to users in **IST** (`Asia/Kolkata`) — e.g. batch “closes at” for judges in local time. |
| **Config** | `APP_TIMEZONE=Asia/Kolkata` (or equivalent) for formatting and docs. |

---

## 3. Environment variables (examples)

| Variable | Purpose |
|----------|---------|
| `BATCH_WINDOW_MINUTES` | Default window length (e.g. `30`). |
| `APP_TIMEZONE` | Display / cron documentation (e.g. `Asia/Kolkata`). |
| `EARLY_CLOSE_ENABLED` | `true` / `false` — whether early close is evaluated. |

Add others as implementation stabilizes (e.g. minimum weight threshold if needed).

---

## 4. Batch lifecycle & states

```
open → closing → closed
```

| State | Meaning |
|-------|---------|
| **`open`** | Current window is accepting orders tied to this batch. |
| **`closed`** | Window ended; orchestration has run or was skipped. |

**Close triggers:**

1. **Timer** — `closes_at` reached.
2. **Early close** — policy satisfied (§5), e.g. total batch weight ≤ one vehicle capacity and partner available.

**After close:**

- **Has orders** → run pipeline: build candidate plans → score → **Option A** (AI) → persist **exactly one** run per batch (see §8).
- **No orders** → mark outcome **`no_run`** (or equivalent); **do not** call solver/AI for routing. **Start next window** 30 minutes after this close (rolling).

---

## 5. Early close (v1 policy)

**Intent:** Close the batch early when the **current open batch** can be served by **one vehicle** (single milk-run) and a partner exists.

**Suggested implementation checks (all must be agreed in code):**

- Sum **order line weights** (or order totals) for orders in **`open`** batch ≤ **`capacity_kg`** of the **selected** delivery partner vehicle (or default partner for demo).
- `EARLY_CLOSE_ENABLED=true`.
- Optional: minimum order count to avoid closing on noise (product decision).

**Note:** Exact SQL/service boundaries are implementation details; this doc defines **product rules** only.

---

## 6. Idempotency (batch close must not double-run)

If batch close is triggered twice (retry, cron overlap, deploy), **solver + AI must not create duplicate runs**.

**Recommended pattern:**

1. **Single row update** in a transaction:  
   `UPDATE batch SET status = 'closed', … WHERE id = ? AND status = 'open'`  
   If **0 rows** affected → another worker already closed → **exit** (no second run).
2. **Unique constraint** on `runs(batch_id)` (or enforce “one run per batch” in application layer) so duplicates fail safely.

No separate distributed lock table is required for MVP if the above is used correctly.

---

## 7. Static locations (Ahmedabad demo)

| Concept | Rule |
|---------|------|
| **Data** | Table e.g. `delivery_sites`: `id`, `label`, `latitude`, `longitude`, optional `city` / `area` (seed **Ahmedabad**-area fake coords). |
| **Retailer** | Profile field **`default_delivery_site_id`** (FK) — **dropdown** in settings / onboarding. |
| **Distributor** | Profile field **`depot_site_id`** (FK) — pickup / depot location (dropdown, may be subset “depot-only” rows). |
| **Order** | Optional **`delivery_site_id`** snapshot at **checkout** so historical orders keep the site used for routing. |

**Sign-up:** Collect **auth + role** only; **do not** block registration on location. **Gate** “place order” / “list catalog for routing” on **profile completion** if product requires it.

**Future:** Google Places / geocoding replaces static list; same FK shape.

---

## 8. Delivery partner — vehicle information

| Field | Purpose |
|-------|---------|
| **`capacity_kg`** | Feasibility: batch total weight must not exceed this for single-vehicle early close and run building. |
| **`label`** (optional) | UI only — e.g. “Van”, “Truck”. |
| **Link** | One row per partner user (e.g. `partner_profile` / `vehicles` where `user_id` = delivery partner). |

**Where to set:** Profile route aligned with [USER-STORIES-DRIVER.md](./USER-STORIES-DRIVER.md) (e.g. `/driver/vehicle`). For hackathon, **seed default capacity** for demo users if needed.

---

## 9. AI Option A (constrained decision)

**Not** for computing routes from natural language.

**Flow:**

1. Backend builds **2 (or 3) fully feasible** plans (same constraints: capacity, pickups-then-drops v0, etc.).
2. Each plan has an **`id`** (e.g. `A`, `B`) and **scores** computed in code: e.g. total km, utilization %, deadhead km (whatever v1 implements).
3. LLM receives **only** this structured payload; response schema e.g. `{ "choiceId": "A"|"B", "reason": "string" }` with **Zod** (or equivalent) validation.
4. **Apply** the chosen plan; if parse/API fails → **fallback** to **lowest score** in code.
5. **Reuse** same `OPENAI_API_KEY` / `OPENAI_MODEL` as NL services.

**UI:** Distributor or internal dashboard may show “Recommended plan: B” + reason; driver always sees **final persisted** manifest from API.

---

## 10. Where we collect data (signup vs profile)

| Data | When |
|------|------|
| Email, password, role | **Sign-up** |
| Retailer default delivery site | **Profile** / first-time wizard |
| Distributor depot site | **Profile** |
| Partner vehicle capacity | **Partner profile** (`/driver/vehicle` or equivalent) |
| Delivery site on order | **Checkout snapshot** (recommended for audit) |

---

## 11. MVP out of scope

- Live GPS tracking, turn-by-turn navigation  
- Payouts / earnings  
- Google geocoding (use static list for v1)  
- LLM-generated routes without feasibility checks  

---

## 12. Implementation checklist (for PRs)

- [ ] `delivery_sites` seeded (Ahmedabad area)  
- [ ] Retailer + distributor profile FKs to sites  
- [ ] Partner `capacity_kg` (profile + seed)  
- [ ] `batch` table with UTC instants + status + idempotent close  
- [ ] Rolling next window (+30 min from close)  
- [ ] Early close evaluation (env-gated)  
- [ ] Two feasible plans + scores + Option A service + fallback  
- [ ] `runs` unique per `batch_id`  
- [ ] Empty batch → `no_run`, skip solver/AI  
- [ ] API + UI: countdown from server `closes_at`, display IST  

---

## 13. Changelog

| Date | Change |
|------|--------|
| *(initial)* | Spec consolidated from team decisions: IST display, env batch length, rolling 30 min, early close by vehicle capacity, static Ahmedabad sites, Option A on every close, idempotency, profile-based location/vehicle. |
