import { Link, useParams } from "react-router-dom";
import { CONDITION_CATEGORIES, CONDITIONS_BY_CATEGORY } from "@/lib/conditions";

export default function ConditionCategory() {
  const { categoryKey } = useParams();
  const cat = CONDITION_CATEGORIES.find((c) => c.key === categoryKey);
  const items = CONDITIONS_BY_CATEGORY[categoryKey] || [];

  if (!cat) {
    return (
      <main
        data-testid="condition-category-not-found"
        className="mx-auto max-w-6xl px-4 py-10 sm:px-6"
      >
        <div className="text-sm text-slate-600">Category not found.</div>
      </main>
    );
  }

  return (
    <main data-testid="condition-category-page" className="bg-white">
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6">
          <div className="absolute inset-0">
            <img
              data-testid="condition-category-hero-image"
              src={cat.image}
              alt=""
              className="h-full w-full object-cover opacity-[0.12]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/80 to-white/40" />
          </div>
          <div className="relative">
            <h1
              data-testid="condition-category-title"
              className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl"
            >
              {cat.title}
            </h1>
            <p
              data-testid="condition-category-subtitle"
              className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600"
            >
              Select a condition to read a simple explanation, symptoms, when to
              consult, and treatment options.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {items.map((i) => (
            <Link
              data-testid={`condition-tile-${i.slug}`}
              key={i.slug}
              to={`/conditions/${i.slug}`}
              className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-[box-shadow,border-color] hover:border-sky-200 hover:shadow-md"
            >
              <div className="absolute inset-0">
                <img
                  data-testid={`condition-tile-image-${i.slug}`}
                  src={i.image}
                  alt=""
                  className="h-full w-full object-cover opacity-[0.18] transition-[opacity] group-hover:opacity-[0.22]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/70 to-white/20" />
              </div>
              <div className="relative">
                <div className="text-base font-semibold text-slate-900">
                  {i.title}
                </div>
                <div className="mt-2 text-sm text-slate-600">{i.summary}</div>
                <div className="mt-4 text-sm font-medium text-sky-700 transition-colors group-hover:text-sky-800">
                  Read →
                </div>
              </div>
            </Link>
          ))}

          {!items.length ? (
            <div
              data-testid="condition-category-empty"
              className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-600"
            >
              Conditions will be added here.
            </div>
          ) : null}
        </div>

        <div
          data-testid="condition-category-search-hint"
          className="mt-10 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600"
        >
          You can return to the Home page and type: “{cat.title.toLowerCase()} specialist near <your pincode>”.
        </div>
      </section>
    </main>
  );
}
