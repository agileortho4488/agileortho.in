"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, ArrowRight, MessageCircle, ChevronDown } from "lucide-react";

const HERO_BG =
  "https://static.prod-images.emergentagent.com/jobs/ba46cd2b-59a7-4ec9-b669-726f82ef2be6/images/1a9163d6801209f9b5299054943c93e970d5743284fe9652166bc8cb79de42f6.png";

const easeOut = [0.22, 1, 0.36, 1];

export default function HomeHero({ totalProducts = 810, divisionCount = 13 }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const router = useRouter();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/catalog?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const stats = [
    { value: `${totalProducts}+`, label: "Verified Products", sub: "Across all divisions" },
    { value: `${divisionCount}`, label: "Clinical Divisions", sub: "Complete coverage" },
    { value: "33", label: "Districts", sub: "All of Telangana" },
    { value: "24/7", label: "AI Support", sub: "Instant product help" },
  ];

  return (
    <section className="relative min-h-[88vh] flex items-center overflow-hidden" data-testid="hero-section">
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HERO_BG}
          alt="Meril Life Sciences medical devices — surgical implants, cardiovascular stents, and diagnostic equipment for hospitals in Hyderabad and Telangana"
          className="w-full h-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A] via-[#0A0A0A]/85 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-[#0A0A0A]/50" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 py-20 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: easeOut }}
              className="flex items-center gap-3 mb-6"
            >
              <span className="h-px w-10 bg-[#D4AF37]" />
              <span className="text-xs font-bold text-[#D4AF37] tracking-[0.25em] uppercase" data-testid="hero-overline">
                Meril Authorized Distributor
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: easeOut }}
              className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight text-white leading-[1.1]"
              style={{ fontFamily: "Outfit" }}
              data-testid="hero-title"
            >
              Meril Medical
              <br />
              <span className="text-gradient-gold font-medium">Devices</span> for
              <br />
              Hyderabad &amp; Telangana
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35, ease: easeOut }}
              className="mt-6 text-base sm:text-lg text-white/70 max-w-lg leading-[1.75]"
              data-testid="hero-subtitle"
            >
              Browse <span className="text-white font-semibold">{totalProducts}+</span> verified products across{" "}
              <span className="text-white font-semibold">{divisionCount}</span> clinical divisions. Serving hospitals and clinics in all 33 districts.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.45, ease: easeOut }}
              className={`mt-8 transition-all duration-300 max-w-lg ${searchFocused ? "scale-[1.02]" : ""}`}
            >
              <form onSubmit={handleSearch} className="flex items-center gap-0" data-testid="hero-search-form">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                    placeholder="Search by name or SKU (e.g., KET 2.4mm Locking Plate)"
                    className={`w-full bg-white/5 border rounded-l-sm pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-white/30 focus:outline-none transition-all duration-300 ${
                      searchFocused ? "border-[#D4AF37]/60 bg-white/[0.08] shadow-lg shadow-[#D4AF37]/5" : "border-white/10"
                    }`}
                    data-testid="hero-search-input"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-[#D4AF37] hover:bg-[#F2C94C] text-black font-semibold px-6 py-3.5 rounded-r-sm text-sm transition-all hover:shadow-lg hover:shadow-[#D4AF37]/20"
                  data-testid="hero-search-btn"
                >
                  Search
                </button>
              </form>
              <p className="mt-2 text-xs text-white/35 pl-1">Try: &quot;trauma plates&quot;, &quot;BioMime stent&quot;, &quot;knee implant&quot;</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.55, ease: easeOut }}
              className="mt-8 flex flex-wrap gap-4"
            >
              <Link
                href="/catalog"
                className="group inline-flex items-center gap-2 bg-[#D4AF37] hover:bg-[#F2C94C] text-black font-semibold rounded-sm px-7 py-3.5 text-sm transition-all hover:shadow-lg hover:shadow-[#D4AF37]/20"
                data-testid="hero-cta-catalog"
              >
                Browse Catalog <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href="https://wa.me/917416521222?text=Hi%2C%20I%27d%20like%20to%20check%20product%20availability%20and%20pricing%20for%20my%20hospital."
                target="_blank"
                rel="noreferrer"
                className="group inline-flex items-center gap-2 border border-white/15 hover:border-[#D4AF37]/40 hover:bg-white/5 text-white font-medium rounded-sm px-7 py-3.5 text-sm transition-all"
                data-testid="hero-cta-availability"
              >
                <MessageCircle size={14} /> Check Availability &amp; Pricing
              </a>
            </motion.div>
          </div>

          <div className="hidden lg:grid grid-cols-2 gap-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3 + i * 0.1, ease: easeOut }}
                className="card-premium rounded-sm p-6 text-center hover-lift"
                data-testid={`hero-stat-${stat.label.toLowerCase().replace(/\s/g, "-")}`}
              >
                <p className="text-3xl font-light text-white" style={{ fontFamily: "Outfit" }}>{stat.value}</p>
                <p className="text-xs text-[#D4AF37] font-semibold mt-1 uppercase tracking-wider">{stat.label}</p>
                <p className="text-[11px] text-white/40 mt-0.5">{stat.sub}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll Guidance */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce" data-testid="scroll-hint">
        <span className="text-[10px] text-white/30 uppercase tracking-widest font-medium">Browse Categories</span>
        <ChevronDown size={16} className="text-[#D4AF37]/50" />
      </div>
    </section>
  );
}
