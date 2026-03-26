import { Helmet, HelmetProvider } from "react-helmet-async";

const SITE_URL = "https://www.agileortho.in";
const SITE_NAME = "Agile Ortho";
const DEFAULT_IMAGE = "https://www.agileortho.in/ao_logo_horizontal.png";

export function SEOProvider({ children }) {
  return <HelmetProvider>{children}</HelmetProvider>;
}

export function SEO({ title, description, canonical, image, type = "website", jsonLd, noIndex = false }) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} | Mobility Revolutionised - Authorized Meril Life Sciences Distributor`;
  const metaDescription = description || "Authorized Meril Life Sciences master distributor for Telangana. Orthopedic implants, cardiovascular stents, diagnostics, ENT, endo-surgical, and infection prevention devices for hospitals and clinics.";
  const metaImage = image || DEFAULT_IMAGE;
  const canonicalUrl = canonical ? `${SITE_URL}${canonical}` : undefined;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={metaImage} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_IN" />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={metaImage} />

      {/* Canonical */}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* JSON-LD */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
}

/* ─── JSON-LD Builders ─── */

export function buildOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Agile Orthopedics Private Limited",
    alternateName: "Agile Ortho",
    url: SITE_URL,
    logo: `${SITE_URL}/ao_logo_horizontal.png`,
    description: "Authorized Meril Life Sciences master franchise distributor serving hospitals, clinics, and diagnostic centers across all 33 districts of Telangana.",
    address: {
      "@type": "PostalAddress",
      streetAddress: "1st Floor, Plot No 26, H.No 8-6-11/P20, Urmila Devi Complex, Engineers Colony, Hayathnagar",
      addressLocality: "Hyderabad",
      addressRegion: "Telangana",
      postalCode: "500074",
      addressCountry: "IN"
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+917416216262",
      contactType: "sales",
      areaServed: "Telangana",
      availableLanguage: ["English", "Hindi", "Telugu"]
    },
    sameAs: []
  };
}

export function buildLocalBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    name: "Agile Ortho - Medical Device Distributor",
    image: `${SITE_URL}/ao_logo_horizontal.png`,
    url: SITE_URL,
    telephone: "+917416216262",
    email: "info@agileortho.in",
    address: {
      "@type": "PostalAddress",
      streetAddress: "1st Floor, Plot No 26, Urmila Devi Complex, Engineers Colony, Hayathnagar",
      addressLocality: "Hyderabad",
      addressRegion: "Telangana",
      postalCode: "500074",
      addressCountry: "IN"
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 17.3254,
      longitude: 78.5534
    },
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "09:00",
      closes: "19:00"
    },
    priceRange: "$$",
    areaServed: {
      "@type": "State",
      name: "Telangana"
    }
  };
}

export function buildProductSchema(product, imageUrl) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.product_name,
    description: product.description,
    sku: product.sku_code || undefined,
    brand: {
      "@type": "Brand",
      name: product.manufacturer || "Meril Life Sciences"
    },
    category: product.division,
    image: imageUrl || undefined,
    manufacturer: {
      "@type": "Organization",
      name: product.manufacturer || "Meril Life Sciences"
    },
    offers: {
      "@type": "Offer",
      availability: "https://schema.org/InStock",
      priceCurrency: "INR",
      seller: {
        "@type": "Organization",
        name: "Agile Ortho"
      }
    }
  };
}

export function buildBreadcrumbSchema(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url ? `${SITE_URL}${item.url}` : undefined
    }))
  };
}

export function buildItemListSchema(products, divisionName) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: divisionName ? `${divisionName} Medical Devices` : "Medical Devices Catalog",
    numberOfItems: products.length,
    itemListElement: products.slice(0, 12).map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: p.product_name,
      url: `${SITE_URL}/products/${p.id}`
    }))
  };
}
