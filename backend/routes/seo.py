"""SEO Routes — robots.txt, sitemap.xml, llms.txt"""
from fastapi import APIRouter
from fastapi.responses import PlainTextResponse, Response
from datetime import datetime, timezone
from db import catalog_products_col, db

router = APIRouter()

SITE_URL = "https://www.agileortho.in"


@router.get("/api/seo/robots.txt", response_class=PlainTextResponse)
async def robots_txt():
    return f"""User-agent: *
Allow: /
Disallow: /admin/
Disallow: /admin/*

# Allow major search engine bots
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: DuckDuckBot
Allow: /

# Allow AI crawlers
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

# Sitemaps
Sitemap: {SITE_URL}/sitemap.xml

# Host
Host: {SITE_URL}
"""


@router.get("/api/seo/sitemap.xml")
async def sitemap_xml():
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    urls = []

    # Static pages
    static_pages = [
        {"loc": "/", "priority": "1.0", "changefreq": "weekly"},
        {"loc": "/catalog", "priority": "0.9", "changefreq": "weekly"},
        {"loc": "/about", "priority": "0.7", "changefreq": "monthly"},
        {"loc": "/contact", "priority": "0.7", "changefreq": "monthly"},
        {"loc": "/districts", "priority": "0.8", "changefreq": "monthly"},
    ]
    for p in static_pages:
        urls.append(f"""  <url>
    <loc>{SITE_URL}{p['loc']}</loc>
    <lastmod>{now}</lastmod>
    <changefreq>{p['changefreq']}</changefreq>
    <priority>{p['priority']}</priority>
  </url>""")

    # Division pages
    divisions = await catalog_products_col.distinct("division_canonical")
    for div in divisions:
        if div:
            slug = div.lower().replace(" ", "-").replace("/", "-")
            urls.append(f"""  <url>
    <loc>{SITE_URL}/catalog/{slug}</loc>
    <lastmod>{now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>""")

    # Product pages (top 500)
    products = await catalog_products_col.find(
        {"slug": {"$exists": True, "$ne": ""}},
        {"_id": 0, "slug": 1}
    ).limit(500).to_list(500)
    for p in products:
        if p.get("slug"):
            urls.append(f"""  <url>
    <loc>{SITE_URL}/catalog/products/{p['slug']}</loc>
    <lastmod>{now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>""")

    # District pages
    districts_col = db["telangana_districts"]
    districts = await districts_col.find(
        {"slug": {"$exists": True}}, {"_id": 0, "slug": 1}
    ).to_list(50)
    for d in districts:
        if d.get("slug"):
            urls.append(f"""  <url>
    <loc>{SITE_URL}/districts/{d['slug']}</loc>
    <lastmod>{now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>""")

    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{chr(10).join(urls)}
</urlset>"""

    return Response(content=xml, media_type="application/xml")


@router.get("/api/seo/llms.txt", response_class=PlainTextResponse)
async def llms_txt():
    return f"""# Agile Healthcare — llms.txt
# https://www.agileortho.in

## About
Agile Healthcare (Agile Orthopedics Pvt Ltd) is the authorized Meril Life Sciences master franchise distributor for the entire state of Telangana, India. We supply 810+ verified medical devices across 13 clinical divisions to hospitals, clinics, and diagnostic centers in all 33 districts.

## Business Information
- Type: B2B Medical Device Distributor
- Brand: Meril Life Sciences (Authorized Master Franchise)
- Territory: All 33 districts of Telangana, India
- Headquarters: Hyderabad, Telangana
- Phone: +91 74162 16262
- WhatsApp: +91 74165 21222
- Email: info@agileortho.in
- Website: {SITE_URL}

## Product Divisions (13)
1. Trauma & Orthopedic Implants — Locking plates, intramedullary nails, screws
2. Joints / Arthroplasty — Knee and hip replacement systems
3. Spine Surgery — Pedicle screw systems, interbody cages
4. Cardiovascular — BioMime stents, Myval THV, PTCA balloons
5. Endosurgery — Laparoscopic instruments, staplers, trocars
6. ENT — ENT implants and instruments
7. Diagnostics — Diagnostic kits, analyzers, reagent systems
8. Vascular Intervention — VasCon stents, catheters
9. Surgical Consumables — Sutures, gowns, drapes
10. Sports Medicine — Anchor systems, sports med implants
11. Dental — Dental implant systems
12. Orthobiologics — Bone grafts, PRP systems
13. Endo — Endoscopy systems

## Certifications
- ISO 13485 Certified
- CDSCO Registered
- Wholesale Drug License MD-42
- GST: 36AATCA5653R1ZO

## Service Areas
Hyderabad Metro (4 Zones, 1,891+ facilities), Warangal, Nizamabad, Karimnagar, Khammam, Nalgonda, Mahbubnagar, Adilabad, and all other Telangana districts.

## Key Pages
- Product Catalog: {SITE_URL}/catalog
- About Us: {SITE_URL}/about
- Contact: {SITE_URL}/contact
- Service Areas: {SITE_URL}/districts
"""
