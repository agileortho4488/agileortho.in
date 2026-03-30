"""Prerender Service — Dynamic Rendering for SEO Crawlers.

Generates full HTML for search engine bots that don't execute JavaScript.
Detects bot user-agents and returns server-rendered HTML with meta tags,
JSON-LD schemas, and actual content from the database.

Usage: Configure nginx/Cloudflare to proxy bot traffic to /api/prerender/*
"""
from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from db import catalog_products_col, db
import html
import json

router = APIRouter()

SITE_URL = "https://agileortho.in"
COMPANY_NAME = "Agile Healthcare"

BOT_USER_AGENTS = [
    "googlebot", "bingbot", "yandexbot", "duckduckbot", "baiduspider",
    "slurp", "facebot", "ia_archiver", "sogou", "semrushbot", "ahrefsbot",
    "dotbot", "petalbot", "bytespider", "gptbot", "claudebot", "perplexitybot",
    "google-extended", "twitterbot", "linkedinbot", "whatsapp", "telegram",
    "applebot", "mj12bot",
]


def is_bot(user_agent: str) -> bool:
    ua_lower = (user_agent or "").lower()
    return any(bot in ua_lower for bot in BOT_USER_AGENTS)


def render_html(title: str, description: str, canonical: str, body_html: str,
                og_type: str = "website", og_image: str = None, json_ld: list = None):
    og_img = og_image or f"{SITE_URL}/ao_logo_horizontal.png"
    schemas = ""
    if json_ld:
        for schema in json_ld:
            schemas += f'\n    <script type="application/ld+json">{json.dumps(schema)}</script>'

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{html.escape(title)} | {COMPANY_NAME}</title>
    <meta name="description" content="{html.escape(description)}" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="{SITE_URL}{canonical}" />
    <meta property="og:type" content="{og_type}" />
    <meta property="og:url" content="{SITE_URL}{canonical}" />
    <meta property="og:title" content="{html.escape(title)}" />
    <meta property="og:description" content="{html.escape(description)}" />
    <meta property="og:image" content="{og_img}" />
    <meta property="og:site_name" content="{COMPANY_NAME}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="{html.escape(title)}" />
    <meta name="twitter:description" content="{html.escape(description)}" />
    <meta name="twitter:image" content="{og_img}" />{schemas}
</head>
<body>
    <header>
        <h1>{html.escape(title)}</h1>
        <nav>
            <a href="/">Home</a> |
            <a href="/catalog">Product Catalog</a> |
            <a href="/districts">Service Areas</a> |
            <a href="/about">About</a> |
            <a href="/contact">Contact</a>
        </nav>
    </header>
    <main>
{body_html}
    </main>
    <footer>
        <p>{COMPANY_NAME} — Authorized Meril Life Sciences Distributor for Telangana</p>
        <p>Phone: +91 74162 16262 | WhatsApp: +91 74165 21222 | Email: info@agileortho.in</p>
        <p>Address: 1st Floor, Plot No 26, Engineers Colony, Hayathnagar, Hyderabad, Telangana - 500074</p>
    </footer>
</body>
</html>"""


@router.get("/api/prerender/product/{slug}", response_class=HTMLResponse)
async def prerender_product(slug: str, request: Request):
    product = await catalog_products_col.find_one({"slug": slug}, {"_id": 0})
    if not product:
        return HTMLResponse(content="<html><body><h1>Product Not Found</h1></body></html>", status_code=404)

    name = product.get("product_name_display", product.get("product_name", ""))
    division = product.get("division") or product.get("division_canonical") or ""
    brand = product.get("brand") or product.get("manufacturer") or "Meril Life Sciences"
    material = product.get("material", "")
    desc = product.get("description", "")
    category = product.get("category", "")
    skus = product.get("skus", [])
    specs = product.get("technical_specifications", {})

    seo_desc_parts = [f"{name} by {brand}."]
    if desc:
        seo_desc_parts.append(desc[:200] + ".")
    if material:
        seo_desc_parts.append(f"Material: {material}.")
    if len(skus) > 0:
        seo_desc_parts.append(f"{len(skus)} SKU variants available.")
    seo_desc_parts.append(f"Order from {COMPANY_NAME} — authorized Meril distributor in Telangana.")
    seo_desc = " ".join(seo_desc_parts)

    # Build body HTML
    body = f"""
        <article itemscope itemtype="https://schema.org/Product">
            <h2 itemprop="name">{html.escape(name)}</h2>
            <p><strong>Division:</strong> {html.escape(division)}</p>
            <p><strong>Brand:</strong> <span itemprop="brand">{html.escape(brand)}</span></p>
            {f'<p><strong>Category:</strong> {html.escape(category)}</p>' if category else ''}
            {f'<p><strong>Material:</strong> <span itemprop="material">{html.escape(material)}</span></p>' if material else ''}
            <p itemprop="description">{html.escape(desc)}</p>
