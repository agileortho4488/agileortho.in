import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import SearchConsole from "@/components/search/SearchConsole";
import ResultsList from "@/components/search/ResultsList";
import ResultsMap from "@/components/search/ResultsMap";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api";
import { SUBSPECIALTIES } from "@/lib/constants";

export default function Home() {
  const api = useMemo(() => apiClient(), []);
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState({ location: "", subspecialty: "" });
  const [radiusKm, setRadiusKm] = useState(10);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [activeSlug, setActiveSlug] = useState(null);

  useEffect(() => {
    const loc = searchParams.get("location") || "";
    const sub = searchParams.get("sub") || "";
    if (loc.trim()) {
      runSearch({ location: loc, subspecialty: sub });
    } else if (sub.trim()) {
      setQuery((q) => ({ ...q, subspecialty: sub }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  async function runSearch(next) {
    setLoading(true);
    setError("");
    setQuery(next);
    try {
      const res = await api.get("/surgeons/search", {
        params: {
          location: next.location,
          radius_km: radiusKm,
          subspecialty: next.subspecialty || undefined,
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

  const categories = useMemo(() => {
    return SUBSPECIALTIES.map((s) => ({
      label: s,
      value: s,
      description: `Find ${s.toLowerCase()} specialists near you`,
    }));
  }, []);

  return (
    <main data-testid="home-page" className="bg-white">
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-10 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div>
            <h1
              data-testid="home-hero-title"
              className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl"
            >
              Find Trusted Orthopaedic Care Near You
            </h1>
            <p
              data-testid="home-hero-subtext"
              className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 md:text-lg"
            >
              Read about orthopaedic conditions and locate qualified surgeons in
              your area — without ads, rankings, or paid listings.
            </p>

            <div className="mt-7">
              <SearchConsole
                initialLocation={query.location}
                initialSubspecialty={query.subspecialty}
                onSearch={(v) => runSearch(v)}
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <div
                  data-testid="home-radius-info"
                  className="text-xs text-slate-500"
                >
                  Radius: {radiusKm} km (pincode-based)
                </div>
                <div className="flex gap-2">
                  {[5, 10, 25].map((n) => (
                    <Button
                      data-testid={`home-radius-${n}-button`}
                      key={n}
                      variant={radiusKm === n ? "default" : "secondary"}
                      onClick={() => setRadiusKm(n)}
                      className={
                        radiusKm === n
                          ? "h-8 rounded-full bg-slate-900 px-3 text-xs text-white hover:bg-slate-800"
                          : "h-8 rounded-full bg-slate-100 px-3 text-xs text-slate-700 hover:bg-slate-200"
                      }
                    >
                      {n}km
                    </Button>
                  ))}
                </div>
              </div>

              {error ? (
                <div
                  data-testid="home-search-error"
                  className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
                >
                  {error}
                </div>
              ) : null}

              {loading ? (
                <div
                  data-testid="home-search-loading"
                  className="mt-3 text-sm text-slate-600"
                >
                  Searching…
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-sky-50 via-white to-teal-50 p-6">
            <div
              data-testid="home-ethics-card-title"
              className="text-sm font-semibold text-slate-900"
            >
              Ethical discovery — built for patients
            </div>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li data-testid="home-ethics-line-1">No advertisements.</li>
              <li data-testid="home-ethics-line-2">No paid listings.</li>
              <li data-testid="home-ethics-line-3">No doctor ranking.</li>
              <li data-testid="home-ethics-line-4">No appointment booking.</li>
            </ul>
            <a
              data-testid="home-rehab-products-link"
              href="https://agileortho.shop"
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex text-sm font-medium text-sky-700 hover:text-sky-800 transition-colors"
            >
              Rehabilitation & Support Products →
            </a>
          </div>
        </div>

        <div className="mt-10">
          <div
            data-testid="home-category-title"
            className="text-sm font-semibold text-slate-900"
          >
            Find by subspecialty
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                data-testid={`home-category-chip-${c.value.toLowerCase()}`}
                key={c.value}
                type="button"
                onClick={() => {
                  if (!query.location.trim()) {
                    setQuery((q) => ({ ...q, subspecialty: c.value }));
                    return;
                  }
                  runSearch({ location: query.location, subspecialty: c.value });
                }}
                className={[
                  "rounded-full border px-4 py-2 text-sm",
                  "border-slate-200 bg-white text-slate-700",
                  "hover:border-sky-200 hover:bg-sky-50 hover:text-slate-900",
                  "transition-[background-color,border-color,color]",
                ].join(" ")}
              >
                <div className="font-medium">{c.label}</div>
              </button>
            ))}
          </div>
          <div
            data-testid="home-category-helper"
            className="mt-2 text-xs text-slate-500"
          >
            Tip: enter your pincode first, then tap a category to auto-apply the
            filter.
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div>
            <div
              data-testid="home-results-title"
              className="text-sm font-semibold text-slate-900"
            >
              Search Results
            </div>
            <div className="mt-3">
              <ResultsList
                results={results}
                activeSlug={activeSlug}
                onHover={(slug) => setActiveSlug(slug)}
              />
            </div>
          </div>
          <div>
            <div
              data-testid="home-map-title"
              className="text-sm font-semibold text-slate-900"
            >
              Map View
            </div>
            <div className="mt-3">
              <ResultsMap
                results={results}
                activeSlug={activeSlug}
                onMarkerHover={(slug) => setActiveSlug(slug)}
              />
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {[
            {
              title: "When to see a doctor",
              body: "Pain that limits daily activity, night pain, swelling, or pain after a fall should be evaluated.",
            },
            {
              title: "Non-surgical care",
              body: "Many conditions improve with physiotherapy, activity changes, weight management, and guided medicines.",
            },
            {
              title: "Red flags",
              body: "Severe trauma, sudden weakness, fever with joint pain, or loss of bladder/bowel control need urgent care.",
            },
          ].map((b) => (
            <div
              data-testid={`home-education-block-${b.title
                .toLowerCase()
                .replaceAll(" ", "-")}`}
              key={b.title}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <div className="text-sm font-semibold text-slate-900">{b.title}</div>
              <div className="mt-2 text-sm leading-relaxed text-slate-600">{b.body}</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
