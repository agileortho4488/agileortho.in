import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { MapPin, Search, AlertTriangle, Heart, Stethoscope, ChevronRight, Shield, Ban, Users, Award } from "lucide-react";

import SmartSearchBar from "@/components/search/SmartSearchBar";
import ResultsList from "@/components/search/ResultsList";
import ResultsMap from "@/components/search/ResultsMap";

import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api";

const POPULAR_SEARCHES = [
  { label: "Knee Pain", query: "knee surgeon" },
  { label: "Shoulder Injury", query: "shoulder specialist" },
  { label: "Spine Problems", query: "spine surgeon" },
  { label: "Sports Injury", query: "sports medicine" },
  { label: "Joint Replacement", query: "joint replacement surgeon" },
  { label: "Fracture Care", query: "trauma surgeon" },
];

const CONDITION_CATEGORIES = [
  {
    title: "Knee & Sports",
    description: "ACL tears, meniscus injuries, arthritis, and sports-related conditions",
    icon: "🦵",
    link: "/education/knee-sports",
    topics: ["ACL Injury", "Meniscus Tear", "Knee Arthritis", "Runner's Knee"],
  },
  {
    title: "Spine & Back",
    description: "Disc problems, sciatica, spinal stenosis, and back pain conditions",
    icon: "🦴",
    link: "/education/spine",
    topics: ["Herniated Disc", "Sciatica", "Scoliosis", "Spinal Stenosis"],
  },
  {
    title: "Shoulder & Elbow",
    description: "Rotator cuff, frozen shoulder, tennis elbow, and arm conditions",
    icon: "💪",
    link: "/education/shoulder-elbow",
    topics: ["Rotator Cuff Tear", "Frozen Shoulder", "Tennis Elbow", "Shoulder Dislocation"],
  },
  {
    title: "Hand & Wrist",
    description: "Carpal tunnel, trigger finger, fractures, and hand conditions",
    icon: "✋",
    link: "/education/hand-wrist",
    topics: ["Carpal Tunnel", "Trigger Finger", "Wrist Fracture", "Arthritis"],
  },
  {
    title: "Hip & Pelvis",
    description: "Hip arthritis, AVN, hip replacement, and pelvic conditions",
    icon: "🦿",
    link: "/education/recon-arthroplasty",
    topics: ["Hip Arthritis", "Hip Replacement", "AVN", "Hip Fracture"],
  },
  {
    title: "Pediatric Ortho",
    description: "Children's bone and joint conditions, growth disorders",
    icon: "👶",
    link: "/education/pediatric",
    topics: ["Club Foot", "Scoliosis in Children", "Growing Pains", "Fractures"],
  },
];

const RED_FLAGS = [
  { symptom: "Sudden severe pain with deformity", action: "Visit ER immediately" },
  { symptom: "Inability to bear weight after injury", action: "Seek urgent care" },
  { symptom: "Numbness or tingling in limbs", action: "Consult within 24 hours" },
  { symptom: "Joint locked in position", action: "Seek urgent evaluation" },
];

