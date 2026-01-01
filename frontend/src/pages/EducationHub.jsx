import { Link } from "react-router-dom";
import { BookOpen, ChevronRight, AlertCircle } from "lucide-react";
import { EDUCATION_CATEGORIES } from "@/lib/educationTopics";

const CATEGORY_ICONS = {
  "knee-sports": "🦵",
  "shoulder-elbow": "💪",
  "spine": "🦴",
  "hand-wrist": "✋",
  "foot-ankle": "🦶",
  "trauma": "🩹",
  "pediatric": "👶",
  "recon-arthroplasty": "🦿",
  "basic-science": "🔬",
  "pathology": "🧬",
  "anatomy": "📚",
};

export default function EducationHub() {
  return (
    <main data-testid="education-hub-page" className="min-h-screen bg-slate-50">
      {/* Header */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1
                data-testid="education-hub-title"
                className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl"
              >
                Patient Education Library
              </h1>
            </div>
          </div>
          <p
            data-testid="education-hub-subtitle"
            className="max-w-3xl text-sm text-slate-600 sm:text-base"
          >
            Learn about orthopaedic conditions in simple, patient-friendly language.
            Browse by category to find information about symptoms, causes, and treatment options.
          </p>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {EDUCATION_CATEGORIES.map((c) => (
            <Link
              data-testid={`education-category-card-${c.key}`}
              key={c.key}
              to={`/education/${c.key}`}
              className="group rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-slate-300 hover:shadow-lg"
            >
              <div className="flex items-start justify-between">
                <span className="text-3xl">{CATEGORY_ICONS[c.key] || "📖"}</span>
                <ChevronRight className="h-5 w-5 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-teal-600" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">
                {c.title}
              </h2>
              <p className="mt-2 text-sm text-slate-600 line-clamp-2">
                {c.description}
              </p>
              <div className="mt-4 flex items-center gap-1 text-sm font-medium text-teal-700 group-hover:text-teal-800">
                Explore topics
                <ChevronRight className="h-4 w-4" />
              </div>
            </Link>
          ))}
        </div>

        {/* Disclaimer */}
        <div
          data-testid="education-hub-disclaimer"
          className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-5"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <h3 className="text-sm font-semibold text-amber-900">Educational Content Only</h3>
              <p className="mt-1 text-sm text-amber-800">
                This information is for educational purposes only and does not replace professional medical consultation.
                OrthoConnect does not recommend or rank any healthcare providers.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
