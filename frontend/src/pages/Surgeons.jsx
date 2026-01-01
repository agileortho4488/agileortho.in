import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Users, Stethoscope, TrendingUp, ChevronRight, Search } from "lucide-react";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// Floating stats that flow behind the hero
function FloatingStats({ surgeons }) {
  const [stats, setStats] = useState([]);

  useEffect(() => {
    if (!surgeons.length) return;

    const items = [];
    const cityCount = {};
    const subCount = {};
    
    surgeons.forEach(s => {
      const city = s.locations?.[0]?.city || s.clinic?.city;
      if (city) cityCount[city] = (cityCount[city] || 0) + 1;
      (s.subspecialties || []).forEach(sub => {
        subCount[sub] = (subCount[sub] || 0) + 1;
      });
    });

    // Add city stats
    Object.entries(cityCount).forEach(([city, count]) => {
      items.push({ text: `${count} surgeons in ${city}`, type: "city" });
    });

    // Add subspecialty stats
    Object.entries(subCount).forEach(([sub, count]) => {
      items.push({ text: `${count} ${sub} specialists`, type: "sub" });
    });

    // Add general stats
    items.push({ text: `${surgeons.length} verified surgeons`, type: "total" });
    items.push({ text: "100% Free listings", type: "free" });
    items.push({ text: "No paid rankings", type: "trust" });
    items.push({ text: "Join the community", type: "cta" });

    // Duplicate for continuous flow
    setStats([...items, ...items, ...items]);
  }, [surgeons]);

  if (!stats.length) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Row 1 - flows left */}
      <div className="absolute top-[15%] left-0 right-0">
        <motion.div
          className="flex gap-8 whitespace-nowrap"
          animate={{ x: [0, -2000] }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        >
          {stats.map((stat, i) => (
            <span
              key={i}
              className="text-white/[0.07] text-2xl sm:text-3xl font-bold tracking-wide"
            >
              {stat.text}
            </span>
          ))}
        </motion.div>
      </div>

      {/* Row 2 - flows right */}
      <div className="absolute top-[40%] left-0 right-0">
        <motion.div
          className="flex gap-8 whitespace-nowrap"
          animate={{ x: [-1500, 500] }}
          transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
        >
          {stats.slice().reverse().map((stat, i) => (
            <span
              key={i}
              className="text-white/[0.05] text-3xl sm:text-4xl font-bold tracking-wide"
            >
              {stat.text}
            </span>
          ))}
        </motion.div>
      </div>

      {/* Row 3 - flows left slower */}
      <div className="absolute top-[70%] left-0 right-0">
        <motion.div
          className="flex gap-12 whitespace-nowrap"
          animate={{ x: [0, -2500] }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        >
          {stats.map((stat, i) => (
            <span
              key={i}
              className="text-white/[0.04] text-4xl sm:text-5xl font-bold tracking-wide"
            >
              {stat.text}
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

function SurgeonCard({ surgeon, index }) {
  const city = surgeon.locations?.[0]?.city || surgeon.clinic?.city || "";
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
    >
      <Link
        to={`/doctor/${surgeon.slug}`}
        data-testid={`surgeon-card-${surgeon.slug}`}
        className="group block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-lg hover:border-teal-200 transition-all duration-300"
      >
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-teal-500/20">
            {surgeon.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'DR'}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 group-hover:text-teal-700 transition-colors truncate">
              {surgeon.name}
            </h3>
            <p className="text-sm text-slate-500 truncate mt-0.5">
              {surgeon.qualifications}
            </p>
          </div>
        </div>

        {/* Subspecialties */}
        {surgeon.subspecialties?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {surgeon.subspecialties.slice(0, 2).map(sub => (
              <Badge
                key={sub}
                className="rounded-full bg-teal-50 text-teal-700 border-0 text-xs px-2.5 py-0.5"
              >
                {sub}
              </Badge>
            ))}
          </div>
        )}

        {/* Location */}
        {city && (
          <div className="flex items-center gap-1.5 mt-4 text-sm text-slate-500">
            <MapPin className="w-3.5 h-3.5" />
            <span>{city}</span>
          </div>
        )}

        {/* CTA */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">View Profile</span>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-1 transition-all" />
        </div>
      </Link>
    </motion.div>
  );
}

export default function Surgeons() {
  const api = useMemo(() => apiClient(), []);
  const [surgeons, setSurgeons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedSubspecialty, setSelectedSubspecialty] = useState("");

  useEffect(() => {
    async function loadSurgeons() {
      setLoading(true);
      try {
        const res = await api.get("/profiles/all");
        setSurgeons(res.data || []);
      } catch (e) {
        console.error("Failed to load surgeons:", e);
      } finally {
        setLoading(false);
      }
    }
    loadSurgeons();
  }, [api]);

  // Filter surgeons
  const filteredSurgeons = useMemo(() => {
    return surgeons.filter(s => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = s.name?.toLowerCase().includes(query);
        const matchesCity = (s.locations?.[0]?.city || s.clinic?.city || "").toLowerCase().includes(query);
        const matchesSub = s.subspecialties?.some(sub => sub.toLowerCase().includes(query));
        if (!matchesName && !matchesCity && !matchesSub) return false;
      }
      if (selectedCity) {
        const city = s.locations?.[0]?.city || s.clinic?.city || "";
        if (!city.toLowerCase().includes(selectedCity.toLowerCase())) return false;
      }
      if (selectedSubspecialty) {
        if (!s.subspecialties?.includes(selectedSubspecialty)) return false;
      }
      return true;
    });
  }, [surgeons, searchQuery, selectedCity, selectedSubspecialty]);

  const availableCities = useMemo(() => {
    const cities = new Set();
    surgeons.forEach(s => {
      const city = s.locations?.[0]?.city || s.clinic?.city;
      if (city) cities.add(city);
    });
    return Array.from(cities).sort();
  }, [surgeons]);

  const availableSubspecialties = useMemo(() => {
    const subs = new Set();
    surgeons.forEach(s => {
      (s.subspecialties || []).forEach(sub => subs.add(sub));
    });
    return Array.from(subs).sort();
  }, [surgeons]);

  return (
    <main data-testid="surgeons-page" className="min-h-screen bg-slate-50">
      {/* Hero Section with Floating Stats */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 overflow-hidden min-h-[420px]">
        {/* Gradient Orbs */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl" />
        </div>

        {/* Flowing Stats Background */}
        <FloatingStats surgeons={surgeons} />

        {/* Content */}
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-2 text-sm text-teal-300 mb-6 backdrop-blur-sm"
            >
              <Users className="h-4 w-4" />
              {surgeons.length} Verified Surgeons & Growing
            </motion.div>

            <h1
              data-testid="surgeons-page-title"
              className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl"
            >
              Our Surgeon{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">
                Community
              </span>
            </h1>

            <p className="mt-6 max-w-2xl mx-auto text-lg text-slate-300">
              Meet the verified orthopaedic specialists who have joined OrthoConnect.
              No paid listings, no rankings — just trusted doctors.
            </p>

            {/* Stats Row */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto"
            >
              <div className="rounded-xl bg-white/10 backdrop-blur border border-white/10 p-4 text-center">
                <div className="text-3xl font-bold text-white">{surgeons.length}</div>
                <div className="text-xs text-slate-300 mt-1">Total Surgeons</div>
              </div>
              <div className="rounded-xl bg-white/10 backdrop-blur border border-white/10 p-4 text-center">
                <div className="text-3xl font-bold text-white">{availableCities.length}</div>
                <div className="text-xs text-slate-300 mt-1">Cities</div>
              </div>
              <div className="rounded-xl bg-white/10 backdrop-blur border border-white/10 p-4 text-center">
                <div className="text-3xl font-bold text-white">{availableSubspecialties.length}</div>
                <div className="text-xs text-slate-300 mt-1">Subspecialties</div>
              </div>
              <div className="rounded-xl bg-white/10 backdrop-blur border border-white/10 p-4 text-center">
                <div className="text-3xl font-bold text-white">Free</div>
                <div className="text-xs text-slate-300 mt-1">Always Free</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Filters & Search */}
      <section className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                data-testid="surgeons-search-input"
                placeholder="Search by name, city, or specialty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 rounded-xl border-slate-200 bg-white"
              />
            </div>
            <select
              data-testid="surgeons-city-filter"
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">All Cities</option>
              {availableCities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            <select
              data-testid="surgeons-subspecialty-filter"
              value={selectedSubspecialty}
              onChange={(e) => setSelectedSubspecialty(e.target.value)}
              className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">All Subspecialties</option>
              {availableSubspecialties.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Surgeons Grid */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 animate-pulse">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-slate-200" />
                  <div className="flex-1">
                    <div className="h-5 w-3/4 bg-slate-200 rounded mb-2" />
                    <div className="h-4 w-1/2 bg-slate-100 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredSurgeons.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Users className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700">No surgeons found</h3>
            <p className="text-slate-500 mt-2">
              {searchQuery || selectedCity || selectedSubspecialty
                ? "Try adjusting your filters"
                : "Be the first to join our community!"}
            </p>
            <Button asChild className="mt-6 rounded-full bg-teal-600 hover:bg-teal-700">
              <Link to="/join">Join as Surgeon</Link>
            </Button>
          </motion.div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-900">
                {filteredSurgeons.length} {filteredSurgeons.length === 1 ? "Surgeon" : "Surgeons"}
                {selectedCity && ` in ${selectedCity}`}
                {selectedSubspecialty && ` • ${selectedSubspecialty}`}
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredSurgeons.map((surgeon, idx) => (
                <SurgeonCard key={surgeon.id} surgeon={surgeon} index={idx} />
              ))}
            </div>
          </>
        )}
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-teal-600 to-emerald-600">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Are you an Orthopaedic Surgeon?
          </h2>
          <p className="mt-4 text-teal-100">
            Join our growing community. Get invited to conferences, CMEs, and connect with peers.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              asChild
              className="rounded-full bg-white text-teal-700 hover:bg-teal-50 px-8 py-3 font-semibold"
            >
              <Link to="/join">Create Your Free Profile</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="rounded-full border-white/30 text-white hover:bg-white/10 px-8 py-3"
            >
              <Link to="/about">Learn More</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
