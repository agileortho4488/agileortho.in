import { useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { MapPin, Search, AlertTriangle, Heart, Stethoscope, ChevronRight, Shield, Ban, Users, Award, Sparkles, Zap, Activity } from "lucide-react";

import SmartSearchBar from "@/components/search/SmartSearchBar";
import ResultsList from "@/components/search/ResultsList";
import ResultsMap from "@/components/search/ResultsMap";

import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api";

const POPULAR_SEARCHES = [
  { label: "Knee Pain", query: "knee surgeon", icon: "🦵" },
  { label: "Shoulder Injury", query: "shoulder specialist", icon: "💪" },
  { label: "Spine Problems", query: "spine surgeon", icon: "🦴" },
  { label: "Sports Injury", query: "sports medicine", icon: "⚽" },
  { label: "Joint Replacement", query: "joint replacement surgeon", icon: "🦿" },
  { label: "Fracture Care", query: "trauma surgeon", icon: "🩹" },
];

const CONDITION_CATEGORIES = [
  {
    title: "Knee & Sports",
    description: "ACL tears, meniscus injuries, arthritis, and sports-related conditions",
    icon: "🦵",
    link: "/education/knee-sports",
    gradient: "from-emerald-500 to-teal-600",
    glow: "hover:shadow-emerald-500/25",
  },
  {
    title: "Spine & Back",
    description: "Disc problems, sciatica, spinal stenosis, and back pain conditions",
    icon: "🦴",
    link: "/education/spine",
    gradient: "from-blue-500 to-indigo-600",
    glow: "hover:shadow-blue-500/25",
  },
  {
    title: "Shoulder & Elbow",
    description: "Rotator cuff, frozen shoulder, tennis elbow, and arm conditions",
    icon: "💪",
    link: "/education/shoulder-elbow",
    gradient: "from-violet-500 to-purple-600",
    glow: "hover:shadow-violet-500/25",
  },
  {
    title: "Hand & Wrist",
    description: "Carpal tunnel, trigger finger, fractures, and hand conditions",
    icon: "✋",
    link: "/education/hand-wrist",
    gradient: "from-amber-500 to-orange-600",
    glow: "hover:shadow-amber-500/25",
  },
  {
    title: "Hip & Pelvis",
    description: "Hip arthritis, AVN, hip replacement, and pelvic conditions",
    icon: "🦿",
    link: "/education/recon-arthroplasty",
    gradient: "from-rose-500 to-pink-600",
    glow: "hover:shadow-rose-500/25",
  },
  {
    title: "Pediatric Ortho",
    description: "Children's bone and joint conditions, growth disorders",
    icon: "👶",
    link: "/education/pediatric-orthopaedics",
    gradient: "from-cyan-500 to-sky-600",
    glow: "hover:shadow-cyan-500/25",
  },
];

const RED_FLAGS = [
  { symptom: "Sudden severe pain with deformity", action: "Visit ER immediately", icon: "🚨" },
  { symptom: "Inability to bear weight after injury", action: "Seek urgent care", icon: "⚠️" },
  { symptom: "Numbness or tingling in limbs", action: "Consult within 24 hours", icon: "🔴" },
  { symptom: "Joint locked in position", action: "Seek urgent evaluation", icon: "🆘" },
];

const STATS = [
  { value: "700+", label: "Educational Topics", icon: "📚" },
  { value: "11", label: "Specialties Covered", icon: "🏥" },
  { value: "100%", label: "Free for Surgeons", icon: "💯" },
  { value: "0", label: "Paid Listings", icon: "🚫" },
];

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" } },
};

