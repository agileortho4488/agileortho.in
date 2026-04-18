/**
 * Server-side API client for Next.js SSG/ISR.
 *
 * IMPORTANT: DO NOT use `cache: "no-store"` here — it opts the route out of
 * SSG and forces dynamic rendering, which produces a `notFound()` fallback
 * on Vercel's build runners. We use `next: { revalidate: <seconds> }` which
 * is SSG-compatible and also enables ISR.
 */

const BACKEND =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "";

// 1h ISR revalidate for data fetches. Change to `false` for static-forever.
const REVALIDATE_SECONDS = 3600;

function assertBackend() {
  if (!BACKEND) {
    throw new Error(
      "NEXT_PUBLIC_BACKEND_URL or BACKEND_URL env var is required for Next.js"
    );
  }
}

// Module-level cache shared across all page generations within one build.
const productCache = new Map();
let listCacheFilled = false;

async function _fetchJSON(url, { retries = 2, revalidate = REVALIDATE_SECONDS } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { next: { revalidate } });
      if (!res.ok) {
        if (attempt < retries && res.status >= 500) {
          await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
          continue;
        }
        // eslint-disable-next-line no-console
        console.error(`[api] ${url} -> ${res.status}`);
        return null;
      }
      return await res.json();
    } catch (err) {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
        continue;
      }
      // eslint-disable-next-line no-console
      console.error(`[api] ${url} -> EXCEPTION ${err.message}`);
      return null;
    }
  }
  return null;
}

export async function listCatalogProducts({ page = 1, limit = 100 } = {}) {
  assertBackend();
  const data = await _fetchJSON(
    `${BACKEND}/api/catalog/products?page=${page}&limit=${limit}`
  );
  return data || { products: [], total: 0 };
}

/**
 * Bulk prefetch used during build to populate the product cache.
 * After this runs, every subsequent getCatalogProduct(slug) is a map lookup.
 */
async function prefillProductCache() {
  if (listCacheFilled) return;
  assertBackend();
  let page = 1;
  const limit = 100;
  while (page <= 30) {
    const data = await _fetchJSON(
      `${BACKEND}/api/catalog/products?page=${page}&limit=${limit}`
    );
    const items = data?.products || [];
    for (const p of items) {
      if (p.slug) productCache.set(p.slug, p);
    }
    if (items.length < limit) break;
    page += 1;
  }
  listCacheFilled = true;
  // eslint-disable-next-line no-console
  console.log(`[api] prefilled product cache: ${productCache.size} products`);
}

export async function getCatalogProduct(slug) {
  assertBackend();
  if (!listCacheFilled) await prefillProductCache();
  if (productCache.has(slug)) return productCache.get(slug);
  return _fetchJSON(`${BACKEND}/api/catalog/products/${slug}`);
}

export async function getProductRecommendations(slug) {
  assertBackend();
  const data = await _fetchJSON(
    `${BACKEND}/api/products/${slug}/recommendations`
  );
  return data || { must_buy: [], bundle: [] };
}

export function backendFileUrl(storagePath) {
  if (!storagePath) return null;
  return `${BACKEND}/api/files/${storagePath}`;
}
