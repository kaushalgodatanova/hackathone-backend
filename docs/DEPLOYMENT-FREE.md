# Free / low-cost deployment (easy path)

This app is **two services + MySQL**:

| Piece | What it is |
|-------|------------|
| **Frontend** | Next.js (`hackhathon-frontend`) — needs `NEXT_PUBLIC_API_URL` pointing at the API. |
| **Backend** | Node/Express (`hackathon-backend`) — needs `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, optional `OPENAI_API_KEY`. |
| **Database** | **MySQL** (Drizzle + `mysql2`). |

**“Free forever” is limited:** most hosts give **free tiers** with caps (sleeping apps, DB size, monthly credits). For a **hackathon demo**, that is usually enough.

---

## 1. Production configuration checklist

Set these on the **backend** host (not in the browser):

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | Yes | `mysql://...` from your host (often **SSL** required). |
| `JWT_SECRET` | Yes | Long random string (≥16 chars). **Never commit.** |
| `FRONTEND_URL` | Yes in prod | Your deployed Next app URL(s), e.g. `https://your-app.vercel.app`. **Comma-separated** is allowed for multiple origins (preview + production). |
| `NODE_ENV` | Yes | `production` (enables strict CORS to `FRONTEND_URL`). |
| `PORT` | Usually auto | Many platforms set `PORT`; keep default if the platform injects it. |
| `OPENAI_API_KEY` | No | Without it: NL cart/chat return **503**; batch routing still works with **fallback** plan choice. |
| `FRONTEND_URL` | Comma-separated OK | e.g. `https://app.vercel.app,https://preview-xxx.vercel.app` |

Set on the **frontend** build:

| Variable | Required |
|----------|----------|
| `NEXT_PUBLIC_API_URL` | **Public** URL of your API, e.g. `https://your-api.up.railway.app` (no trailing slash). |

**CORS:** Backend `FRONTEND_URL` must **exactly** match the site users open (scheme + host, no trailing slash mismatch).

---

## 2. Easiest “mostly free” stacks (pick one)

### Option A — **Vercel (frontend) + Railway (backend) + free MySQL (Aiven or Railway DB)**  

**MySQL hosting:** PlanetScale **no longer has a free tier for new users.** Use **[Aiven free MySQL](https://aiven.io/free-mysql-database)** or **Railway’s MySQL** — see **[DATABASE-FREE-STEPS.md](./DATABASE-FREE-STEPS.md)** for step-by-step.

1. Create MySQL and set `DATABASE_URL` (see doc above).

2. **Railway** ([railway.app](https://railway.app)) — new project → **Deploy from GitHub** → select `hackathon-backend`.  
   - Build: `npm install` → start: `npm run start` (after `npm run build`).  
   - Or use **Nixpacks** / Dockerfile with `node dist/index.js` if you build first.  
   - Add env vars (see checklist).  
   - Run migrations **once**: locally `DATABASE_URL=... npm run migrate` **or** a one-off Railway shell.

3. **Vercel** ([vercel.com](https://vercel.com)) — import `hackhathon-frontend`.  
   - Env: `NEXT_PUBLIC_API_URL=https://<your-railway-url>`.  
   - Deploy.

**Cost:** Aiven free tier (if available to your account) + Railway credits; see each provider’s current pricing page.

---

### Option B — **Everything on Railway**  
*One dashboard: web service + MySQL plugin.*

1. Create a **Railway** project.  
2. Add **MySQL** template (or plugin) → Railway gives you `DATABASE_URL`.  
3. Add **Node** service from `hackathon-backend` repo with env vars.  
4. Deploy **frontend** on Vercel (or second Railway service for Next.js) with `NEXT_PUBLIC_API_URL`.

---

### Option C — **Render**  
*Free web services **spin down** after idle (cold start ~30–60s).*

1. **Render** MySQL is often **paid** — use **Aiven** or **Railway MySQL** for the DB + Render **Web Service** for the API.  
2. Connect GitHub → Docker or Node build → set env.  
3. Frontend on Vercel as above.

---

### Option D — **Oracle Cloud “Always Free”** (advanced)  
*Truly long-term free VMs + MySQL, but more setup (networking, SSL).*

---

## 3. Database: run migrations on production

After `DATABASE_URL` points to production:

```bash
cd hackathon-backend
DATABASE_URL="mysql://..." npm run migrate
npm run seed:delivery-sites
# optional:
# npm run seed:mock-products
```

Run from your laptop (with network access to the DB) or from the host’s shell.

---

## 4. OpenAI / LLM (not “free” by default)

| Need | Reality |
|------|--------|
| NL cart + catalog chat | Needs **`OPENAI_API_KEY`** on the server. |
| Plan A vs B choice | Same key; **fallback** works without AI. |

**Cheap / free angles:**

- New **OpenAI** accounts sometimes get **trial credit**.  
- **No key** = NL features off; **core ordering + batches + runs** still work.

There is **no** built-in switch to another provider; that would be a code change (e.g. OpenRouter, Groq).

---

## 5. Build commands (reference)

**Backend (typical):**

```bash
npm ci
npm run build
npm run migrate   # against prod DATABASE_URL
node dist/index.js  # or npm run start
```

**Frontend:**

```bash
npm ci
npm run build
npm run start
```

Vercel runs `next build` automatically.

---

## 6. Health checks

After deploy:

- `GET https://<api>/api/health` → `200`  
- `GET https://<api>/api/batch/current` → JSON  
- Open the **frontend** → login → catalog loads (proves `NEXT_PUBLIC_API_URL` + CORS).

---

## 7. Security reminders (even for demos)

- Never commit `.env` or real `JWT_SECRET`.  
- Rotate `JWT_SECRET` if leaked (invalidates all tokens).  
- `OPENAI_API_KEY` **only** on the server — never `NEXT_PUBLIC_*`.

---

## 8. Related docs

- [TESTING-AND-USER-JOURNEYS.md](./TESTING-AND-USER-JOURNEYS.md) — manual QA  
- [QUICK-START-BRIEF.md](./QUICK-START-BRIEF.md) — local run  
- [V1-DELIVERY-BATCH-SPEC.md](./V1-DELIVERY-BATCH-SPEC.md) — product rules  

---

*Free tiers change often — confirm limits on each provider’s site before you depend on them for a live demo.*
