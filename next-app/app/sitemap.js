import { listCatalogProducts } from "@/lib/api";

const BASE = "https://agileortho.in";

export default async function sitemap() {
  const entries = [
    { url: `${BASE}/`, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
  ];

  // Page through all products for the sitemap (Next.js SSG builds emit this file)
  let page = 1;
  const limit = 100;
  while (page <= 30) {
    const r = await listCatalogProducts({ page, limit });
    const items = r?.products || [];
    for (const p of items) {
      if (!p.slug) continue;
      entries.push({
        url: `${BASE}/catalog/products/${p.slug}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
    if (items.length < limit) break;
    page += 1;
  }

  return entries;
}
