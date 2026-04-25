import Script from "next/script";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ChatWidget from "@/components/ChatWidget";
import PageviewTracker from "@/components/PageviewTracker";

// Google Analytics 4 — Agile Healthcare main stream
const GA_MEASUREMENT_ID = "G-MXXC41JFLG";

export const metadata = {
  metadataBase: new URL("https://www.agileortho.in"),
  title: {
    default: "Orthopedic Implants & Medical Devices Distributor in Hyderabad — Meril Telangana | Agile Healthcare",
    template: "%s | Agile Healthcare",
  },
  description:
    "Buy Meril orthopedic implants, trauma plates, knee & hip replacement systems, cardiovascular stents and 810+ CDSCO-approved medical devices in Hyderabad and across all 33 Telangana districts. Authorized Meril Life Sciences master franchise — fast hospital delivery, bulk B2B pricing.",
  keywords: [
    "orthopedic implants distributor Hyderabad",
    "medical devices supplier Telangana",
    "Meril Life Sciences distributor",
    "trauma implants Hyderabad",
    "knee replacement implants India",
    "hip replacement implants Telangana",
    "CDSCO approved orthopedic implants",
    "cardiovascular stents distributor India",
    "joint replacement implants Hyderabad",
    "buy orthopedic implants Telangana",
    "B2B medical device supplier Hyderabad",
    "spine implants distributor Hyderabad",
    "endo surgery instruments Telangana",
  ],
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "Agile Healthcare",
  },
  twitter: {
    card: "summary_large_image",
    site: "@agileortho",
  },
  robots: { index: true, follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large",
      "max-snippet": -1, "max-video-preview": -1 } },
  verification: { google: "" },
};

export default function RootLayout({ children }) {
  // Sitewide schema graph: WebSite (Sitelinks Search Box) + enriched
  // Organization + MedicalEquipmentSupplier (more specific than MedicalBusiness).
  // Single @graph keeps payload small while letting Google connect entities.
  const siteSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://www.agileortho.in/#website",
        url: "https://www.agileortho.in",
        name: "Agile Healthcare",
        description:
          "Meril Life Sciences master franchise — orthopedic implants & medical device distributor for Telangana.",
        inLanguage: "en-IN",
        publisher: { "@id": "https://www.agileortho.in/#organization" },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate:
              "https://www.agileortho.in/catalog?search={search_term_string}",
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": ["Organization", "MedicalEquipmentSupplier", "LocalBusiness"],
        "@id": "https://www.agileortho.in/#organization",
        name: "Agile Healthcare",
        legalName: "AGILE ORTHOPEDICS PRIVATE LIMITED",
        url: "https://www.agileortho.in",
        logo: {
          "@type": "ImageObject",
          url: "https://www.agileortho.in/agile_healthcare_logo.png",
          width: 512,
          height: 512,
        },
        image: "https://www.agileortho.in/agile_healthcare_logo.png",
        description:
          "Authorized Meril Life Sciences master franchise distributor of orthopedic implants, trauma plates, joint replacement systems, cardiovascular stents and 810+ CDSCO-approved medical devices for hospitals across Telangana.",
        slogan:
          "810+ Meril medical devices delivered across 33 Telangana districts.",
        telephone: "+917416216262",
        email: "info@agileortho.in",
        priceRange: "₹₹",
        currenciesAccepted: "INR",
        paymentAccepted: "Cash, Bank Transfer, UPI, Cheque",
        openingHours: "Mo-Sa 09:00-19:00",
        address: {
          "@type": "PostalAddress",
          streetAddress: "Hayathnagar",
          addressLocality: "Hyderabad",
          addressRegion: "Telangana",
          postalCode: "500074",
          addressCountry: "IN",
        },
        geo: {
          "@type": "GeoCoordinates",
          latitude: 17.331,
          longitude: 78.602,
        },
        areaServed: [
          { "@type": "State", name: "Telangana" },
          { "@type": "City", name: "Hyderabad" },
          { "@type": "City", name: "Warangal" },
          { "@type": "City", name: "Karimnagar" },
          { "@type": "City", name: "Nizamabad" },
          { "@type": "City", name: "Khammam" },
        ],
        contactPoint: [
          {
            "@type": "ContactPoint",
            telephone: "+917416216262",
            contactType: "Sales",
            areaServed: "IN",
            availableLanguage: ["English", "Hindi", "Telugu"],
          },
          {
            "@type": "ContactPoint",
            telephone: "+917416521222",
            contactType: "WhatsApp",
            areaServed: "IN",
            availableLanguage: ["English", "Hindi", "Telugu"],
          },
        ],
        sameAs: [
          "https://www.merillife.com",
          "https://www.linkedin.com/company/agile-healthcare-hyderabad",
        ],
        knowsAbout: [
          "Orthopedic Implants",
          "Trauma Plates",
          "Joint Replacement",
          "Cardiovascular Stents",
          "Endoscopic Surgery",
          "Medical Diagnostics",
          "Spine Implants",
          "Sports Medicine",
        ],
        makesOffer: {
          "@type": "Offer",
          itemOffered: {
            "@type": "MedicalDevice",
            name: "Meril Life Sciences Medical Devices",
          },
        },
      },
    ],
  };

  return (
    <html lang="en">
      <head>
        {/* Sitewide Organization + WebSite + LocalBusiness schema */}
        <Script
          id="ld-site-graph"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteSchema) }}
        />
        {/* Google Analytics 4 (gtag.js) — loaded afterInteractive for best Core Web Vitals */}
        <Script
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              page_path: window.location.pathname,
              anonymize_ip: true,
            });
          `}
        </Script>
      </head>
      <body className="bg-[#0A0A0A] text-white antialiased">
        <PageviewTracker />
        <SiteHeader />
        <main className="min-h-screen pb-20 lg:pb-0">{children}</main>
        <SiteFooter />
        <ChatWidget />
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