"""
    if specs:
        body += "            <h3>Technical Specifications</h3>\n            <table>\n"
        for k, v in specs.items():
            if v:
                body += f"                <tr><td>{html.escape(str(k))}</td><td>{html.escape(str(v))}</td></tr>\n"
        body += "            </table>\n"

    if skus:
        body += f"            <h3>Available Variants ({len(skus)} SKUs)</h3>\n            <ul>\n"
        for sku in skus[:20]:
            sku_code = sku.get("sku_code", "")
            sku_desc = sku.get("description", sku.get("size", ""))
            body += f"                <li>{html.escape(sku_code)} — {html.escape(str(sku_desc))}</li>\n"
        body += "            </ul>\n"

    body += f"""
            <p><a href="/catalog/{division.lower().replace(' ', '-')}">Browse all {html.escape(division)} products</a></p>
            <p><a href="/contact">Request bulk quote for {html.escape(name)}</a></p>
        </article>"""

    json_ld = [
        {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": name,
            "description": desc,
            "brand": {"@type": "Brand", "name": brand},
            "category": division,
            "material": material or None,
            "manufacturer": {"@type": "Organization", "name": brand, "url": "https://merillife.com"},
            "offers": {
                "@type": "Offer",
                "availability": "https://schema.org/InStock",
                "priceCurrency": "INR",
                "url": f"{SITE_URL}/catalog/products/{slug}",
                "seller": {"@type": "Organization", "name": COMPANY_NAME, "url": SITE_URL}
            },
            "additionalType": "https://schema.org/MedicalDevice"
        },
        {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Home", "item": SITE_URL},
                {"@type": "ListItem", "position": 2, "name": "Catalog", "item": f"{SITE_URL}/catalog"},
                {"@type": "ListItem", "position": 3, "name": division, "item": f"{SITE_URL}/catalog/{division.lower().replace(' ', '-')}"},
                {"@type": "ListItem", "position": 4, "name": name}
            ]
        }
    ]

    return render_html(
        title=f"{name} — {brand} | {division}",
        description=seo_desc[:300],
        canonical=f"/catalog/products/{slug}",
        body_html=body,
        og_type="product",
        json_ld=json_ld,
    )


@router.get("/api/prerender/catalog", response_class=HTMLResponse)
async def prerender_catalog(request: Request):
    divisions = await catalog_products_col.distinct("division_canonical")
    total = await catalog_products_col.count_documents({})

    body = f"""
        <h2>Browse {total}+ Medical Devices Across {len(divisions)} Clinical Divisions</h2>
        <p>{COMPANY_NAME} is the authorized Meril Life Sciences master franchise distributor for Telangana. 
        Browse our complete catalog of verified medical devices.</p>
        <h3>Product Divisions</h3>
        <ul>
"""
    for div in sorted(divisions):
        if div:
            slug = div.lower().replace(" ", "-").replace("/", "-")
            count = await catalog_products_col.count_documents({"division_canonical": div})
            body += f'            <li><a href="/catalog/{slug}">{html.escape(div)}</a> — {count} products</li>\n'

    body += """        </ul>
        <p><a href="/contact">Request bulk pricing for any product</a></p>"""

    json_ld = [{
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "Meril Medical Devices Catalog",
        "numberOfItems": total,
        "itemListElement": [
            {"@type": "ListItem", "position": i+1, "name": div, "url": f"{SITE_URL}/catalog/{div.lower().replace(' ', '-').replace('/', '-')}"}
            for i, div in enumerate(sorted(divisions)) if div
        ]
    }]

    return render_html(
        title=f"Medical Device Catalog — {total}+ Meril Products",
        description=f"Browse {total}+ verified Meril medical devices across {len(divisions)} clinical divisions. Authorized distributor for Telangana hospitals.",
        canonical="/catalog",
        body_html=body,
        json_ld=json_ld,
    )


@router.get("/api/prerender/catalog/{division_slug}", response_class=HTMLResponse)
async def prerender_division(division_slug: str, request: Request):
    # Try matching by converting slug to title case for division_canonical
    div_name_guess = division_slug.replace("-", " ").title()
    products = await catalog_products_col.find(
        {"division_canonical": {"$regex": f"^{div_name_guess}$", "$options": "i"}},
        {"_id": 0, "slug": 1, "product_name_display": 1, "brand": 1, "category": 1, "material": 1, "division_canonical": 1}
    ).limit(100).to_list(100)

    if not products:
        return HTMLResponse(content="<html><body><h1>Division Not Found</h1></body></html>", status_code=404)

    div_name = products[0].get("division_canonical", division_slug.replace("-", " ").title())
    categories = list(set(p.get("category", "") for p in products if p.get("category")))

    body = f"""
        <h2>{html.escape(div_name)} Medical Devices from Meril Life Sciences</h2>
        <p>{len(products)}+ verified products available. Categories: {', '.join(html.escape(c) for c in categories[:8])}.</p>
        <h3>Products</h3>
        <ul>
