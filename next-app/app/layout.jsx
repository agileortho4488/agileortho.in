import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ChatWidget from "@/components/ChatWidget";

export const metadata = {
  metadataBase: new URL("https://agileortho.in"),
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
      <body className="bg-[#0A0A0A] text-white antialiased">
        <SiteHeader />
        <main className="min-h-screen pb-20 lg:pb-0">{children}</main>
        <SiteFooter />
        <ChatWidget />
      </body>
    </html>
  );
}
