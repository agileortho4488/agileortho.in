import { Phone, Mail, MapPin, MessageCircle, Clock } from "lucide-react";
import { COMPANY } from "@/lib/constants";
import { FadeUp } from "@/components/Motion";
import ContactForm from "./ContactForm";

export const metadata = {
  title: "Contact Us — Medical Device Quotes & Hospital Procurement",
  description:
    "Get in touch with Agile Ortho for bulk quotes, hospital procurement, and technical specifications on Meril Life Sciences medical devices. WhatsApp, phone, email — we respond within 24 hours.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://agileortho.in" },
      { "@type": "ListItem", position: 2, name: "Contact", item: "https://agileortho.in/contact" },
    ],
  };
  const contactPage = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: "Contact Agile Ortho",
    mainEntity: {
      "@type": "Organization",
      name: "Agile Healthcare",
      telephone: COMPANY.phone,
      email: COMPANY.email,
      address: {
        "@type": "PostalAddress",
        streetAddress: "Hayathnagar",
        addressLocality: "Hyderabad",
        addressRegion: "Telangana",
        postalCode: "500074",
        addressCountry: "IN",
      },
    },
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(contactPage) }} />

      <section className="bg-[#0D0D0D] border-b border-white/[0.06]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16">
          <FadeUp>
            <div className="flex items-center gap-3 mb-3">
              <span className="h-px w-8 bg-[#D4AF37]" />
              <span className="text-xs font-bold text-[#D4AF37] tracking-[0.2em] uppercase">Contact</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-light tracking-tight text-white" style={{ fontFamily: "Outfit" }} data-testid="contact-title">
              Talk to Our <span className="text-[#D4AF37]">Product Specialists</span>
            </h1>
            <p className="mt-3 text-sm sm:text-base text-white/60 max-w-2xl">
              Bulk quotes, hospital procurement, technical specifications — we respond within 24 hours.
              For urgent enquiries, WhatsApp is the fastest route.
            </p>
          </FadeUp>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 grid md:grid-cols-5 gap-10">
          {/* Contact info */}
          <div className="md:col-span-2 space-y-6">
            <FadeUp>
              <h2 className="text-xs font-bold text-[#D4AF37] tracking-[0.2em] uppercase mb-5">Direct Lines</h2>
              <div className="space-y-4">
                <a href={`https://wa.me/${COMPANY.whatsapp.replace("+", "")}`} target="_blank" rel="noreferrer" className="card-premium rounded-sm p-5 flex items-center gap-4 group" data-testid="contact-wa-card">
                  <div className="w-12 h-12 rounded-sm bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center shrink-0">
                    <MessageCircle size={20} className="text-[#D4AF37]" />
                  </div>
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider font-semibold">WhatsApp · Fastest</p>
                    <p className="text-base font-semibold text-white group-hover:text-[#D4AF37] transition-colors">{COMPANY.whatsapp}</p>
                  </div>
                </a>
                <a href={`tel:${COMPANY.phone}`} className="card-premium rounded-sm p-5 flex items-center gap-4 group">
                  <div className="w-12 h-12 rounded-sm bg-[#2DD4BF]/10 border border-[#2DD4BF]/20 flex items-center justify-center shrink-0">
                    <Phone size={20} className="text-[#2DD4BF]" />
                  </div>
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider font-semibold">Sales Hotline</p>
                    <p className="text-base font-semibold text-white group-hover:text-[#2DD4BF] transition-colors">{COMPANY.phone}</p>
                  </div>
                </a>
                <a href={`mailto:${COMPANY.email}`} className="card-premium rounded-sm p-5 flex items-center gap-4 group">
                  <div className="w-12 h-12 rounded-sm bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <Mail size={20} className="text-white/70" />
                  </div>
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider font-semibold">Email</p>
                    <p className="text-base font-semibold text-white">{COMPANY.email}</p>
                  </div>
                </a>
              </div>
            </FadeUp>

            <FadeUp>
              <h2 className="text-xs font-bold text-[#D4AF37] tracking-[0.2em] uppercase mb-5 mt-10">Headquarters</h2>
              <div className="card-premium rounded-sm p-5 space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin size={14} className="text-[#D4AF37] mt-0.5 shrink-0" />
                  <p className="text-sm text-white/75 leading-relaxed">{COMPANY.address}</p>
                </div>
                <div className="flex items-start gap-3 border-t border-white/[0.06] pt-3">
                  <Clock size={14} className="text-[#D4AF37] mt-0.5 shrink-0" />
                  <div className="text-sm text-white/75">
                    <p className="font-medium">Mon – Sat · 10:00 AM – 7:00 PM</p>
                    <p className="text-xs text-white/45 mt-0.5">Sundays: Closed · WhatsApp monitored 24/7</p>
                  </div>
                </div>
              </div>
            </FadeUp>
          </div>

          {/* Form */}
          <div className="md:col-span-3">
            <FadeUp>
              <h2 className="text-xl font-semibold text-white mb-4" style={{ fontFamily: "Outfit" }}>
                Send us a message
              </h2>
              <ContactForm />
            </FadeUp>
          </div>
        </div>
      </section>
    </div>
  );
}
