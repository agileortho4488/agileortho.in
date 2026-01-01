import { Link } from "react-router-dom";
import { MapPin, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ResultsList({ results, activeSlug, onHover }) {
  if (!results?.length) {
    return (
      <div
        data-testid="search-empty-state"
        className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center"
      >
        <div className="text-3xl mb-3">🔍</div>
        <div className="text-sm font-medium text-slate-900">No surgeons found</div>
        <p className="mt-1 text-sm text-slate-500">
          Try a different pincode or remove specialty filters
        </p>
      </div>
    );
  }

  return (
    <div data-testid="search-results-list" className="space-y-3">
      {results.map((r) => {
        const city = r.clinic?.city || r.locations?.[0]?.city || "";
        const pincode = r.clinic?.pincode || r.locations?.[0]?.pincode || "";
        
        return (
          <Link
            data-testid={`search-result-card-${r.slug}`}
            key={r.id}
            to={`/doctor/${r.slug}`}
            onMouseEnter={() => onHover?.(r.slug)}
            onMouseLeave={() => onHover?.(null)}
            className={[
              "group flex items-center gap-4 rounded-xl border bg-white p-4 transition-all",
              "hover:border-teal-200 hover:shadow-md",
              activeSlug === r.slug ? "border-teal-300 shadow-md" : "border-slate-200",
            ].join(" ")}
          >
            {/* Avatar */}
            {r.public_photo_url ? (
              <img
                src={`${process.env.REACT_APP_BACKEND_URL}${r.public_photo_url}`}
                alt={r.name}
                className="h-14 w-14 shrink-0 rounded-xl border border-slate-100 object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg font-bold text-slate-400">
                {(r.name || "DR").trim().slice(0, 2).toUpperCase()}
              </div>
            )}

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div
                    data-testid={`search-result-name-${r.slug}`}
                    className="font-semibold text-slate-900 group-hover:text-teal-700 transition-colors"
                  >
                    {r.name}
                  </div>
                  <div
                    data-testid={`search-result-qualifications-${r.slug}`}
                    className="mt-0.5 text-xs text-slate-500 line-clamp-1"
                  >
                    {r.qualifications}
                  </div>
                </div>
                {typeof r.distance_km === "number" && (
                  <div
                    data-testid={`search-result-distance-${r.slug}`}
                    className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                  >
                    {r.distance_km} km
                  </div>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                {(city || pincode) && (
                  <div
                    data-testid={`search-result-location-${r.slug}`}
                    className="flex items-center gap-1 text-xs text-slate-500"
                  >
                    <MapPin className="h-3 w-3" />
                    {city}{city && pincode ? " • " : ""}{pincode}
                  </div>
                )}
              </div>

              {r.subspecialties?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {r.subspecialties.slice(0, 3).map((s) => (
                    <Badge
                      data-testid={`search-result-subspecialty-${r.slug}-${s.toLowerCase().replace(/\s+/g, "-")}`}
                      key={s}
                      className="rounded-full border-0 bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700 hover:bg-teal-50"
                    >
                      {s}
                    </Badge>
                  ))}
                  {r.subspecialties.length > 3 && (
                    <span className="text-xs text-slate-400">
                      +{r.subspecialties.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Arrow */}
            <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-teal-500" />
          </Link>
        );
      })}
    </div>
  );
}
