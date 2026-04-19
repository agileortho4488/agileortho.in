import { listCatalogProducts, getDivisions } from "@/lib/api";
import { TELANGANA_DISTRICTS } from "@/lib/districts";

const BASE = "https://agileortho.in";

export default async function sitemap() {
  const entries = [
    { url: `${BASE}/`, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/catalog`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/districts`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  ];

  // Division pages
  const divs = (await getDivisions())?.divisions || [];
  for (const d of divs) {
    entries.push({
      url: `${BASE}/catalog/${d.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.85,
    });
  }

  // District pages
  for (const d of TELANGANA_DISTRICTS) {
    entries.push({
      url: `${BASE}/districts/${d.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.75,
    });
  }

  // All product pages
  let page = 1;
  const limit = 100;
  while (page <= 30) {
    const r = await listCatalogProducts({ page, limit });
    const items = r?.products || [];
    for (const p of items) {
      if (!p.slug) continue;
      // Skip slugs containing special chars that break XML (e.g. `&`).
      // Such pages are still reachable by direct URL; they're just excluded
      // from the sitemap to keep it Google-valid.
      if (/[&<>"']/.test(p.slug)) continue;
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