function AnimatedSection({ children, className = "" }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={staggerContainer}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function GlowCard({ children, className = "", glowColor = "teal" }) {
  return (
    <motion.div
      variants={fadeInUp}
      whileHover={{ scale: 1.02, y: -5 }}
      className={`relative group ${className}`}
    >
      <div className={`absolute -inset-0.5 bg-gradient-to-r from-${glowColor}-500 to-${glowColor}-600 rounded-2xl blur opacity-0 group-hover:opacity-30 transition-all duration-500`} />
      <div className="relative">{children}</div>
    </motion.div>
  );
}

export default function Home() {
  const api = useMemo(() => apiClient(), []);
  const [searchParams] = useSearchParams();
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

  const [radiusKm, setRadiusKm] = useState(10);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [activeSlug, setActiveSlug] = useState(null);
  const [query, setQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  async function runSmartSearch(next) {
    setLoading(true);
    setError("");
    setHasSearched(true);
    try {
      const res = await api.get("/profiles/smart-search", {
        params: { q: next.q, radius_km: radiusKm },
      });
      setResults(res.data || []);
    } catch (e) {
      setError(e?.response?.data?.detail || "Search failed. Please try again.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  const shouldAutoSearch = useMemo(() => {
    const t = query.trim();
    if (t.length < 4) return false;
    const hasNearOrIn = /\b(near|in)\b/i.test(t);
    const hasPincode = /\b\d{6}\b/.test(t);
    return hasNearOrIn || hasPincode;
  }, [query]);

  useEffect(() => {
    const q = searchParams.get("q") || "";
    if (q.trim()) {
      setQuery(q);
      runSmartSearch({ q });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!shouldAutoSearch) return;
    const handle = setTimeout(() => {
      runSmartSearch({ q: query.trim() });
    }, 650);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, radiusKm, shouldAutoSearch]);

  const handleNearMe = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newQuery = `orthopaedic surgeon near ${latitude.toFixed(4)},${longitude.toFixed(4)}`;
        setQuery(newQuery);
        runSmartSearch({ q: newQuery });
        setGettingLocation(false);
      },
      () => {
        setError("Unable to get your location. Please enter a pincode instead.");
        setGettingLocation(false);
      }
    );
  };

  return (
    <main data-testid="home-page" className="bg-white overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute bottom-1/4 left-0 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      {/* Hero Section */}
      <motion.section
        data-testid="home-hero"
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative min-h-[90vh] flex items-center justify-center border-b border-slate-100"
      >
        {/* Animated gradient mesh */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-teal-50/30" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-teal-400/20 to-emerald-400/20 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-full blur-3xl animate-float-delayed" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-violet-400/10 to-purple-400/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-center"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border border-teal-200/50 px-4 py-2 mb-8"
            >
              <Sparkles className="h-4 w-4 text-teal-600" />
              <span className="text-sm font-medium text-teal-700">India&apos;s Ethical Orthopaedic Platform</span>
            </motion.div>

            <h1
              data-testid="home-hero-title"
              className="text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl"
            >
              Find Trusted
              <br />
              <span className="relative">
                <span className="bg-gradient-to-r from-teal-600 via-emerald-500 to-cyan-500 bg-clip-text text-transparent">
                  Orthopaedic Care
                </span>
                <motion.span
                  className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.8, duration: 0.6 }}
                />
              </span>
            </h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              data-testid="home-hero-subtext"
              className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 sm:text-xl"
            >
              Search like you would on Google. We&apos;ll match you with verified surgeons.
              <span className="font-semibold text-slate-900 block mt-1">No ads. No rankings. No paid listings.</span>
            </motion.p>
          </motion.div>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mx-auto mt-10 max-w-3xl"
          >
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500 rounded-3xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity" />
              <div className="relative">
                <SmartSearchBar
                  value={query}
                  onChange={(v) => setQuery(v)}
                  onSearch={(v) => {
                    setQuery(v.q);
                    runSmartSearch(v);
                  }}
                />
              </div>
            </div>

            {/* Near Me + Radius Controls */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="mt-5 flex flex-wrap items-center justify-between gap-4"
            >
              <Button
                data-testid="home-near-me-button"
                variant="outline"
                onClick={handleNearMe}
                disabled={gettingLocation}
                className="h-11 rounded-full border-teal-200 bg-white/80 backdrop-blur px-5 text-sm font-medium text-slate-700 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700 transition-all shadow-sm"
              >
                <MapPin className="mr-2 h-4 w-4 text-teal-600" />
                {gettingLocation ? "Getting location..." : "Near me"}
              </Button>

              <div className="flex items-center gap-2 bg-white/80 backdrop-blur rounded-full px-4 py-2 border border-slate-200 shadow-sm">
                <span className="text-xs text-slate-500 font-medium">Radius:</span>
                {[5, 10, 25, 50].map((n) => (
                  <Button
                    data-testid={`home-radius-${n}-button`}
                    key={n}
                    variant="ghost"
                    onClick={() => setRadiusKm(n)}
                    className={`h-8 rounded-full px-3 text-xs font-semibold transition-all ${
                      radiusKm === n
                        ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-md shadow-teal-500/25"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {n}km
                  </Button>
                ))}
              </div>
            </motion.div>

            {/* Popular Searches */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.5 }}
              className="mt-8"
            >
              <div className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider">Popular searches</div>
              <div className="flex flex-wrap gap-2">
                {POPULAR_SEARCHES.map((s, idx) => (
                  <motion.button
                    key={s.label}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1 + idx * 0.05, duration: 0.3 }}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setQuery(s.query);
                      runSmartSearch({ q: s.query });
                    }}
                    className="group flex items-center gap-2 rounded-full bg-white border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-teal-300 hover:bg-gradient-to-r hover:from-teal-50 hover:to-emerald-50 hover:shadow-md hover:shadow-teal-500/10"
                  >
                    <span className="text-lg group-hover:scale-110 transition-transform">{s.icon}</span>
                    {s.label}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.5 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="flex flex-col items-center gap-2 text-slate-400"
            >
              <span className="text-xs font-medium">Scroll to explore</span>
              <ChevronRight className="h-5 w-5 rotate-90" />
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* Trust Bar */}
      <section data-testid="home-trust-bar" className="relative bg-slate-900 py-5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-teal-900/20 via-transparent to-emerald-900/20" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative mx-auto max-w-6xl px-4 sm:px-6"
        >
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
            {[
              { icon: Ban, text: "No advertisements", color: "text-rose-400" },
              { icon: Shield, text: "No paid rankings", color: "text-amber-400" },
              { icon: Users, text: "Free surgeon profiles", color: "text-emerald-400" },
              { icon: Heart, text: "Patient-first platform", color: "text-teal-400" },
            ].map((item, idx) => (
              <motion.div
                key={item.text}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-center gap-2 text-sm text-slate-300"
              >
                <item.icon className={`h-4 w-4 ${item.color}`} />
                <span>{item.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Search Results (conditional) */}
      {hasSearched && (
        <section data-testid="home-results" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              {error}
            </motion.div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="relative">
                <div className="h-12 w-12 rounded-full border-4 border-teal-200" />
                <div className="absolute top-0 left-0 h-12 w-12 rounded-full border-4 border-teal-500 border-t-transparent animate-spin" />
              </div>
              <span className="ml-4 text-slate-600 font-medium">Searching...</span>
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-4">
                  {results.length} Surgeon{results.length !== 1 ? "s" : ""} Found
                </h2>
                <ResultsList results={results} activeSlug={activeSlug} onHover={(slug) => setActiveSlug(slug)} />
              </div>
              <div className="lg:sticky lg:top-24">
                <div className="text-sm font-semibold text-slate-600 mb-3">Map View</div>
                <ResultsMap results={results} activeSlug={activeSlug} onMarkerHover={(slug) => setActiveSlug(slug)} />
              </div>
            </div>
          )}
        </section>
      )}

      {/* Stats Section */}
      <AnimatedSection className="py-16 bg-gradient-to-b from-white to-slate-50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((stat, idx) => (
              <motion.div
                key={stat.label}
                variants={scaleIn}
                whileHover={{ scale: 1.05, y: -5 }}
                className="relative group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-emerald-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative bg-white rounded-2xl border border-slate-200 p-6 text-center shadow-sm group-hover:shadow-xl group-hover:border-teal-200 transition-all duration-300">
                  <div className="text-4xl mb-2">{stat.icon}</div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">{stat.value}</div>
                  <div className="text-sm text-slate-600 mt-1">{stat.label}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* Section 2: Know Your Condition - With GLOW effects */}
      <section data-testid="home-conditions" className="relative py-20 sm:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl" />
        </div>

        <AnimatedSection className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div variants={fadeInUp} className="text-center mb-12">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur border border-white/20 px-4 py-2 mb-6">
              <Stethoscope className="h-4 w-4 text-teal-400" />
              <span className="text-sm font-medium text-white/90">Patient Education Library</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
              Know Your{" "}
              <span className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
                Condition
              </span>
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-slate-400">
              Learn about orthopaedic conditions in simple, patient-friendly language
            </p>
          </motion.div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {CONDITION_CATEGORIES.map((cat, idx) => (
              <motion.div
                key={cat.title}
                variants={fadeInUp}
                whileHover={{ scale: 1.03, y: -8 }}
                className="group relative"
              >
                {/* Glow effect */}
                <div className={`absolute -inset-1 bg-gradient-to-r ${cat.gradient} rounded-3xl blur-lg opacity-0 group-hover:opacity-50 transition-all duration-500`} />
                
                <Link
                  to={cat.link}
                  className={`relative flex flex-col h-full rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-6 transition-all duration-300 group-hover:bg-white/10 group-hover:border-white/20 ${cat.glow} hover:shadow-2xl`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <motion.span
                      className="text-5xl"
                      whileHover={{ rotate: [0, -10, 10, 0], scale: 1.2 }}
                      transition={{ duration: 0.5 }}
                    >
                      {cat.icon}
                    </motion.span>
                    <ChevronRight className="h-6 w-6 text-white/30 group-hover:text-white/70 group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{cat.title}</h3>
                  <p className="text-sm text-slate-400 flex-grow">{cat.description}</p>
                  <div className={`mt-4 inline-flex items-center gap-1 text-sm font-medium bg-gradient-to-r ${cat.gradient} bg-clip-text text-transparent`}>
                    Explore topics
                    <ChevronRight className="h-4 w-4 text-teal-400" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          <motion.div variants={fadeInUp} className="mt-10 text-center">
            <Link
              to="/education"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition-all hover:shadow-xl hover:shadow-teal-500/40 hover:scale-105"
            >
              <Sparkles className="h-4 w-4" />
              Browse All 700+ Topics
              <ChevronRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </AnimatedSection>
      </section>

      {/* Section 3: Red Flags */}
      <AnimatedSection className="py-20 bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div variants={fadeInUp} className="flex items-center gap-4 mb-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/25">
              <AlertTriangle className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Red Flags</h2>
              <p className="text-slate-600">When to seek urgent care immediately</p>
            </div>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2">
            {RED_FLAGS.map((flag, idx) => (
              <motion.div
                key={idx}
                variants={fadeInUp}
                whileHover={{ scale: 1.02, x: 5 }}
                className="group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-rose-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-start gap-4 rounded-2xl border border-red-100 bg-white p-5 shadow-sm group-hover:shadow-lg group-hover:border-red-200 transition-all">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-100 to-rose-100 text-2xl group-hover:scale-110 transition-transform">
                    {flag.icon}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{flag.symptom}</div>
                    <div className="mt-1 text-sm font-medium text-red-600 flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      {flag.action}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* Section 4: Non-surgical Care */}
      <AnimatedSection className="py-20 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div variants={fadeInUp} className="flex items-center gap-4 mb-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg shadow-teal-500/25">
              <Heart className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Non-Surgical Care</h2>
              <p className="text-slate-600">Rehabilitation and conservative treatment options</p>
            </div>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { icon: "🏃", title: "Physiotherapy", desc: "Exercises and manual therapy to restore movement", gradient: "from-blue-500 to-indigo-500" },
              { icon: "🦾", title: "Bracing & Supports", desc: "Knee braces, back supports, and orthotics", gradient: "from-violet-500 to-purple-500" },
              { icon: "💊", title: "Pain Management", desc: "Medications, injections, and alternative therapies", gradient: "from-amber-500 to-orange-500" },
            ].map((item, idx) => (
              <motion.div
                key={item.title}
                variants={fadeInUp}
                whileHover={{ y: -10, scale: 1.02 }}
                className="group relative"
              >
                <div className={`absolute -inset-1 bg-gradient-to-r ${item.gradient} rounded-3xl blur-lg opacity-0 group-hover:opacity-30 transition-all duration-500`} />
                <div className="relative h-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm group-hover:shadow-xl group-hover:border-slate-300 transition-all duration-300">
                  <motion.div
                    className="text-5xl mb-4"
                    whileHover={{ scale: 1.2, rotate: [0, -5, 5, 0] }}
                    transition={{ duration: 0.4 }}
                  >
                    {item.icon}
                  </motion.div>
                  <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div variants={fadeInUp} className="mt-10 rounded-2xl bg-gradient-to-r from-slate-50 to-teal-50 border border-slate-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="font-bold text-slate-900">Need rehabilitation products?</h3>
                <p className="mt-1 text-sm text-slate-600">Visit our partner store for quality orthopaedic equipment.</p>
              </div>
              <a
                href="https://agileortho.shop"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:shadow-md hover:border-slate-300"
              >
                <Award className="h-4 w-4 text-teal-600" />
                Agile Ortho Shop
                <ChevronRight className="h-4 w-4" />
              </a>
            </div>
          </motion.div>
        </div>
      </AnimatedSection>

      {/* CTA Section */}
      <section data-testid="home-cta" className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900" />
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-teal-500/20 via-transparent to-transparent" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative mx-auto max-w-4xl px-4 text-center sm:px-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 shadow-lg shadow-teal-500/40 mb-8"
          >
            <Activity className="h-10 w-10 text-white" />
          </motion.div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
            Are you an{" "}
            <span className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
              Orthopaedic Surgeon?
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-400">
            Join OrthoConnect for free. Create your professional profile and help patients find ethical care.
          </p>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="mt-8"
          >
            <Link
              to="/join"
              data-testid="home-cta-join"
              className="inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 px-10 py-5 text-lg font-semibold text-white shadow-2xl shadow-teal-500/30 transition-all hover:shadow-teal-500/50"
            >
              <Sparkles className="h-5 w-5" />
              Create Your Free Profile
              <ChevronRight className="h-5 w-5" />
            </Link>
          </motion.div>
        </motion.div>
      </section>
    </main>
  );
}
