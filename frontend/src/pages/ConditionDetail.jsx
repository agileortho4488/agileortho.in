import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import SmartSearchBar from "@/components/search/SmartSearchBar";
import { CONDITIONS_BY_CATEGORY } from "@/lib/conditions";

function Section({ title, children, testId }) {
  return (
    <section data-testid={testId} className="rounded-3xl border border-slate-200 bg-white p-6">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-2 text-sm leading-relaxed text-slate-600">{children}</div>
    </section>
  );
}

export default function ConditionDetail() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const location = searchParams.get("location") || "";

  const page = useMemo(() => {
    const all = Object.values(CONDITIONS_BY_CATEGORY).flat();
    return all.find((c) => c.slug === slug) || null;
  }, [slug]);

  if (!page) {
    return (
      <main data-testid="condition-not-found" className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="text-sm text-slate-600">Condition not found.</div>
      </main>
    );
  }

  return (
    <main data-testid="condition-detail-page" className="bg-white">
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1
          data-testid="condition-title"
          className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl"
        >
          {page.title}
        </h1>
        <p
          data-testid="condition-summary"
          className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600"
        >
          {page.summary}
        </p>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <Section testId="condition-what" title="What it is">
            A simplified explanation of the condition in everyday language.
          </Section>
          <Section testId="condition-symptoms" title="Common symptoms">
            Pain, stiffness, swelling, reduced movement, or weakness depending on
            the condition.
          </Section>
          <Section testId="condition-causes" title="Why it happens">
            Often a combination of overuse, age-related wear, injury, posture,
            activity level, and sometimes inflammation.
          </Section>
          <Section testId="condition-when" title="When to consult an orthopaedic surgeon">
            If symptoms last more than 2–3 weeks, worsen, affect sleep, or follow
            a significant injury.
          </Section>
          <Section testId="condition-treatment" title="Treatment options">
            Usually starts with non-surgical care (rest, physiotherapy, activity
            changes). Surgery is considered if symptoms persist or function is
            limited.
          </Section>
          <Section testId="condition-recovery" title="Recovery expectations">
            Recovery depends on severity and treatment. Many patients improve with
            structured rehab and lifestyle adjustments.
          </Section>
        </div>

        <div className="mt-8 rounded-3xl border border-amber-200 bg-amber-50 p-6">
          <div
            data-testid="condition-disclaimer-title"
            className="text-sm font-semibold text-amber-900"
          >
            Medical disclaimer
          </div>
          <div
            data-testid="condition-disclaimer-body"
            className="mt-2 text-sm leading-relaxed text-amber-900/80"
          >
            This page is for education only and does not replace a consultation.
            OrthoConnect does not recommend or rank doctors.
          </div>
        </div>

        <div className="mt-10">
          <div
            data-testid="condition-search-title"
            className="text-sm font-semibold text-slate-900"
          >
            Find a surgeon near you
          </div>
          <div className="mt-3">
            <SmartSearchBar
              initialQuery={location ? `${page.title} near ${location}` : `${page.title} near `}
              onSearch={({ q }) => {
                window.location.href = `/?q=${encodeURIComponent(q)}`;
              }}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
