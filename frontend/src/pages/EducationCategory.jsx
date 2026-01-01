import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Search, ChevronRight, ArrowLeft } from "lucide-react";
import {
  EDUCATION_TOPICS_BY_CATEGORY,
  categoryKeyToTitle,
  topicToSlug,
} from "@/lib/educationTopics";
import { Input } from "@/components/ui/input";

export default function EducationCategory() {
  const { categoryKey } = useParams();
  const [q, setQ] = useState("");

  const title = categoryKeyToTitle(categoryKey);

  const topics = useMemo(() => {
    const list = EDUCATION_TOPICS_BY_CATEGORY[categoryKey] || [];
    const term = q.trim().toLowerCase();
    if (!term) return list;
    return list.filter((t) => t.toLowerCase().includes(term));
  }, [categoryKey, q]);

  return (
    <main data-testid="education-category-page" className="min-h-screen bg-slate-50">
      {/* Header */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-slate-500 mb-4">
            <Link
              to="/education"
              className="hover:text-slate-900 transition-colors"
            >
              Education
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-slate-900 font-medium">{title}</span>
          </nav>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1
                data-testid="education-category-title"
                className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl"
              >
                {title}
              </h1>
              <p
                data-testid="education-category-subtitle"
                className="mt-2 max-w-2xl text-sm text-slate-600"
              >
                Select a topic to learn more about symptoms, causes, and treatment options.
              </p>
            </div>

            {/* Search */}
            <div className="w-full max-w-sm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  data-testid="education-topic-filter"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search topics..."
                  className="h-11 w-full rounded-xl border-slate-200 bg-slate-50 pl-10 focus-visible:ring-teal-500"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Topics Grid */}
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-4 text-sm text-slate-500">
          {topics.length} topic{topics.length !== 1 ? "s" : ""} found
        </div>

        {topics.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((t) => (
              <Link
                data-testid={`education-topic-link-${topicToSlug(t)}`}
                key={t}
                to={`/education/${categoryKey}/${topicToSlug(t)}`}
                className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-teal-200 hover:shadow-md"
              >
                <span className="font-medium text-slate-800 group-hover:text-teal-700 transition-colors">
                  {t}
                </span>
                <ChevronRight className="h-5 w-5 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-teal-500" />
              </Link>
            ))}
          </div>
        ) : (
          <div
            data-testid="education-topic-empty"
            className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"
          >
            <div className="text-3xl mb-3">🔍</div>
            <div className="text-sm font-medium text-slate-900">No topics found</div>
            <p className="mt-1 text-sm text-slate-500">
              Try a different search term
            </p>
          </div>
        )}

        {/* Back Link */}
        <div className="mt-8">
          <Link
            to="/education"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to all categories
          </Link>
        </div>
      </section>
    </main>
  );
}
