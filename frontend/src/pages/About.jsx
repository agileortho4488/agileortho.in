import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { Heart, Target, Users, Award, Shield, Lightbulb, ChevronRight, Building2, GraduationCap, Stethoscope, Quote } from "lucide-react";

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
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

const CORE_VALUES = [
  {
    icon: Heart,
    title: "Patient-First Mindset",
    description: "Delivering latest advancements with accessibility through fair pricing and comprehensive training.",
    gradient: "from-rose-400 to-red-500",
  },
  {
    icon: Shield,
    title: "Quality-First Delivery",
    description: "Ensuring quality never falls behind at any cost, providing the best for every patient.",
    gradient: "from-teal-400 to-emerald-500",
  },
  {
    icon: Lightbulb,
    title: "Problem-Solving Hunger",
    description: "Enabling doctors and patients to have the latest treatments within reach, overcoming all challenges.",
    gradient: "from-amber-400 to-orange-500",
  },
  {
    icon: Award,
    title: "Unshakeable Ethics",
    description: "Building sustainable business practices with superior ethics and transparent operations.",
    gradient: "from-indigo-400 to-violet-500",
  },
];

const LEADERSHIP = [
  {
    name: "B. Nagi Reddy",
    role: "Director - Finance & Legal",
    bio: "35+ years in Banking and Legal. Qualified CA and LLB. Provides crucial expertise in compliance, policy decisions, and regulatory adherence.",
    image: null,
  },
];

const TESTIMONIALS = [
  {
    quote: "Utmost efficiency, high quality, and precise requirements. The improving relationship speaks volumes about their commitment.",
    author: "Dr. Veerendra Mudnoor",
    hospital: "Apollo Spectra Hospital, Hyderabad",
  },
  {
    quote: "Highly reliable and professional with impeccable timing. Their service has assured success in our operations.",
    author: "Dr. Sharath Babu & Dr. Ratnakar",
    hospital: "Care Hospital, Hi-Tech City, Hyderabad",
  },
  {
    quote: "Organized operation with detailed systems for delivery, invoicing, and ledger maintenance. They set protocols for other vendors.",
    author: "Mr. Mahendar Reddy",
    hospital: "AIG Hospital, Hyderabad",
  },
];

