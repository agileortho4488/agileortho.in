import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, BookOpen, ChevronRight, Stethoscope, Activity, Heart, Clock, ArrowLeft } from "lucide-react";
import SmartSearchBar from "@/components/search/SmartSearchBar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  EDUCATION_TOPICS_BY_CATEGORY,
  categoryKeyToTitle,
  topicToSlug,
} from "@/lib/educationTopics";

export default function EducationTopic() {
  const { categoryKey, topicSlug } = useParams();

  const topic = useMemo(() => {
    const list = EDUCATION_TOPICS_BY_CATEGORY[categoryKey] || [];
    return list.find((t) => topicToSlug(t) === topicSlug) || null;
  }, [categoryKey, topicSlug]);

  if (!topic) {
    return (
      <main
        data-testid="education-topic-not-found"
        className="min-h-screen bg-slate-50"
      >
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="text-center">
            <div className="text-4xl mb-4">📖</div>
            <h1 className="text-xl font-semibold text-slate-900">Topic not found</h1>
            <p className="mt-2 text-sm text-slate-600">
              The topic you're looking for doesn't exist or has been moved.
            </p>
            <Link
              to="/education"
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-teal-700 hover:text-teal-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Education Hub
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const categoryTitle = categoryKeyToTitle(categoryKey);

  return (
    <main data-testid="education-topic-page" className="min-h-screen bg-slate-50">
      {/* Header */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-slate-500 mb-4">
            <Link
              data-testid="education-breadcrumb-home"
              to="/education"
              className="hover:text-slate-900 transition-colors"
            >
              Education
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link
              data-testid="education-breadcrumb-category"
              to={`/education/${categoryKey}`}
              className="hover:text-slate-900 transition-colors"
            >
              {categoryTitle}
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-slate-900 font-medium">{topic}</span>
          </nav>

          <h1
            data-testid="education-topic-title"
            className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl"
          >
            {topic}
          </h1>
          <p
            data-testid="education-topic-intro"
            className="mt-3 max-w-3xl text-sm text-slate-600 sm:text-base"
          >
            A comprehensive patient education guide prepared by orthopaedic specialists.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
          {/* Main Content */}
          <div className="space-y-6">
            {/* Key Takeaways Card */}
            <div
              data-testid="education-topic-takeaways"
              className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="h-5 w-5 text-teal-600" />
                <h2 className="text-lg font-semibold text-teal-900">Key Takeaways</h2>
              </div>
              <ul className="space-y-2 text-sm text-teal-800">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                  Early diagnosis improves treatment outcomes
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                  Many conditions can be managed without surgery
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                  Consult a specialist if symptoms persist beyond 2 weeks
                </li>
              </ul>
            </div>

            {/* Accordion Content */}
            <Accordion
              type="multiple"
              defaultValue={["what-it-is", "symptoms"]}
              className="space-y-3"
            >
              <AccordionItem
                value="what-it-is"
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
              >
                <AccordionTrigger
                  data-testid="education-topic-what-trigger"
                  className="px-6 py-4 text-left hover:no-underline [&[data-state=open]]:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                      <Stethoscope className="h-5 w-5 text-slate-600" />
                    </div>
                    <span className="text-lg font-semibold text-slate-900">What is {topic}?</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent
                  data-testid="education-topic-what-content"
                  className="border-t border-slate-100 px-6 pb-6 pt-4"
                >
                  <div className="prose prose-sm prose-slate max-w-none">
                    <p className="text-slate-600 leading-relaxed">
                      Content will be added by the medical team. This section will explain the condition in simple, patient-friendly language.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="symptoms"
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
              >
                <AccordionTrigger
                  data-testid="education-topic-symptoms-trigger"
                  className="px-6 py-4 text-left hover:no-underline [&[data-state=open]]:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                      <Activity className="h-5 w-5 text-slate-600" />
                    </div>
                    <span className="text-lg font-semibold text-slate-900">Common Symptoms</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent
                  data-testid="education-topic-symptoms-content"
                  className="border-t border-slate-100 px-6 pb-6 pt-4"
                >
                  <div className="prose prose-sm prose-slate max-w-none">
                    <p className="text-slate-600 leading-relaxed">
                      Content will be added by the medical team. This section will list common symptoms patients may experience.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="causes"
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
              >
                <AccordionTrigger
                  data-testid="education-topic-causes-trigger"
                  className="px-6 py-4 text-left hover:no-underline [&[data-state=open]]:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                      <BookOpen className="h-5 w-5 text-slate-600" />
                    </div>
                    <span className="text-lg font-semibold text-slate-900">Causes & Risk Factors</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent
                  data-testid="education-topic-causes-content"
                  className="border-t border-slate-100 px-6 pb-6 pt-4"
                >
                  <div className="prose prose-sm prose-slate max-w-none">
                    <p className="text-slate-600 leading-relaxed">
                      Content will be added by the medical team. This section will explain what causes the condition and who is at risk.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="treatment"
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
              >
                <AccordionTrigger
                  data-testid="education-topic-treatment-trigger"
                  className="px-6 py-4 text-left hover:no-underline [&[data-state=open]]:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                      <Heart className="h-5 w-5 text-slate-600" />
                    </div>
                    <span className="text-lg font-semibold text-slate-900">Treatment Options</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent
                  data-testid="education-topic-treatment-content"
                  className="border-t border-slate-100 px-6 pb-6 pt-4"
                >
                  <div className="prose prose-sm prose-slate max-w-none">
                    <p className="text-slate-600 leading-relaxed">
                      Content will be added by the medical team. This section will describe treatment options from non-surgical to surgical approaches.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem
                value="recovery"
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
              >
                <AccordionTrigger
                  data-testid="education-topic-recovery-trigger"
                  className="px-6 py-4 text-left hover:no-underline [&[data-state=open]]:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                      <Clock className="h-5 w-5 text-slate-600" />
                    </div>
                    <span className="text-lg font-semibold text-slate-900">Recovery & Rehabilitation</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent
                  data-testid="education-topic-recovery-content"
                  className="border-t border-slate-100 px-6 pb-6 pt-4"
                >
                  <div className="prose prose-sm prose-slate max-w-none">
                    <p className="text-slate-600 leading-relaxed">
                      Content will be added by the medical team. This section will explain what to expect during recovery and rehabilitation.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 lg:sticky lg:top-24">
            {/* Urgent Care Callout */}
            <div
              data-testid="education-topic-urgent"
              className="rounded-2xl border border-red-200 bg-red-50 p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <h3 className="font-semibold text-red-900">When to Seek Urgent Care</h3>
              </div>
              <ul className="space-y-2 text-sm text-red-800">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                  Sudden severe pain or swelling
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                  Inability to move or bear weight
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                  Numbness or tingling
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                  Visible deformity after injury
                </li>
              </ul>
            </div>

            {/* Find a Surgeon */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="font-semibold text-slate-900 mb-3">Find a Specialist</h3>
              <SmartSearchBar
                initialQuery={`${topic.toLowerCase()} specialist near `}
                onSearch={({ q }) => {
                  window.location.href = `/?q=${encodeURIComponent(q)}`;
                }}
              />
            </div>

            {/* Medical Disclaimer */}
            <div
              data-testid="education-topic-disclaimer"
              className="rounded-2xl border border-amber-200 bg-amber-50 p-5"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <h3 className="text-sm font-semibold text-amber-900">Medical Disclaimer</h3>
                  <p className="mt-1 text-xs leading-relaxed text-amber-800">
                    This information is for educational purposes only and does not replace professional medical advice.
                    Always consult a qualified orthopaedic surgeon for diagnosis and treatment.
                  </p>
                </div>
              </div>
            </div>

            {/* Back Link */}
            <Link
              to={`/education/${categoryKey}`}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to {categoryTitle}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
