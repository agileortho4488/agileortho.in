/**
 * Server-side API client for Next.js SSG/ISR.
 *
 * During `next build`, Next.js calls these at build time for each static path.
 * At runtime (ISR revalidation), the same functions are called on the server.
 */

const BACKEND =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "";

function assertBackend() {
  if (!BACKEND) {
    throw new Error(
      "NEXT_PUBLIC_BACKEND_URL or BACKEND_URL env var is required for Next.js POC"
    );
  }
}

export async function getCatalogProduct(slug) {
  assertBackend();
  const res = await fetch(`${BACKEND}/api/catalog/products/${slug}`, {
    next: { revalidate: 3600 }, // ISR: revalidate every hour
  });
  if (!res.ok) return null;
  return res.json();
}

export async function getProductRecommendations(slug) {
  assertBackend();
  const res = await fetch(`${BACKEND}/api/products/${slug}/recommendations`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function listCatalogProducts({ page = 1, limit = 100 } = {}) {
  assertBackend();
  const url = `${BACKEND}/api/catalog/products?page=${page}&limit=${limit}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    // eslint-disable-next-line no-console
    console.error(`[listCatalogProducts] ${url} -> ${res.status}`);
    return { products: [], total: 0 };
  }
  return res.json();
}

export function backendFileUrl(storagePath) {
  if (!storagePath) return null;
  return `${BACKEND}/api/files/${storagePath}`;
}