export default function About() {
  return (
    <main className="min-h-screen bg-slate-50 overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-40 right-10 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-float-delayed" />
      </div>

      {/* Hero Section */}
      <section className="relative border-b border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
              className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 shadow-lg shadow-teal-500/40 mb-6"
            >
              <Building2 className="h-8 w-8 text-white" />
            </motion.div>

            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              About{" "}
              <span className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
                OrthoConnect
              </span>
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-300">
              A patient-first orthopaedic platform by AgileOrtho, revolutionizing how India finds trusted musculoskeletal care.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission & Vision */}
      <AnimatedSection className="py-16 sm:py-20 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-2">
            <motion.div
              variants={fadeInUp}
              className="relative group"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-teal-400 to-emerald-500 rounded-3xl blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
              <div className="relative rounded-2xl border border-slate-200 bg-white p-8 h-full">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 shadow-lg mb-6">
                  <Target className="h-7 w-7 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Our Mission</h2>
                <p className="text-slate-600 leading-relaxed">
                  To revolutionize orthopaedic care by creating an ecosystem that serves both doctors and patients. 
                  We aim to bridge the quality gap in orthopaedic care in India by providing superior implants, 
                  patient education, and connecting people with trusted surgeons — without commercial bias, 
                  paid rankings, or appointment booking fees.
                </p>
              </div>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              className="relative group"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-400 to-violet-500 rounded-3xl blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
              <div className="relative rounded-2xl border border-slate-200 bg-white p-8 h-full">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 shadow-lg mb-6">
                  <Lightbulb className="h-7 w-7 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">Our Vision</h2>
                <p className="text-slate-600 leading-relaxed">
                  To play a crucial role in nation-building by enabling a healthy and happy India. 
                  We envision a future where every patient has access to quality orthopaedic care, 
                  where doctors are supported with the best resources, and where trust is the 
                  foundation of every healthcare decision.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </AnimatedSection>

      {/* About AgileOrtho */}
      <AnimatedSection className="py-16 sm:py-20 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div variants={fadeInUp} className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
              Powered by{" "}
              <span className="bg-gradient-to-r from-teal-500 to-emerald-500 bg-clip-text text-transparent">
                AgileOrtho
              </span>
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-slate-600">
              Mobility Revolutionised — Since 2021
            </p>
          </motion.div>

          <motion.div variants={fadeInUp} className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="prose prose-slate max-w-none">
              <p className="text-lg text-slate-600 leading-relaxed">
                OrthoConnect is the patient-facing platform of <strong>AgileOrtho</strong>, a company dedicated to 
                revolutionizing orthopaedic care in India. Founded in 2021, AgileOrtho 
                started with a simple but powerful vision: to ensure every Indian has access to quality 
                orthopaedic care.
              </p>
              <p className="text-slate-600 leading-relaxed mt-4">
                AgileOrtho operates across the orthopaedic ecosystem — from sourcing and manufacturing high-quality 
                surgical implants to training surgeons and educating patients. Our services span <strong>Trauma, 
                Arthroscopy, Orthobiologics, Arthroplasty, General Instruments, and Consumables</strong>.
              </p>
              <p className="text-slate-600 leading-relaxed mt-4">
                What makes us different? We believe in a <strong>services-first mindset</strong> over sales. 
                We prioritize quality of life improvements over price margins. We maintain blinders-on focus 
                on quality and operate with an unshakeable system of ethics.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="https://www.agileortho.shop"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 transition-all"
              >
                Visit AgileOrtho Shop
                <ChevronRight className="h-4 w-4" />
              </a>
              <a
                href="https://www.agileortho.in"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
              >
                Learn More at agileortho.in
                <ChevronRight className="h-4 w-4" />
              </a>
            </div>
          </motion.div>
        </div>
      </AnimatedSection>

      {/* Core Values */}
      <AnimatedSection className="py-16 sm:py-20 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div variants={fadeInUp} className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">Our Core Values</h2>
            <p className="mt-4 max-w-2xl mx-auto text-slate-600">
              The principles that guide everything we do
            </p>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {CORE_VALUES.map((value, idx) => (
              <motion.div
                key={value.title}
                variants={fadeInUp}
                whileHover={{ y: -8, scale: 1.02 }}
                className="group relative"
              >
                <div className={`absolute -inset-1 bg-gradient-to-r ${value.gradient} rounded-2xl blur-lg opacity-0 group-hover:opacity-30 transition-opacity`} />
                <div className="relative rounded-2xl border border-slate-200 bg-white p-6 h-full shadow-sm group-hover:shadow-xl transition-all">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${value.gradient} shadow-lg mb-4`}>
                    <value.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{value.title}</h3>
                  <p className="text-sm text-slate-600">{value.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* Leadership */}
      <AnimatedSection className="py-16 sm:py-20 bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div variants={fadeInUp} className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">Advisory Board</h2>
            <p className="mt-4 max-w-2xl mx-auto text-slate-400">
              Experienced professionals guiding our operations
            </p>
          </motion.div>

          <div className="flex justify-center">
            {LEADERSHIP.map((person, idx) => (
              <motion.div
                key={person.name}
                variants={fadeInUp}
                whileHover={{ y: -5 }}
                className="rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-8 text-center max-w-sm"
              >
                <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 text-2xl font-bold text-white mb-4">
                  {person.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <h3 className="text-lg font-bold text-white">{person.name}</h3>
                <p className="text-sm text-teal-400 font-medium mb-3">{person.role}</p>
                <p className="text-xs text-slate-400 leading-relaxed">{person.bio}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* Testimonials */}
      <AnimatedSection className="py-16 sm:py-20 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div variants={fadeInUp} className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">Trusted by Healthcare Leaders</h2>
            <p className="mt-4 max-w-2xl mx-auto text-slate-600">
              What medical professionals say about working with AgileOrtho
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((testimonial, idx) => (
              <motion.div
                key={idx}
                variants={fadeInUp}
                whileHover={{ y: -5 }}
                className="relative rounded-2xl border border-slate-200 bg-slate-50 p-6"
              >
                <Quote className="h-8 w-8 text-teal-500/30 mb-4" />
                <p className="text-slate-600 leading-relaxed mb-6">&ldquo;{testimonial.quote}&rdquo;</p>
                <div>
                  <p className="font-semibold text-slate-900">{testimonial.author}</p>
                  <p className="text-sm text-slate-500">{testimonial.hospital}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </AnimatedSection>

      {/* CTA */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-teal-500 to-emerald-600">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold text-white sm:text-4xl">
              Join the OrthoConnect Community
            </h2>
            <p className="mt-4 text-lg text-teal-100">
              Whether you&apos;re a patient seeking care or a surgeon looking to join our ethical platform
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-semibold text-teal-600 shadow-lg hover:bg-slate-50 transition-all"
              >
                Find a Surgeon
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                to="/join"
                className="inline-flex items-center gap-2 rounded-full bg-teal-700 px-8 py-4 text-sm font-semibold text-white hover:bg-teal-800 transition-all"
              >
                Join as Surgeon
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