"""
    for p in products:
        name = p.get("product_name_display", "")
        brand = p.get("brand", "Meril")
        slug = p.get("slug", "")
        body += f'            <li><a href="/catalog/products/{slug}">{html.escape(name)}</a> — {html.escape(brand)}</li>\n'

    body += f"""        </ul>
        <p><a href="/catalog">Back to all divisions</a></p>
        <p><a href="/contact">Request bulk quote for {html.escape(div_name)} products</a></p>"""

    return render_html(
        title=f"{div_name} Medical Devices — Meril Authorized",
        description=f"Browse {len(products)}+ {div_name} medical devices from Meril Life Sciences. Categories: {', '.join(categories[:5])}. Authorized distributor for Telangana.",
        canonical=f"/catalog/{division_slug}",
        body_html=body,
    )


@router.get("/api/prerender/district/{slug}", response_class=HTMLResponse)
async def prerender_district(slug: str, request: Request):
    districts_col = db["telangana_districts"]
    district = await districts_col.find_one({"slug": slug}, {"_id": 0})

    # Fallback: use hardcoded data
    if not district:
        from routes.prerender_districts import get_district_data
        district = get_district_data(slug)

    if not district:
        return HTMLResponse(content="<html><body><h1>District Not Found</h1></body></html>", status_code=404)

    name = district.get("name", slug.replace("-", " ").title())
    desc = district.get("description", f"Medical device distributor serving hospitals in {name}, Telangana.")
    hospitals = district.get("hospitals", [])
    focus = district.get("medicalFocus", district.get("medical_focus", []))
    population = district.get("population", "")

    body = f"""
        <article>
            <h2>Medical Devices in {html.escape(name)}, Telangana</h2>
            <p>{html.escape(desc)}</p>
            <p><strong>Population:</strong> {html.escape(population)}</p>
            
            <h3>Healthcare Institutions in {html.escape(name)}</h3>
            <ul>
"""
    for h in hospitals:
        body += f"                <li>{html.escape(h)}</li>\n"

    body += """            </ul>
            
            <h3>Medical Device Divisions Available</h3>
            <ul>
"""
    for f_item in focus:
        body += f"                <li><a href='/catalog'>{html.escape(f_item)}</a></li>\n"

    body += f"""            </ul>
            
            <p><a href="/contact">Request Bulk Quote for {html.escape(name)}</a></p>
            <p><a href="/districts">View all 33 districts</a></p>
        </article>"""

    json_ld = [{
        "@context": "https://schema.org",
        "@type": "MedicalBusiness",
        "name": f"{COMPANY_NAME} — {name}",
        "description": desc,
        "url": f"{SITE_URL}/districts/{slug}",
        "telephone": "+917416216262",
        "address": {
            "@type": "PostalAddress",
            "addressLocality": name,
            "addressRegion": "Telangana",
            "addressCountry": "IN"
        },
        "areaServed": {"@type": "City", "name": name}
    }]

    return render_html(
        title=f"Medical Devices in {name}, Telangana",
        description=f"Authorized Meril Life Sciences distributor in {name}. Supply of orthopedic implants, cardiovascular stents, diagnostic equipment for hospitals. {', '.join(focus[:3])}.",
        canonical=f"/districts/{slug}",
        body_html=body,
        json_ld=json_ld,
    )
