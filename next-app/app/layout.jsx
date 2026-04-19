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
    default: "Agile Healthcare | Meril Life Sciences Master Franchise — Telangana",
    template: "%s | Agile Healthcare",
  },
  description:
    "Authorized Meril Life Sciences master franchise distributor serving hospitals and clinics across all 33 districts of Telangana. 810+ medical devices across 13 clinical divisions.",
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "Agile Healthcare",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
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
