import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Phone, Mail, Globe, MapPin, Clock, Send, ChevronRight, MessageSquare, Building2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const CONTACT_INFO = [
  {
    icon: Phone,
    label: "Phone",
    value: "+91 741 621 6262",
    href: "tel:+917416216262",
    gradient: "from-teal-400 to-emerald-500",
  },
  {
    icon: Mail,
    label: "Email",
    value: "info@agileortho.in",
    href: "mailto:info@agileortho.in",
    gradient: "from-blue-400 to-indigo-500",
  },
  {
    icon: Globe,
    label: "Website",
    value: "www.agileortho.in",
    href: "https://www.agileortho.in",
    gradient: "from-violet-400 to-purple-500",
  },
  {
    icon: Building2,
    label: "Shop",
    value: "www.agileortho.shop",
    href: "https://www.agileortho.shop",
    gradient: "from-amber-400 to-orange-500",
  },
];

const QUICK_LINKS = [
  { label: "Find a Surgeon", href: "/", description: "Search for orthopaedic specialists near you" },
  { label: "Patient Education", href: "/education", description: "Learn about orthopaedic conditions" },
  { label: "Join as Surgeon", href: "/join", description: "Create your free professional profile" },
  { label: "About Us", href: "/about", description: "Learn about our mission and values" },
];

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // For now, just show success message
    // In production, this would send to backend
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
    }, 3000);
  };

  return (
    <main className="min-h-screen bg-slate-50 overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 right-10 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-40 left-10 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-float-delayed" />
      </div>

      {/* Hero Section */}
      <section className="relative border-b border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl" />
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
              <MessageSquare className="h-8 w-8 text-white" />
            </motion.div>

            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Contact{" "}
              <span className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
                Us
              </span>
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-300">
              Have questions? We&apos;re here to help. Reach out to the AgileOrtho team.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Cards */}
      <section className="relative py-12 sm:py-16 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CONTACT_INFO.map((item, idx) => (
              <motion.a
                key={item.label}
                href={item.href}
                target={item.href.startsWith("http") ? "_blank" : undefined}
                rel={item.href.startsWith("http") ? "noreferrer" : undefined}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="group relative"
              >
                <div className={`absolute -inset-1 bg-gradient-to-r ${item.gradient} rounded-2xl blur-lg opacity-0 group-hover:opacity-30 transition-opacity`} />
                <div className="relative flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm group-hover:shadow-lg transition-all">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient} shadow-lg`}>
                    <item.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-slate-500">{item.label}</p>
                    <p className="font-semibold text-slate-900 truncate group-hover:text-teal-600 transition-colors">
                      {item.value}
                    </p>
                  </div>
                  {item.href.startsWith("http") && (
                    <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-teal-500 transition-colors ml-auto shrink-0" />
                  )}
                </div>
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="relative py-12 sm:py-16 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm"
            >
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Send us a Message</h2>
              <p className="text-slate-600 mb-6">
                Fill out the form below and we&apos;ll get back to you as soon as possible.
              </p>

              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200 p-8 text-center"
                >
                  <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 shadow-lg mb-4">
                    <Send className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-teal-900">Message Sent!</h3>
                  <p className="mt-2 text-teal-700">Thank you for reaching out. We&apos;ll respond soon.</p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Name *</label>
                      <Input
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Your full name"
                        className="h-11 rounded-xl border-slate-200 focus-visible:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Email *</label>
                      <Input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="your@email.com"
                        className="h-11 rounded-xl border-slate-200 focus-visible:ring-teal-500"
                      />
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
                      <Input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+91 XXXXX XXXXX"
                        className="h-11 rounded-xl border-slate-200 focus-visible:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Subject *</label>
                      <Input
                        required
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        placeholder="What is this about?"
                        className="h-11 rounded-xl border-slate-200 focus-visible:ring-teal-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Message *</label>
                    <Textarea
                      required
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="How can we help you?"
                      rows={5}
                      className="rounded-xl border-slate-200 focus-visible:ring-teal-500 resize-none"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 transition-all"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Send Message
                  </Button>
                </form>
              )}
            </motion.div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Links */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <h3 className="text-lg font-bold text-slate-900 mb-4">Quick Links</h3>
                <div className="space-y-3">
                  {QUICK_LINKS.map((link) => (
                    <Link
                      key={link.label}
                      to={link.href}
                      className="group flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 hover:border-teal-200 hover:bg-teal-50 transition-all"
                    >
                      <div>
                        <p className="font-medium text-slate-900 group-hover:text-teal-700 transition-colors">
                          {link.label}
                        </p>
                        <p className="text-xs text-slate-500">{link.description}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-teal-500 group-hover:translate-x-1 transition-all" />
                    </Link>
                  ))}
                </div>
              </motion.div>

              {/* Office Hours */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Office Hours</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Monday - Friday</span>
                    <span className="font-medium text-slate-900">9:00 AM - 6:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Saturday</span>
                    <span className="font-medium text-slate-900">9:00 AM - 2:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Sunday</span>
                    <span className="font-medium text-slate-500">Closed</span>
                  </div>
                </div>
              </motion.div>

              {/* Location */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-400 to-red-500 shadow-lg">
                    <MapPin className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Location</h3>
                </div>
                <p className="text-sm text-slate-600">
                  AgileOrtho operates across Hyderabad, India, partnering with leading hospitals including 
                  Apollo Spectra, Care Hospital, and AIG Hospital.
                </p>
                <a
                  href="https://www.google.com/maps/search/AgileOrtho+Hyderabad"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-700"
                >
                  View on Google Maps
                  <ExternalLink className="h-3 w-3" />
                </a>
              </motion.div>

              {/* Emergency Note */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 }}
                className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-5"
              >
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> For medical emergencies, please visit your nearest hospital or call emergency services immediately. 
                  OrthoConnect is an educational platform and does not provide emergency medical services.
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
