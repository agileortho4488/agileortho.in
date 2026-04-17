# Agile Ortho — Next.js + Vercel POC

> **Status:** Proof-of-Concept ✅ Build succeeds · 810 product pages pre-rendered as static HTML at build time.

This is a parallel Next.js 16 app that migrates the **public catalog** to Vercel for SSG/ISR performance and better Google indexing. It coexists with `/app/frontend` (current React CRA, which still runs the admin dashboard and the rest of the site).

---

## What works today (POC scope)

| Feature | Status |
|---------|--------|
| SSG build of all 810 live catalog products at build time | ✅ |
| Per-product SEO metadata (title, description, canonical, OG, Twitter) | ✅ |
| Per-product JSON-LD `Product` schema injection (Rich Results) | ✅ |
| Knowledge Graph "Surgical Decision Engine" (REQUIRES + BUNDLE) embedded in every product page | ✅ |
| Dynamic `sitemap.xml` with all 810 products | ✅ |
| `robots.txt` | ✅ |
| ISR revalidation every 1h (`export const revalidate = 3600`) | ✅ |
| Home page with 12 featured products | ✅ |
| Dark premium B2B theme preserved (gold/teal/ink) | ✅ |

---

## Architecture

```
┌────────────────────────┐    /api/* rewrites    ┌──────────────────────┐
│ agileortho.in (Vercel) │ ───────────────────►  │ FastAPI on current   │
│ Next.js 16 (this app)  │                        │ host (unchanged)     │
│ - SSG: 810 products    │                        │ /api/catalog/*       │
│ - ISR every 1h         │                        │ /api/products/*      │
└────────────────────────┘                        └──────────────────────┘
```

Admin dashboard continues running on `/app/frontend` (React CRA) at `admin.agileortho.in` — no changes there.

---

## Local dev

```bash
cd /app/next-app
yarn install
cp .env.local.example .env.local
# Edit .env.local to point at your FastAPI backend
yarn dev         # → http://localhost:3001
```

## Build & run

```bash
yarn build       # Generates 810 static HTML files at build time
yarn start -p 3002
```

Smoke-test a product:
```
curl -I http://localhost:3002/catalog/products/mboss-screw-system
curl http://localhost:3002/sitemap.xml | grep -c '<url>'   # → 811
```

---

## Deploying to Vercel

1. Push `/app/next-app` to your GitHub repo.
2. Create a Vercel project, set the **Root Directory** to `next-app`.
3. Add env vars (Production + Preview):
   - `NEXT_PUBLIC_BACKEND_URL` → `https://<your-backend-host>` (FastAPI base URL, no trailing slash)
   - `BACKEND_URL`              → same as above
4. Domain: point `agileortho.in` to the Vercel project. The current React CRA can keep serving `admin.agileortho.in`.
5. Deploy.

> Note: the FastAPI backend must be reachable from Vercel's build runners. If backend is locked behind preview auth, expose the production domain (e.g., `api.agileortho.in`) instead.

---

## What's NOT migrated yet (intentional for POC)

- Home page is minimal (12 product placeholder cards, not the full marketing page)
- All 24 other React pages (District pages, Division pages, Catalog list, Contact, About, Compare, Chat, etc.)
- All admin routes (stays on React CRA)
- `react-helmet-async`, framer-motion, sonner, shadcn/ui components — not needed for POC, will port during full migration

---

## Next steps (session 2 — full migration)

1. Port the full header/footer + navigation
2. Port home page with all marketing sections
3. Port division pages and district pages (both are SSG candidates)
4. Port catalog list page with filters (needs client components)
5. Port chat + contact + compare pages
6. Port SEO components, cookie consent banner
7. Migrate shadcn/ui components directory
8. Archive `/app/frontend` once admin is split out into a separate app at `admin.agileortho.in`