export default function Home() {
  const api = useMemo(() => apiClient(), []);
  const [searchParams] = useSearchParams();

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
        params: {
          q: next.q,
          radius_km: radiusKm,
        },
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
    <main data-testid="home-page" className="bg-white">
      {/* Hero Section */}
      <section
        data-testid="home-hero"
        className="relative border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white"
      >
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-teal-50 blur-3xl opacity-60" />
          <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-slate-100 blur-3xl opacity-60" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
          <div className="text-center">
            <h1
              data-testid="home-hero-title"
              className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl"
            >
              Find Trusted Orthopaedic
              <br />
              <span className="text-teal-600">Care Near You</span>
            </h1>
            <p
              data-testid="home-hero-subtext"
              className="mx-auto mt-5 max-w-2xl text-base text-slate-600 sm:text-lg"
            >
              Search like you would on Google. We&apos;ll match you with verified surgeons in your area.
              <span className="font-medium text-slate-900"> No ads. No rankings. No paid listings.</span>
            </p>
          </div>

          {/* Search Bar */}
          <div className="mx-auto mt-10 max-w-3xl">
            <SmartSearchBar
              value={query}
              onChange={(v) => setQuery(v)}
              onSearch={(v) => {
                setQuery(v.q);
                runSmartSearch(v);
              }}
            />

            {/* Near Me + Radius Controls */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <Button
                data-testid="home-near-me-button"
                variant="outline"
                onClick={handleNearMe}
                disabled={gettingLocation}
                className="h-10 rounded-full border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
              >
                <MapPin className="mr-2 h-4 w-4 text-teal-600" />
                {gettingLocation ? "Getting location..." : "Near me"}
              </Button>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Radius:</span>
                {[5, 10, 25, 50].map((n) => (
                  <Button
                    data-testid={`home-radius-${n}-button`}
                    key={n}
                    variant="ghost"
                    onClick={() => setRadiusKm(n)}
                    className={`h-8 rounded-full px-3 text-xs font-medium transition-all ${
                      radiusKm === n
                        ? "bg-slate-900 text-white hover:bg-slate-800"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {n}km
                  </Button>
                ))}
              </div>
            </div>

            {/* Popular Searches */}
            <div className="mt-6">
              <div className="text-xs font-medium text-slate-500 mb-2">Popular searches:</div>
              <div className="flex flex-wrap gap-2">
                {POPULAR_SEARCHES.map((s) => (
                  <button
                    key={s.label}
                    data-testid={`home-popular-${s.label.toLowerCase().replace(/\s+/g, "-")}`}
                    onClick={() => {
                      setQuery(s.query);
                      runSmartSearch({ q: s.query });
                    }}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition-all hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section data-testid="home-trust-bar" className="border-b border-slate-100 bg-slate-900 py-4">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-300 sm:gap-10">
            <div className="flex items-center gap-2">
              <Ban className="h-4 w-4 text-teal-400" />
              <span>No advertisements</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-teal-400" />
              <span>No paid rankings</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-teal-400" />
              <span>Free surgeon profiles</span>
            </div>
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-teal-400" />
              <span>Patient-first platform</span>
            </div>
          </div>
        </div>
      </section>

      {/* Search Results (conditional) */}
      {hasSearched && (
        <section
          data-testid="home-results"
          className="mx-auto max-w-6xl px-4 py-12 sm:px-6"
        >
          {error && (
            <div
              data-testid="home-search-error"
              className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              {error}
            </div>
          )}

          {loading ? (
            <div
              data-testid="home-search-loading"
              className="flex items-center justify-center py-12 text-slate-500"
            >
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-teal-600" />
              <span className="ml-3">Searching...</span>
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {results.length} Surgeon{results.length !== 1 ? "s" : ""} Found
                  </h2>
                </div>
                <ResultsList
                  results={results}
                  activeSlug={activeSlug}
                  onHover={(slug) => setActiveSlug(slug)}
                />
              </div>
              <div className="lg:sticky lg:top-24">
                <div className="text-sm font-medium text-slate-500 mb-3">Map View</div>
                <ResultsMap
                  results={results}
                  activeSlug={activeSlug}
                  onMarkerHover={(slug) => setActiveSlug(slug)}
                />
              </div>
            </div>
          )}
        </section>
      )}

      {/* Section 1: Find a Surgeon */}
      <section data-testid="home-find-surgeon" className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50">
              <Search className="h-5 w-5 text-teal-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Find a Surgeon</h2>
          </div>
          <p className="max-w-2xl text-slate-600 mb-8">
            Search by condition, location, or specialty. We show contact details only — no booking, no lead selling.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {["Knee Specialist", "Spine Surgeon", "Shoulder Expert", "Hand Surgeon", "Hip Specialist", "Pediatric Ortho"].map((specialty) => (
              <Link
                key={specialty}
                to={`/?q=${encodeURIComponent(specialty.toLowerCase())}`}
                className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-teal-300 hover:shadow-md"
              >
                <span className="font-medium text-slate-800">{specialty}</span>
                <ChevronRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-teal-600" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Section 2: Know Your Condition */}
      <section data-testid="home-conditions" className="bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900">
              <Stethoscope className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Know Your Condition</h2>
          </div>
          <p className="max-w-2xl text-slate-600 mb-8">
            Learn about orthopaedic conditions in simple language. Understand symptoms, causes, and treatment options.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CONDITION_CATEGORIES.map((cat) => (
              <Link
                key={cat.title}
                to={cat.link}
                data-testid={`home-condition-${cat.title.toLowerCase().replace(/\s+/g, "-")}`}
                className="group rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-slate-300 hover:shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <span className="text-3xl">{cat.icon}</span>
                  <ChevronRight className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-teal-600" />
                </div>
                <h3 className="mt-3 text-lg font-semibold text-slate-900">{cat.title}</h3>
                <p className="mt-1 text-sm text-slate-600 line-clamp-2">{cat.description}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {cat.topics.slice(0, 3).map((topic) => (
                    <span key={topic} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      {topic}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              to="/education"
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              Browse All Conditions
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Section 3: Red Flags */}
      <section data-testid="home-red-flags" className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Red Flags — When to Seek Urgent Care</h2>
          </div>
          <p className="max-w-2xl text-slate-600 mb-8">
            Some symptoms require immediate medical attention. Don't wait if you experience any of these.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            {RED_FLAGS.map((flag, idx) => (
              <div
                key={idx}
                data-testid={`home-red-flag-${idx}`}
                className="flex items-start gap-4 rounded-xl border border-red-100 bg-red-50/50 p-4"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <div className="font-medium text-slate-900">{flag.symptom}</div>
                  <div className="mt-1 text-sm text-red-700 font-medium">{flag.action}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4: Non-surgical Care & Rehab */}
      <section data-testid="home-rehab" className="bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50">
              <Heart className="h-5 w-5 text-teal-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Non-Surgical Care & Rehabilitation</h2>
          </div>
          <p className="max-w-2xl text-slate-600 mb-8">
            Not all orthopaedic problems need surgery. Learn about physiotherapy, bracing, and lifestyle modifications.
          </p>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="text-2xl mb-3">🏃</div>
              <h3 className="font-semibold text-slate-900">Physiotherapy</h3>
              <p className="mt-2 text-sm text-slate-600">
                Exercises and manual therapy to restore movement and reduce pain without surgery.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="text-2xl mb-3">🦾</div>
              <h3 className="font-semibold text-slate-900">Bracing & Supports</h3>
              <p className="mt-2 text-sm text-slate-600">
                Knee braces, back supports, and orthotics to stabilize and protect injured areas.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="text-2xl mb-3">💊</div>
              <h3 className="font-semibold text-slate-900">Pain Management</h3>
              <p className="mt-2 text-sm text-slate-600">
                Medications, injections, and alternative therapies for managing chronic pain.
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="font-semibold text-slate-900">Need rehabilitation products?</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Visit our partner store for quality orthopaedic supports and rehab equipment.
                </p>
              </div>
              <a
                href="https://agileortho.shop"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Award className="h-4 w-4" />
                Agile Ortho Shop
                <ChevronRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section data-testid="home-cta" className="bg-slate-900 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Are you an Orthopaedic Surgeon?</h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-400">
            Join OrthoConnect for free. Create your professional profile and help patients find ethical orthopaedic care.
          </p>
          <Link
            to="/join"
            data-testid="home-cta-join"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-teal-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-teal-700"
          >
            Create Free Profile
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}
