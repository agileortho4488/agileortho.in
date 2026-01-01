import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { MapPin, Users, Search, ChevronRight, Building2 } from "lucide-react";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";

// Major Indian cities for SEO landing pages
const CITIES = [
  { slug: "hyderabad", name: "Hyderabad", state: "Telangana" },
  { slug: "mumbai", name: "Mumbai", state: "Maharashtra" },
  { slug: "delhi", name: "Delhi", state: "Delhi NCR" },
  { slug: "bangalore", name: "Bangalore", state: "Karnataka" },
  { slug: "chennai", name: "Chennai", state: "Tamil Nadu" },
  { slug: "kolkata", name: "Kolkata", state: "West Bengal" },
  { slug: "pune", name: "Pune", state: "Maharashtra" },
  { slug: "ahmedabad", name: "Ahmedabad", state: "Gujarat" },
  { slug: "jaipur", name: "Jaipur", state: "Rajasthan" },
  { slug: "lucknow", name: "Lucknow", state: "Uttar Pradesh" },
  { slug: "chandigarh", name: "Chandigarh", state: "Punjab" },
  { slug: "kochi", name: "Kochi", state: "Kerala" },
];

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function CityLanding({ citySlug }) {
  const api = useMemo(() => apiClient(), []);
  const [surgeons, setSurgeons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [heroRef, heroInView] = useInView({ triggerOnce: true, threshold: 0.1 });

  const city = CITIES.find((c) => c.slug === citySlug) || { 
    slug: citySlug, 
    name: citySlug.charAt(0).toUpperCase() + citySlug.slice(1),
    state: "India"
  };

  useEffect(() => {
    async function loadSurgeons() {
      setLoading(true);
      try {
        const res = await api.get(`/profiles/search?location=${city.name}&radius_km=50`);
        setSurgeons(res.data || []);
      } catch (e) {
        console.error("Failed to load surgeons:", e);
        setSurgeons([]);
      } finally {
        setLoading(false);
      }
    }
    loadSurgeons();
  }, [api, city.name]);

  // SEO JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    "name": `Orthopaedic Surgeons in ${city.name}`,
    "description": `Find trusted orthopaedic surgeons in ${city.name}, ${city.state}. No ads, no paid listings, no rankings.`,
    "areaServed": {
      "@type": "City",
      "name": city.name,
      "containedInPlace": {
        "@type": "State",
        "name": city.state
      }
    }
  };

  return (
    <main data-testid="city-landing-page" className="min-h-screen bg-white">
      {/* SEO JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero Section */}
      <section
        ref={heroRef}
        className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 overflow-hidden"
      >
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <motion.div
            initial="hidden"
            animate={heroInView ? "visible" : "hidden"}
            variants={fadeInUp}
            className="text-center"
          >
            {/* Breadcrumb */}
            <div className="flex items-center justify-center gap-2 text-sm text-slate-400 mb-6">
              <Link to="/" className="hover:text-white transition-colors">Home</Link>
              <ChevronRight className="h-4 w-4" />
              <span className="text-teal-400">Surgeons in {city.name}</span>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-2 text-sm text-teal-300 mb-6">
              <MapPin className="h-4 w-4" />
              {city.state}, India
            </div>

            <h1
              data-testid="city-landing-title"
              className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl"
            >
              Orthopaedic Surgeons in{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">
                {city.name}
              </span>
            </h1>

            <p className="mt-6 max-w-2xl mx-auto text-lg text-slate-300">
              Find verified orthopaedic specialists near you. No ads, no rankings, no paid listings — 
              just trusted doctors in {city.name}.
            </p>

            {/* Stats */}
            <div className="mt-10 grid grid-cols-3 gap-4 max-w-md mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-white">{surgeons.length}</div>
                <div className="text-sm text-slate-400">Surgeons</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">10+</div>
                <div className="text-sm text-slate-400">Subspecialties</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">Free</div>
                <div className="text-sm text-slate-400">Listings</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Surgeons List */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-2xl font-bold text-slate-900 mb-8">
            {loading ? "Loading surgeons..." : `${surgeons.length} Orthopaedic Surgeons in ${city.name}`}
          </h2>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 animate-pulse">
                  <div className="h-6 w-3/4 bg-slate-200 rounded mb-3" />
                  <div className="h-4 w-1/2 bg-slate-100 rounded mb-4" />
                  <div className="flex gap-2">
                    <div className="h-6 w-16 bg-slate-100 rounded-full" />
                    <div className="h-6 w-16 bg-slate-100 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : surgeons.length === 0 ? (
            <div className="text-center py-12 rounded-2xl bg-slate-50 border border-slate-200">
              <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700">No surgeons listed yet</h3>
              <p className="text-slate-500 mt-2 mb-6">
                Be the first orthopaedic surgeon to list in {city.name}
              </p>
              <Button asChild className="rounded-full bg-teal-600 hover:bg-teal-700">
                <Link to="/join">Join as Surgeon</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {surgeons.map((surgeon, idx) => (
                <motion.div
                  key={surgeon.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Link
                    to={`/doctor/${surgeon.slug}`}
                    data-testid={`city-surgeon-card-${idx}`}
                    className="block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-teal-200 transition-all group"
                  >
                    <h3 className="font-semibold text-slate-900 group-hover:text-teal-700 transition-colors">
                      {surgeon.name}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">{surgeon.qualifications}</p>
                    
                    {surgeon.subspecialties?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {surgeon.subspecialties.slice(0, 2).map((sub) => (
                          <span
                            key={sub}
                            className="inline-flex items-center rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-700"
                          >
                            {sub}
                          </span>
                        ))}
                      </div>
                    )}

                    {surgeon.distance_km && (
                      <div className="flex items-center gap-1 mt-3 text-xs text-slate-500">
                        <MapPin className="h-3 w-3" />
                        {surgeon.distance_km} km away
                      </div>
                    )}
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </section>

      {/* Other Cities */}
      <section className="bg-slate-50 border-t border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <h2 className="text-xl font-bold text-slate-900 mb-6">
            Find Orthopaedic Surgeons in Other Cities
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {CITIES.filter((c) => c.slug !== citySlug).map((c) => (
              <Link
                key={c.slug}
                to={`/orthopaedic-surgeons-${c.slug}`}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:border-teal-300 hover:text-teal-700 transition-all text-center"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-teal-600 to-emerald-600">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Are you an Orthopaedic Surgeon in {city.name}?
          </h2>
          <p className="mt-4 text-teal-100">
            Join OrthoConnect for free. No fees, no commissions, no paid rankings.
          </p>
          <Button
            asChild
            className="mt-8 rounded-full bg-white text-teal-700 hover:bg-teal-50 px-8 py-3 font-semibold"
          >
            <Link to="/join">Create Your Free Profile</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}

// Export the cities list for routing
export { CITIES };
