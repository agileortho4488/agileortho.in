import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

export default function ResultsList({ results, activeSlug, onHover }) {
  if (!results?.length) {
    return (
      <div
        data-testid="search-empty-state"
        className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-600"
      >
        No surgeons found for this search. Try a nearby pincode or remove the
        subspecialty filter.
      </div>
    );
  }

  return (
    <div data-testid="search-results-list" className="space-y-3">
      {results.map((r) => (
        <Link
          data-testid={`search-result-card-${r.slug}`}
          key={r.id}
          to={`/doctor/${r.slug}`}
          onMouseEnter={() => onHover?.(r.slug)}
          onMouseLeave={() => onHover?.(null)}
          className={[
            "block rounded-2xl border bg-white p-4 shadow-sm",
            "hover:border-sky-200 hover:shadow-md transition-[box-shadow,border-color]",
            activeSlug === r.slug ? "border-sky-300" : "border-slate-200",
          ].join(" ")}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div
                data-testid={`search-result-name-${r.slug}`}
                className="text-sm font-semibold text-slate-900"
              >
                {r.name}
              </div>
              <div
                data-testid={`search-result-qualifications-${r.slug}`}
                className="mt-1 text-xs text-slate-600"
              >
                {r.qualifications}
              </div>
              <div
                data-testid={`search-result-location-${r.slug}`}
                className="mt-2 text-xs text-slate-500"
              >
                {(r.clinic?.city || "").trim() ? `${r.clinic.city} · ` : ""}
                {r.clinic?.pincode}
              </div>
            </div>
            <div className="text-right">
              {typeof r.distance_km === "number" ? (
                <div
                  data-testid={`search-result-distance-${r.slug}`}
                  className="text-xs font-medium text-slate-700"
                >
                  {r.distance_km} km
                </div>
              ) : (
                <div
                  data-testid={`search-result-distance-${r.slug}`}
                  className="text-xs text-slate-400"
                >
                  —
                </div>
              )}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(r.subspecialties || []).slice(0, 4).map((s) => (
              <Badge
                data-testid={`search-result-subspecialty-${r.slug}-${s.toLowerCase()}`}
                key={s}
                className="rounded-full bg-slate-100 text-slate-700 hover:bg-slate-100"
              >
                {s}
              </Badge>
            ))}
          </div>
        </Link>
      ))}
    </div>
  );
}
