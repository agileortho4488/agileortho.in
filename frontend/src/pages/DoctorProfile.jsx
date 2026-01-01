import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Phone, Globe, MapPin, Clock, ChevronRight, Shield, AlertCircle, CheckCircle2, BadgeCheck, FileCheck, UserCheck, MessageCircle } from "lucide-react";
import { apiClient } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Trust badge component
function TrustBadge({ type, label, verified = true }) {
  const styles = {
    verified: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", icon: BadgeCheck },
    approved: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", icon: CheckCircle2 },
    documents: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", icon: FileCheck },
    profile: { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", icon: UserCheck },
    experience: { bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-700", icon: Shield },
    location: { bg: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-700", icon: MapPin },
  };
  
  const style = styles[type] || styles.verified;
  const Icon = style.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      className={`inline-flex items-center gap-1.5 rounded-full ${style.bg} ${style.border} border px-3 py-1`}
    >
      <Icon className={`h-3.5 w-3.5 ${style.text}`} />
      <span className={`text-xs font-medium ${style.text}`}>{label}</span>
    </motion.div>
  );
}

export default function DoctorProfile() {
  const { slug } = useParams();
  const api = useMemo(() => apiClient(), []);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(`/profiles/by-slug/${slug}`);
        if (mounted) setData(res.data);
      } catch (e) {
        if (mounted)
          setError(e?.response?.data?.detail || "Unable to load profile");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [api, slug]);

  const jsonLd = useMemo(() => {
    if (!data) return null;
    const city = data?.locations?.[0]?.city || data?.clinic?.city || "";
    const pincode = data?.locations?.[0]?.pincode || data?.clinic?.pincode || "";
    const address = data?.locations?.[0]?.address || data?.clinic?.address || "";
    return {
      "@context": "https://schema.org",
      "@type": "Physician",
      name: data.name,
      medicalSpecialty: data.subspecialties,
      address: {
        "@type": "PostalAddress",
        streetAddress: address,
        addressLocality: city,
        postalCode: pincode,
        addressCountry: "IN",
      },
    };
  }, [data]);

  if (loading) {
    return (
      <main data-testid="doctor-profile-loading" className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-4 border-teal-100" />
              <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-4 border-teal-500 border-t-transparent animate-spin" />
            </div>
            <span className="text-slate-600 font-medium">Loading profile...</span>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main data-testid="doctor-profile-error" className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center"
          >
            <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
            <div className="mt-4 text-lg font-semibold text-red-800">{error}</div>
            <Link
              to="/"
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-red-700 hover:text-red-800"
            >
              ← Back to search
            </Link>
          </motion.div>
        </div>
      </main>
    );
  }

  if (!data) return null;

  const locations = data.locations || [];
  const hasWebsite = data.website && data.website.trim();

  return (
    <main data-testid="doctor-profile-page" className="min-h-screen bg-slate-50 overflow-hidden">
      {jsonLd && (
        <script
          data-testid="doctor-profile-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 right-10 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-40 left-10 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-float-delayed" />
      </div>

      {/* Header Card */}
      <section className="relative border-b border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col gap-6 sm:flex-row sm:items-start"
          >
            {/* Photo */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="shrink-0"
            >
              {data.public_photo_url ? (
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-teal-400 to-emerald-400 rounded-2xl blur-md opacity-50 group-hover:opacity-75 transition-opacity" />
                  <img
                    data-testid="doctor-profile-photo"
                    src={`${process.env.REACT_APP_BACKEND_URL}${data.public_photo_url}`}
                    alt={data.name}
                    className="relative h-32 w-32 rounded-2xl border-2 border-white/20 object-cover shadow-xl sm:h-36 sm:w-36"
                  />
                </div>
              ) : (
                <div
                  data-testid="doctor-profile-photo-placeholder"
                  className="flex h-32 w-32 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 border-2 border-white/10 text-3xl font-bold text-white/70 sm:h-36 sm:w-36"
                >
                  {(data.name || "DR").trim().slice(0, 2).toUpperCase()}
                </div>
              )}
            </motion.div>

            {/* Info */}
            <div className="flex-1">
              {/* Trust Badges */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap gap-2 mb-4"
              >
                <TrustBadge type="approved" label="Admin Verified" />
                {data.registration_number && <TrustBadge type="documents" label="Registration Submitted" />}
                {data.public_photo_url && <TrustBadge type="profile" label="Photo Verified" />}
                {data.locations?.length > 0 && <TrustBadge type="location" label="Location Verified" />}
                {data.about && data.about.length > 50 && <TrustBadge type="experience" label="Profile Complete" />}
              </motion.div>

              <h1
                data-testid="doctor-profile-name"
                className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl"
              >
                {data.name}
              </h1>
              <p
                data-testid="doctor-profile-qualifications"
                className="mt-2 text-base text-slate-300 sm:text-lg"
              >
                {data.qualifications}
              </p>

              {/* Subspecialties */}
              {data.subspecialties?.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="mt-4 flex flex-wrap gap-2"
                >
                  {data.subspecialties.map((s) => (
                    <Badge
                      data-testid={`doctor-profile-subspecialty-${s.toLowerCase().replace(/\s+/g, "-")}`}
                      key={s}
                      className="rounded-full border-0 bg-teal-500/20 backdrop-blur px-3 py-1.5 text-sm font-medium text-teal-200 hover:bg-teal-500/30"
                    >
                      {s}
                    </Badge>
                  ))}
                </motion.div>
              )}

              {/* Registration Badge */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-6 inline-flex items-center gap-3 rounded-xl bg-white/10 backdrop-blur border border-white/10 px-4 py-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
                  <Shield className="h-5 w-5 text-teal-400" />
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-400">Medical Registration</div>
                  <div
                    data-testid="doctor-profile-reg-number"
                    className="text-sm font-bold text-white"
                  >
                    {data.registration_number}
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
          {/* Main Content */}
          <div className="space-y-6">
            {/* About */}
            {data.about && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <h2 data-testid="doctor-profile-about-title" className="text-lg font-bold text-slate-900">
                  About
                </h2>
                <p data-testid="doctor-profile-about-body" className="mt-3 text-sm leading-relaxed text-slate-600">
                  {data.about}
                </p>
              </motion.div>
            )}

            {/* Conditions & Procedures */}
            <div className="grid gap-6 sm:grid-cols-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <h2 data-testid="doctor-profile-conditions-title" className="text-lg font-bold text-slate-900">
                  Conditions Treated
                </h2>
                {data.conditions_treated?.length > 0 ? (
                  <ul className="mt-4 space-y-2">
                    {data.conditions_treated.map((c, idx) => (
                      <li
                        data-testid={`doctor-profile-condition-${idx}`}
                        key={`${c}-${idx}`}
                        className="flex items-start gap-2 text-sm text-slate-600"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                        {c}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-slate-400">Not specified</p>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <h2 data-testid="doctor-profile-procedures-title" className="text-lg font-bold text-slate-900">
                  Procedures Performed
                </h2>
                {data.procedures_performed?.length > 0 ? (
                  <ul className="mt-4 space-y-2">
                    {data.procedures_performed.map((p, idx) => (
                      <li
                        data-testid={`doctor-profile-procedure-${idx}`}
                        key={`${p}-${idx}`}
                        className="flex items-start gap-2 text-sm text-slate-600"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                        {p}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-slate-400">Not specified</p>
                )}
              </motion.div>
            </div>

            {/* Locations */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 data-testid="doctor-profile-locations-title" className="text-lg font-bold text-slate-900">
                Clinic / Hospital Locations
              </h2>

              {locations.length === 0 ? (
                <p className="mt-4 text-sm text-slate-400">No locations added</p>
              ) : (
                <Accordion
                  data-testid="doctor-profile-locations-accordion"
                  type="single"
                  collapsible
                  defaultValue={locations[0]?.id}
                  className="mt-4 space-y-3"
                >
                  {locations.map((l, idx) => {
                    const mapQuery = encodeURIComponent(
                      [l.facility_name, l.address, l.city, l.pincode]
                        .filter(Boolean)
                        .join(", ")
                    );
                    return (
                      <AccordionItem
                        data-testid={`doctor-profile-location-item-${idx}`}
                        key={l.id}
                        value={l.id}
                        className="overflow-hidden rounded-xl border border-slate-200"
                      >
                        <AccordionTrigger
                          data-testid={`doctor-profile-location-trigger-${idx}`}
                          className="px-4 py-3 text-left hover:no-underline [&[data-state=open]]:bg-slate-50"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-teal-50 to-emerald-50">
                              <MapPin className="h-5 w-5 text-teal-600" />
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">
                                {l.facility_name || `Location ${idx + 1}`}
                              </div>
                              <div className="text-xs text-slate-500">
                                {l.city} {l.pincode ? `• ${l.pincode}` : ""}
                              </div>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent
                          data-testid={`doctor-profile-location-content-${idx}`}
                          className="border-t border-slate-100 bg-slate-50/50 px-4 pb-4 pt-3"
                        >
                          <div className="space-y-3 text-sm">
                            <div className="text-slate-600">
                              {l.address || "—"}
                              {l.city ? `, ${l.city}` : ""}
                              {l.pincode ? ` - ${l.pincode}` : ""}
                            </div>
                            
                            {l.opd_timings && (
                              <div className="flex items-center gap-2 text-slate-600">
                                <Clock className="h-4 w-4 text-slate-400" />
                                <span className="font-medium">OPD:</span> {l.opd_timings}
                              </div>
                            )}
                            
                            {l.phone && (
                              <a
                                href={`tel:${l.phone}`}
                                className="flex items-center gap-2 font-medium text-teal-700 hover:text-teal-800"
                              >
                                <Phone className="h-4 w-4" />
                                {l.phone}
                              </a>
                            )}
                            
                            <a
                              data-testid={`doctor-profile-location-maps-${idx}`}
                              href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-slate-900"
                            >
                              Open in Google Maps
                              <ChevronRight className="h-4 w-4" />
                            </a>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 lg:sticky lg:top-24">
            {/* Contact Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-lg font-bold text-slate-900">Contact</h2>
              <div className="mt-4 space-y-3">
                {locations[0]?.phone && (
                  <>
                    <a
                      href={`tel:${locations[0].phone}`}
                      data-testid="doctor-profile-phone-cta"
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition-all hover:shadow-teal-500/40 hover:scale-[1.02]"
                    >
                      <Phone className="h-4 w-4" />
                      Call Clinic
                    </a>
                    <a
                      href={(() => {
                        // Clean the phone number - remove all non-digits
                        let phone = locations[0].phone.replace(/\D/g, "");
                        // If it starts with 0, remove it
                        if (phone.startsWith("0")) phone = phone.slice(1);
                        // If it's 10 digits (Indian mobile), add 91
                        if (phone.length === 10) phone = "91" + phone;
                        // If it starts with 91 and is 12 digits, it's correct
                        // Build the WhatsApp URL
                        const message = encodeURIComponent(`Hi Dr. ${data.name}, I found your profile on OrthoConnect and would like to consult regarding my orthopaedic concern.`);
                        return `https://api.whatsapp.com/send?phone=${phone}&text=${message}`;
                      })()}
                      target="_blank"
                      rel="noreferrer"
                      data-testid="doctor-profile-whatsapp-cta"
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-green-500/25 transition-all hover:shadow-green-500/40 hover:scale-[1.02]"
                    >
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </a>
                  </>
                )}
                
                {hasWebsite && (
                  <a
                    href={data.website.startsWith("http") ? data.website : `https://${data.website}`}
                    target="_blank"
                    rel="noreferrer"
                    data-testid="doctor-profile-website-cta"
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 hover:shadow-md"
                  >
                    <Globe className="h-4 w-4" />
                    Visit Website
                  </a>
                )}
              </div>
            </motion.div>

            {/* Disclaimer */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              data-testid="doctor-profile-disclaimer"
              className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-5"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <div className="text-sm font-semibold text-amber-900">Platform Notice</div>
                  <p className="mt-1 text-xs leading-relaxed text-amber-800">
                    This profile is self-declared by the surgeon and reviewed by OrthoConnect admin.
                    We do not recommend, rank, or endorse any doctor.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Back to Search */}
            <Link
              to="/"
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900 hover:shadow-md"
            >
              ← Back to Search
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
