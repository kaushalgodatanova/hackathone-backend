# Free MySQL database — quick steps (verified options)

Your app needs **`DATABASE_URL`** in this shape: `mysql://USER:PASSWORD@HOST:PORT/DATABASE`

**Important:** [PlanetScale](https://planetscale.com) **no longer offers a free tier for new accounts** (Hobby ended in 2024). Use one of the options below instead.

---

## Option A — **Aiven** (free MySQL plan — good for “free for now”)

[Aiven](https://aiven.io) advertises a **free MySQL** tier for small projects (limits apply; read their current terms).

### Steps

1. Go to **[aiven.io](https://aiven.io)** → sign up (e.g. GitHub / Google).
2. **Create service** → choose **MySQL**.
3. Pick the **Free** (or trial) plan if shown — **region** may be auto-assigned on free tier.
4. Wait until the service is **Running**.
5. Open the service → **Connection information** (or similar).
6. Copy **host**, **port**, **user**, **password**, **database name** (often `defaultdb`).
7. Build your URL (URL-encode the password if it has special characters):

   ```text
   mysql://USER:PASSWORD@HOST:PORT/DATABASE
   ```

8. **SSL:** Cloud MySQL almost always requires TLS. If the app fails to connect, add query params per Aiven’s **Node.js** / **mysql** docs (often `?ssl-mode=REQUIRED` or SSL flags they document).

9. **Test locally** (from `hackathon-backend/`):

   ```bash
   export DATABASE_URL='mysql://...'
   npm run migrate
   ```

10. Put the **same** `DATABASE_URL` in your **backend** host’s environment (Railway, Render, etc.) — never commit it to git.

**Docs:** [Aiven MySQL get started](https://aiven.io/docs/products/mysql/get-started)

---

## Option B — **Railway** (MySQL in the same place as your API)

[Railway](https://railway.app) gives **trial credits** (e.g. **$5** for new users) and then a small **monthly free credit** — enough for demos, **not** “unlimited forever.”

### Steps

1. Sign up at **[railway.app](https://railway.app)**.
2. **New project** → **Database** → **Add MySQL** (or deploy the [MySQL template](https://railway.app/template/mysql)).
3. Open the MySQL service → **Variables** / **Connect** — copy **`MYSQL_URL`** or build `DATABASE_URL` from host, user, password, database.
4. Run migrations from your laptop (Railway often exposes a **public** URL for the DB, or use **Railway CLI** / private networking when the API is on Railway too):

   ```bash
   cd hackathon-backend
   DATABASE_URL='mysql://...' npm run migrate
   npm run seed:delivery-sites
   ```

5. Paste `DATABASE_URL` into your **backend** service variables on Railway.

**Docs:** [Railway MySQL](https://docs.railway.com/guides/mysql)

---

## After the DB exists (always)

From **`hackathon-backend/`** with a working `DATABASE_URL`:

```bash
npm run migrate
npm run seed:delivery-sites
# optional:
# npm run seed:mock-products
```

---

## If connection fails

| Issue | Try |
|-------|-----|
| `ECONNREFUSED` | Wrong host/port; DB not “running”; firewall. |
| **`ECONNREFUSED` in Docker** (`/app/...` in stack traces) | **`localhost` inside the container is not your laptop’s MySQL.** Use the **Compose service name** (e.g. `mysql://user:pass@mysql:3306/db`) or your **cloud DB hostname** from Aiven/Railway. |
| SSL errors | Add SSL params from your provider’s Node/mysql2 docs. |
| Auth errors | User/password; password must be **URL-encoded** in the URI if it has `@`, `#`, etc. |

---

## Next

Deploy API + frontend: **[DEPLOYMENT-FREE.md](./DEPLOYMENT-FREE.md)**
