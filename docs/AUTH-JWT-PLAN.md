# Auth (internal JWT)

- **Register:** `POST /api/auth/register` — body: `email`, `password`, `name`, `role` (`distributor` | `retailer` | `delivery_partner`).
- **Login:** `POST /api/auth/login` — `email`, `password`.
- **Session:** `GET /api/me` — header `Authorization: Bearer <jwt>`.
- **Env:** `JWT_SECRET`, `JWT_EXPIRES_IN`, `DATABASE_URL`, `FRONTEND_URL` (CORS allowlist when `NODE_ENV=production`). In development, CORS mirrors the browser `Origin` so any Next.js port works.
- **DB:** edit `src/database/schema`, then `npm run migrate:create-only` → `npm run migrate`.

Frontend: wrap the app in `AuthProvider` (`src/components/providers.tsx`), set `NEXT_PUBLIC_API_URL`, use `/login` and `/register`. After auth, redirect target is `AUTHENTICATED_PATH` in `src/lib/roles.ts` (default `/dashboard`).
