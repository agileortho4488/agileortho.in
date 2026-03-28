import { Shield, Users, Globe, Award, Truck, HeartPulse } from "lucide-react";
import { Link } from "react-router-dom";
import { SEO, buildBreadcrumbSchema } from "../components/SEO";

export default function About() {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <SEO
        title="About Us - Authorized Meril Life Sciences Distributor"
        description="Agile Ortho is the authorized Meril Life Sciences master franchise distributor for Telangana, India. Serving hospitals, clinics, and diagnostic centers across all 33 districts with 814+ medical devices."
        canonical="/about"
        jsonLd={buildBreadcrumbSchema([{ name: "Home", url: "/" }, { name: "About" }])}
      />
      {/* Hero */}
      <section className="relative bg-[#0D0D0D] py-16 sm:py-20 overflow-hidden">
        <div className="absolute inset-0 opacity-15">
          <img src="https://images.pexels.com/photos/221047/pexels-photo-221047.jpeg" alt="" className="w-full h-full object-cover" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-emerald-400 text-xs font-bold uppercase tracking-[0.2em] mb-3">About Us</p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight" style={{ fontFamily: "Chivo" }}>
            Mobility Revolutionised
          </h1>
          <p className="mt-4 text-lg text-white/35 max-w-2xl mx-auto leading-relaxed">
            Agile Ortho is the authorized Meril Life Sciences master franchise distributor,
            serving hospitals, clinics, and healthcare institutions across all 33 districts of Telangana.
          </p>
        </div>
      </section>

      {/* About Meril */}
      <section className="py-16 bg-[#0A0A0A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-[#2DD4BF] text-xs font-bold uppercase tracking-[0.2em] mb-2">Our Principal</p>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight" style={{ fontFamily: "Chivo" }}>
                Meril Life Sciences
              </h2>
              <p className="mt-4 text-base text-white/50 leading-relaxed">
                Meril Life Sciences Pvt. Ltd. is an Indian medical device company headquartered in
                Vapi, Gujarat, with a global presence in over 180 countries. With 15,000+ employees
                and 35+ subsidiaries, Meril is at the forefront of innovation in cardiovascular,
                orthopedic, endosurgical, and diagnostic medical devices.
              </p>
              <p className="mt-3 text-base text-white/50 leading-relaxed">
                As their authorized master franchise distributor for Telangana, we bring Meril's
                world-class products directly to healthcare institutions across the state with
                dedicated technical support and competitive pricing.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: "180+", label: "Countries", icon: Globe },
                { value: "15,000+", label: "Employees", icon: Users },
                { value: "35+", label: "Subsidiaries", icon: Award },
                { value: "12", label: "Global Academies", icon: HeartPulse },
              ].map(({ value, label, icon: Icon }) => (
                <div key={label} className="bg-white/5 border border-white/10 rounded-sm p-5 text-center">
                  <Icon size={24} className="mx-auto text-[#2DD4BF] mb-2" />
                  <p className="text-2xl font-black text-white" style={{ fontFamily: "Chivo" }}>{value}</p>
                  <p className="text-xs text-white/40 mt-1 uppercase tracking-wide">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 bg-[#0D0D0D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <p className="text-[#2DD4BF] text-xs font-bold uppercase tracking-[0.2em] mb-2">Why Choose Us</p>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight" style={{ fontFamily: "Chivo" }}>
              The Agile Ortho Advantage
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Shield, title: "Licensed & Certified", desc: "MD-42 Wholesale Drug License holder with ISO 13485:2016 certification and full regulatory compliance." },
              { icon: Truck, title: "Pan-Telangana Coverage", desc: "Dedicated logistics network reaching all 33 districts with temperature-controlled warehousing." },
              { icon: HeartPulse, title: "Technical Support", desc: "Experienced product specialists providing surgical technique guidance and training." },
              { icon: Award, title: "Competitive Pricing", desc: "Direct master franchise relationship with Meril ensures the best pricing for bulk orders." },
              { icon: Users, title: "Dedicated Account Managers", desc: "Personalized service with assigned account managers for each hospital account." },
              { icon: Globe, title: "Complete Product Range", desc: "Access to Meril's entire portfolio across 8 medical divisions from a single distributor." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-[#0A0A0A] border border-white/10 rounded-sm p-6">
                <div className="w-10 h-10 rounded-sm bg-[#2DD4BF]/10 flex items-center justify-center mb-3">
                  <Icon size={20} className="text-[#2DD4BF]" />
                </div>
                <h3 className="font-bold text-white mb-1" style={{ fontFamily: "Chivo" }}>{title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#D4AF37] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl font-black text-white" style={{ fontFamily: "Chivo" }}>Ready to Partner with Us?</h2>
          <p className="mt-2 text-emerald-100">Contact us for competitive bulk pricing and dedicated support.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/contact" className="px-6 py-3 bg-[#0A0A0A] text-[#2DD4BF] font-semibold rounded-sm hover:bg-[#2DD4BF]/10 transition-colors">
              Request Quote
            </Link>
            <Link to="/products" className="px-6 py-3 border border-emerald-300 text-white font-semibold rounded-sm hover:bg-[#F2C94C] transition-colors">
              Browse Products
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
