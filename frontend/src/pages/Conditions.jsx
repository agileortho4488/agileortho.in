import { Link } from "react-router-dom";
import { CONDITION_PAGES, SUBSPECIALTIES } from "@/lib/constants";

export default function Conditions() {
  return (
    <main data-testid="conditions-page" className="bg-white">
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1
          data-testid="conditions-title"
          className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl"
        >
          Orthopaedic Conditions
        </h1>
        <p
          data-testid="conditions-subtitle"
          className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600"
        >
          Simple, patient-friendly explanations. If you have a pincode, you can
          search for an appropriate subspecialist after reading.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {CONDITION_PAGES.map((c) => (
            <Link
              data-testid={`conditions-card-${c.slug}`}
              key={c.slug}
              to={`/conditions/${c.slug}`}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:border-sky-200 hover:shadow-md transition-[box-shadow,border-color]"
            >
              <div className="text-sm font-semibold text-slate-900">{c.title}</div>
              <div className="mt-1 text-xs font-medium text-sky-700">
                Category: {c.category}
              </div>
              <div className="mt-3 text-sm leading-relaxed text-slate-600">
                {c.summary}
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-slate-200 bg-slate-50 p-6">
          <div
            data-testid="conditions-sub-specialty-title"
            className="text-sm font-semibold text-slate-900"
          >
            Find surgeons by subspecialty
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {SUBSPECIALTIES.map((s) => (
              <Link
                data-testid={`conditions-subspecialty-chip-${s.toLowerCase()}`}
                key={s}
                to={`/?sub=${encodeURIComponent(s)}`}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:border-sky-200 hover:bg-white transition-[border-color,background-color]"
              >
                {s}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
