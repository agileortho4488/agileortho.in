import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { BookOpen, ChevronRight, AlertCircle, Sparkles, Search } from "lucide-react";
import { EDUCATION_CATEGORIES } from "@/lib/educationTopics";

const CATEGORY_DATA = {
  "trauma-injury-care": { icon: "🩹", gradient: "from-red-500 to-rose-600", glow: "shadow-red-500/30" },
  "spine": { icon: "🦴", gradient: "from-blue-500 to-indigo-600", glow: "shadow-blue-500/30" },
  "shoulder-elbow": { icon: "💪", gradient: "from-violet-500 to-purple-600", glow: "shadow-violet-500/30" },
  "knee-sports": { icon: "🦵", gradient: "from-emerald-500 to-teal-600", glow: "shadow-emerald-500/30" },
  "pediatric-orthopaedics": { icon: "👶", gradient: "from-cyan-500 to-sky-600", glow: "shadow-cyan-500/30" },
  "recon-arthroplasty": { icon: "🦿", gradient: "from-amber-500 to-orange-600", glow: "shadow-amber-500/30" },
  "hand-wrist": { icon: "✋", gradient: "from-pink-500 to-rose-600", glow: "shadow-pink-500/30" },
  "foot-ankle": { icon: "🦶", gradient: "from-lime-500 to-green-600", glow: "shadow-lime-500/30" },
  "pathology-orthopaedic-oncology": { icon: "🔬", gradient: "from-slate-500 to-gray-600", glow: "shadow-slate-500/30" },
  "basic-science-patient-knowledge": { icon: "📚", gradient: "from-indigo-500 to-blue-600", glow: "shadow-indigo-500/30" },
  "anatomy-patient-reference": { icon: "🧬", gradient: "from-fuchsia-500 to-pink-600", glow: "shadow-fuchsia-500/30" },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
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

export default function EducationHub() {
  return (
    <main data-testid="education-hub-page" className="min-h-screen bg-slate-50 overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute top-1/3 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-float-delayed" />
        <div className="absolute bottom-20 left-1/3 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "3s" }} />
      </div>

      {/* Hero Header */}
      <section className="relative border-b border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur border border-white/20 px-4 py-2 mb-6"
            >
              <Sparkles className="h-4 w-4 text-teal-400" />
              <span className="text-sm font-medium text-white/90">700+ Topics Available</span>
            </motion.div>

            <div className="flex items-center justify-center gap-4 mb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.3 }}
                className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 shadow-lg shadow-teal-500/40"
              >
                <BookOpen className="h-8 w-8 text-white" />
              </motion.div>
            </div>

            <h1
              data-testid="education-hub-title"
              className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl"
            >
              Patient Education{" "}
              <span className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
                Library
              </span>
            </h1>
            <p
              data-testid="education-hub-subtitle"
              className="mt-4 max-w-2xl mx-auto text-lg text-slate-300"
            >
              Learn about orthopaedic conditions in simple, patient-friendly language.
              Understand symptoms, causes, and treatment options.
            </p>

            {/* Search hint */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-8 flex items-center justify-center gap-2 text-sm text-slate-400"
            >
              <Search className="h-4 w-4" />
              <span>Select a category below to explore topics</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <AnimatedSection>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {EDUCATION_CATEGORIES.map((c, idx) => {
              const data = CATEGORY_DATA[c.key] || { icon: "📖", gradient: "from-slate-500 to-gray-600", glow: "shadow-slate-500/30" };
              
              return (
                <motion.div
                  key={c.key}
                  variants={fadeInUp}
                  whileHover={{ scale: 1.03, y: -8 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative"
                >
                  {/* Glow effect */}
                  <div className={`absolute -inset-1 bg-gradient-to-r ${data.gradient} rounded-3xl blur-lg opacity-0 group-hover:opacity-40 transition-all duration-500`} />
                  
                  <Link
                    data-testid={`education-category-card-${c.key}`}
                    to={`/education/${c.key}`}
                    className={`relative flex flex-col h-full rounded-2xl bg-white border border-slate-200 p-6 shadow-sm transition-all duration-300 group-hover:shadow-2xl group-hover:border-transparent group-hover:${data.glow}`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <motion.div
                        className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${data.gradient} shadow-lg ${data.glow}`}
                        whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                        transition={{ duration: 0.5 }}
                      >
                        <span className="text-3xl">{data.icon}</span>
                      </motion.div>
                      <motion.div
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 group-hover:bg-slate-200 transition-colors"
                        whileHover={{ x: 5 }}
                      >
                        <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                      </motion.div>
                    </div>

                    <h2 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-slate-800">
                      {c.title}
                    </h2>
                    <p className="text-sm text-slate-600 flex-grow mb-4">
                      {c.description}
                    </p>

                    <div className={`inline-flex items-center gap-1 text-sm font-semibold bg-gradient-to-r ${data.gradient} bg-clip-text text-transparent`}>
                      Explore topics
                      <ChevronRight className="h-4 w-4 text-teal-500" />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </AnimatedSection>

        {/* Disclaimer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          data-testid="education-hub-disclaimer"
          className="mt-12 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-6"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/25">
              <AlertCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-amber-900">Educational Content Only</h3>
              <p className="mt-1 text-sm text-amber-800">
                This information is for educational purposes only and does not replace professional medical consultation.
                OrthoConnect does not recommend or rank any healthcare providers.
              </p>
            </div>
          </div>
        </motion.div>
      </section>
    </main>
  );
}
