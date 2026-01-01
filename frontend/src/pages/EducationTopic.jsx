import { useMemo, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { AlertTriangle, BookOpen, ChevronRight, Stethoscope, Activity, Heart, Clock, ArrowLeft, Sparkles, Zap, Shield, FileText, CheckCircle2, AlertCircle } from "lucide-react";
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
import { getTopicContent } from "@/lib/educationContent";

const CATEGORY_STYLES = {
  "trauma-injury-care": { gradient: "from-rose-400 to-red-500", light: "from-rose-50 to-red-50" },
  "spine": { gradient: "from-sky-400 to-blue-500", light: "from-sky-50 to-blue-50" },
  "shoulder-elbow": { gradient: "from-indigo-400 to-violet-500", light: "from-indigo-50 to-violet-50" },
  "knee-sports": { gradient: "from-teal-400 to-emerald-500", light: "from-teal-50 to-emerald-50" },
  "pediatric-orthopaedics": { gradient: "from-cyan-400 to-teal-500", light: "from-cyan-50 to-teal-50" },
  "recon-arthroplasty": { gradient: "from-amber-400 to-orange-500", light: "from-amber-50 to-orange-50" },
  "hand-wrist": { gradient: "from-pink-400 to-rose-500", light: "from-pink-50 to-rose-50" },
  "foot-ankle": { gradient: "from-emerald-400 to-green-500", light: "from-emerald-50 to-green-50" },
  "pathology-orthopaedic-oncology": { gradient: "from-slate-400 to-slate-500", light: "from-slate-50 to-gray-50" },
  "basic-science-patient-knowledge": { gradient: "from-blue-400 to-indigo-500", light: "from-blue-50 to-indigo-50" },
  "anatomy-patient-reference": { gradient: "from-purple-400 to-fuchsia-500", light: "from-purple-50 to-fuchsia-50" },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

function AnimatedSection({ children, className = "" }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={staggerContainer}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function EducationTopic() {
  const { categoryKey, topicSlug: slug } = useParams();
  const style = CATEGORY_STYLES[categoryKey] || { gradient: "from-teal-500 to-emerald-600", light: "from-teal-50 to-emerald-50" };

  const topic = useMemo(() => {
    const list = EDUCATION_TOPICS_BY_CATEGORY[categoryKey] || [];
    return list.find((t) => topicToSlug(t) === slug) || null;
  }, [categoryKey, slug]);

  // Get real content if available
  const content = useMemo(() => getTopicContent(slug), [slug]);

  if (!topic) {
    return (
      <main data-testid="education-topic-not-found" className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="text-6xl mb-6">📖</div>
            <h1 className="text-2xl font-bold text-slate-900">Topic not found</h1>
            <p className="mt-3 text-slate-600">
              The topic you&apos;re looking for doesn&apos;t exist or has been moved.
            </p>
            <Link
              to="/education"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Education Hub
            </Link>
          </motion.div>
        </div>
      </main>
    );
  }

  const categoryTitle = categoryKeyToTitle(categoryKey);
  const hasRealContent = !!content;

  return (
    <main data-testid="education-topic-page" className="min-h-screen bg-slate-50 overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className={`absolute top-20 right-10 w-96 h-96 bg-gradient-to-br ${style.gradient} opacity-10 rounded-full blur-3xl animate-float`} />
        <div className={`absolute bottom-40 left-10 w-80 h-80 bg-gradient-to-br ${style.gradient} opacity-10 rounded-full blur-3xl animate-float-delayed`} />
      </div>

      {/* Header */}
      <section className="relative border-b border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
        <div className="absolute inset-0">
          <div className={`absolute top-0 right-0 w-96 h-96 bg-gradient-to-br ${style.gradient} opacity-20 rounded-full blur-3xl`} />
          <div className={`absolute bottom-0 left-1/4 w-80 h-80 bg-gradient-to-br ${style.gradient} opacity-15 rounded-full blur-3xl`} />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          {/* Breadcrumb */}
          <motion.nav
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap items-center gap-2 text-sm text-slate-400 mb-6"
          >
            <Link to="/education" className="hover:text-white transition-colors">Education</Link>
            <ChevronRight className="h-4 w-4" />
            <Link to={`/education/${categoryKey}`} className="hover:text-white transition-colors">{categoryTitle}</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-white font-medium">{content?.title || topic}</span>
          </motion.nav>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {hasRealContent && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 mb-4"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-medium text-emerald-300">Research-backed content</span>
              </motion.div>
            )}

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
              className={`inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${style.gradient} shadow-lg mb-4`}
            >
              <BookOpen className="h-7 w-7 text-white" />
            </motion.div>

            <h1
              data-testid="education-topic-title"
              className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl"
            >
              {content?.title || topic}
            </h1>
            <p data-testid="education-topic-intro" className="mt-3 max-w-3xl text-slate-400">
              {hasRealContent 
                ? "A comprehensive, research-backed patient education guide."
                : "A patient education guide prepared by orthopaedic specialists."}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
          {/* Main Content */}
          <AnimatedSection className="space-y-6">
            {/* Key Takeaways Card */}
            <motion.div
              variants={fadeInUp}
              whileHover={{ scale: 1.01 }}
              data-testid="education-topic-takeaways"
              className="relative group"
            >
              <div className={`absolute -inset-1 bg-gradient-to-r ${style.gradient} rounded-3xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity`} />
              <div className={`relative rounded-2xl bg-gradient-to-br ${style.light} border border-white p-6 shadow-lg`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${style.gradient} shadow-md`}>
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">Key Takeaways</h2>
                </div>
                <ul className="space-y-3">
                  {(content?.keyTakeaways || [
                    "Early diagnosis improves treatment outcomes",
                    "Many conditions can be managed without surgery",
                    "Consult a specialist if symptoms persist beyond 2 weeks",
                  ]).map((item, idx) => (
                    <motion.li
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + idx * 0.1 }}
                      className="flex items-start gap-3 text-slate-700"
                    >
                      <div className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${style.gradient}`}>
                        <Zap className="h-3 w-3 text-white" />
                      </div>
                      {item}
                    </motion.li>
                  ))}
                </ul>
              </div>
            </motion.div>

            {/* Accordion Content */}
            <Accordion type="multiple" defaultValue={["what-it-is", "symptoms"]} className="space-y-4">
              {/* What Is It */}
              <motion.div variants={fadeInUp}>
                <AccordionItem
                  value="what-it-is"
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow"
                >
                  <AccordionTrigger className="px-6 py-5 text-left hover:no-underline group [&[data-state=open]]:bg-slate-50">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${style.light} group-hover:scale-110 transition-transform`}>
                        <Stethoscope className="h-6 w-6 text-slate-600" />
                      </div>
                      <span className="text-lg font-bold text-slate-900">What is {topic}?</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="border-t border-slate-100 bg-slate-50/50 px-6 pb-6 pt-4">
                    <div className="prose prose-slate max-w-none">
                      {content?.whatIsIt ? (
                        content.whatIsIt.split('\n\n').map((para, idx) => (
                          <p key={idx} className="text-slate-600 leading-relaxed mb-4">{para}</p>
                        ))
                      ) : (
                        <p className="text-slate-600 leading-relaxed">Content will be added by the medical team.</p>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </motion.div>

              {/* Symptoms */}
              <motion.div variants={fadeInUp}>
                <AccordionItem
                  value="symptoms"
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow"
                >
                  <AccordionTrigger className="px-6 py-5 text-left hover:no-underline group [&[data-state=open]]:bg-slate-50">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${style.light} group-hover:scale-110 transition-transform`}>
                        <Activity className="h-6 w-6 text-slate-600" />
                      </div>
                      <span className="text-lg font-bold text-slate-900">Common Symptoms</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="border-t border-slate-100 bg-slate-50/50 px-6 pb-6 pt-4">
                    {content?.symptoms ? (
                      <ul className="space-y-2">
                        {content.symptoms.map((symptom, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-slate-600">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                            {symptom}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-slate-600">Content will be added by the medical team.</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>

              {/* Causes & Risk Factors */}
              <motion.div variants={fadeInUp}>
                <AccordionItem
                  value="causes"
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow"
                >
                  <AccordionTrigger className="px-6 py-5 text-left hover:no-underline group [&[data-state=open]]:bg-slate-50">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${style.light} group-hover:scale-110 transition-transform`}>
                        <BookOpen className="h-6 w-6 text-slate-600" />
                      </div>
                      <span className="text-lg font-bold text-slate-900">Causes & Risk Factors</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="border-t border-slate-100 bg-slate-50/50 px-6 pb-6 pt-4">
                    {content?.causes ? (
                      <div className="space-y-6">
                        <div>
                          <h4 className="font-semibold text-slate-900 mb-3">Common Causes</h4>
                          <ul className="space-y-2">
                            {content.causes.map((cause, idx) => (
                              <li key={idx} className="flex items-start gap-3 text-slate-600">
                                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                                {cause}
                              </li>
                            ))}
                          </ul>
                        </div>
                        {content.riskFactors && (
                          <div>
                            <h4 className="font-semibold text-slate-900 mb-3">Risk Factors</h4>
                            <ul className="space-y-2">
                              {content.riskFactors.map((factor, idx) => (
                                <li key={idx} className="flex items-start gap-3 text-slate-600">
                                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
                                  {factor}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-slate-600">Content will be added by the medical team.</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>

              {/* Treatment Options */}
              <motion.div variants={fadeInUp}>
                <AccordionItem
                  value="treatment"
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow"
                >
                  <AccordionTrigger className="px-6 py-5 text-left hover:no-underline group [&[data-state=open]]:bg-slate-50">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${style.light} group-hover:scale-110 transition-transform`}>
                        <Heart className="h-6 w-6 text-slate-600" />
                      </div>
                      <span className="text-lg font-bold text-slate-900">Treatment Options</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="border-t border-slate-100 bg-slate-50/50 px-6 pb-6 pt-4">
                    {content?.treatment ? (
                      <div className="space-y-6">
                        <div className="p-4 rounded-xl bg-green-50 border border-green-100">
                          <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5" />
                            Non-Surgical Treatment
                          </h4>
                          <ul className="space-y-2">
                            {content.treatment.nonSurgical.map((item, idx) => (
                              <li key={idx} className="flex items-start gap-3 text-green-800">
                                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                          <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                            <Stethoscope className="h-5 w-5" />
                            Surgical Treatment
                          </h4>
                          <ul className="space-y-2">
                            {content.treatment.surgical.map((item, idx) => (
                              <li key={idx} className="flex items-start gap-3 text-blue-800">
                                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-600">Content will be added by the medical team.</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>

              {/* Recovery */}
              <motion.div variants={fadeInUp}>
                <AccordionItem
                  value="recovery"
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow"
                >
                  <AccordionTrigger className="px-6 py-5 text-left hover:no-underline group [&[data-state=open]]:bg-slate-50">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${style.light} group-hover:scale-110 transition-transform`}>
                        <Clock className="h-6 w-6 text-slate-600" />
                      </div>
                      <span className="text-lg font-bold text-slate-900">Recovery & Rehabilitation</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="border-t border-slate-100 bg-slate-50/50 px-6 pb-6 pt-4">
                    {content?.recovery ? (
                      <div className="prose prose-slate max-w-none">
                        {content.recovery.split('\n\n').map((para, idx) => (
                          <p key={idx} className="text-slate-600 leading-relaxed mb-4 whitespace-pre-line">{para}</p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-600">Content will be added by the medical team.</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>

              {/* Prevention (if available) */}
              {content?.prevention && (
                <motion.div variants={fadeInUp}>
                  <AccordionItem
                    value="prevention"
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow"
                  >
                    <AccordionTrigger className="px-6 py-5 text-left hover:no-underline group [&[data-state=open]]:bg-slate-50">
                      <div className="flex items-center gap-4">
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${style.light} group-hover:scale-110 transition-transform`}>
                          <Shield className="h-6 w-6 text-slate-600" />
                        </div>
                        <span className="text-lg font-bold text-slate-900">Prevention</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="border-t border-slate-100 bg-slate-50/50 px-6 pb-6 pt-4">
                      <ul className="space-y-2">
                        {content.prevention.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-slate-600">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </motion.div>
              )}
            </Accordion>

            {/* References (if available) */}
            {content?.references && (
              <motion.div variants={fadeInUp} className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="h-5 w-5 text-slate-500" />
                  <h3 className="font-semibold text-slate-900">References & Sources</h3>
                </div>
                <ul className="space-y-2 text-sm text-slate-600">
                  {content.references.map((ref, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-slate-400">[{idx + 1}]</span>
                      {ref}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatedSection>

          {/* Sidebar */}
          <div className="space-y-5 lg:sticky lg:top-24">
            {/* Urgent Care Callout */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.02 }}
              data-testid="education-topic-urgent"
              className="relative group"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-red-500 to-rose-500 rounded-3xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity" />
              <div className="relative rounded-2xl bg-gradient-to-br from-red-50 to-rose-50 border border-red-100 p-5 shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-rose-600 shadow-md">
                    <AlertTriangle className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-bold text-red-900">When to Seek Urgent Care</h3>
                </div>
                <ul className="space-y-2">
                  {[
                    "Sudden severe pain or swelling",
                    "Inability to move or bear weight",
                    "Numbness or tingling",
                    "Visible deformity after injury",
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-red-800">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>

            {/* Find a Surgeon */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5 text-teal-600" />
                <h3 className="font-bold text-slate-900">Find a Specialist</h3>
              </div>
              <SmartSearchBar
                initialQuery={`${topic.toLowerCase()} specialist near `}
                onSearch={({ q }) => {
                  window.location.href = `/?q=${encodeURIComponent(q)}`;
                }}
              />
            </motion.div>

            {/* Medical Disclaimer */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              data-testid="education-topic-disclaimer"
              className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-5"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <h3 className="text-sm font-bold text-amber-900">Medical Disclaimer</h3>
                  <p className="mt-1 text-xs leading-relaxed text-amber-800">
                    This information is for educational purposes only and does not replace professional medical consultation. Always consult a qualified orthopaedic surgeon for diagnosis and treatment.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Back Link */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
              <Link
                to={`/education/${categoryKey}`}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900 hover:shadow-md group"
              >
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                Back to {categoryTitle}
              </Link>
            </motion.div>
          </div>
        </div>
      </section>
    </main>
  );
}
