import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata = {
  metadataBase: new URL("https://agileortho.in"),
  title: {
    default: "Agile Healthcare | Meril Life Sciences Master Franchise — Telangana",
    template: "%s | Agile Healthcare",
  },
  description:
    "Authorized Meril Life Sciences master franchise distributor serving hospitals and clinics across all 33 districts of Telangana. 967+ medical devices across 13 clinical divisions.",
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "Agile Healthcare",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-ink text-white antialiased">{children}</body>
    </html>
  );
}
