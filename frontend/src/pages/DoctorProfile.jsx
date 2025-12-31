import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { apiClient } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
      <main
        data-testid="doctor-profile-loading"
        className="mx-auto max-w-6xl px-4 py-10 sm:px-6"
      >
        <div className="text-sm text-slate-600">Loading profile…</div>
      </main>
    );
  }

  if (error) {
    return (
      <main
        data-testid="doctor-profile-error"
        className="mx-auto max-w-6xl px-4 py-10 sm:px-6"
      >
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      </main>
    );
  }

  if (!data) return null;

  const locations = data.locations || [];

  return (
    <main data-testid="doctor-profile-page" className="bg-white">
      {jsonLd ? (
        <script
          data-testid="doctor-profile-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-start">
          <div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  {data.public_photo_url ? (
                    <img
                      data-testid="doctor-profile-photo"
                      src={`${process.env.REACT_APP_BACKEND_URL}${data.public_photo_url}`}
                      alt=""
                      className="h-16 w-16 rounded-2xl border border-slate-200 object-cover"
                    />
                  ) : (
                    <div
                      data-testid="doctor-profile-photo-placeholder"
                      className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-600"
                    >
                      {(data.name || "").trim().slice(0, 2).toUpperCase() || "DR"}
                    </div>
                  )}

                  <div>
                    <h1
                      data-testid="doctor-profile-name"
                      className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl"
                    >
                      {data.name}
                    </h1>
                    <div
                      data-testid="doctor-profile-qualifications"
                      className="mt-2 text-sm text-slate-600"
                    >
                      {data.qualifications}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <div
                    data-testid="doctor-profile-reg-label"
                    className="text-xs font-semibold text-slate-600"
                  >
                    Medical Registration No.
                  </div>
                  <div
                    data-testid="doctor-profile-reg-number"
                    className="mt-1 text-sm font-semibold text-slate-900"
                  >
                    {data.registration_number}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {(data.subspecialties || []).map((s) => (
                  <Badge
                    data-testid={`doctor-profile-subspecialty-${s.toLowerCase()}`}
                    key={s}
                    className="rounded-full bg-sky-50 text-sky-800 hover:bg-sky-50"
                  >
                    {s}
                  </Badge>
                ))}
              </div>

              <div className="mt-6 grid gap-4">
                <Card className="rounded-2xl border-slate-200 p-5 shadow-none">
                  <div
                    data-testid="doctor-profile-about-title"
                    className="text-sm font-semibold text-slate-900"
                  >
                    About the Doctor
                  </div>
                  <div
                    data-testid="doctor-profile-about-body"
                    className="mt-2 text-sm leading-relaxed text-slate-600"
                  >
                    {data.about || "—"}
                  </div>
                </Card>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="rounded-2xl border-slate-200 p-5 shadow-none">
                    <div
                      data-testid="doctor-profile-conditions-title"
                      className="text-sm font-semibold text-slate-900"
                    >
                      Conditions treated
                    </div>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                      {(data.conditions_treated || []).length ? (
                        data.conditions_treated.map((c, idx) => (
                          <li
                            data-testid={`doctor-profile-condition-${idx}`}
                            key={`${c}-${idx}`}
                          >
                            {c}
                          </li>
                        ))
                      ) : (
                        <li data-testid="doctor-profile-conditions-empty">—</li>
                      )}
                    </ul>
                  </Card>

                  <Card className="rounded-2xl border-slate-200 p-5 shadow-none">
                    <div
                      data-testid="doctor-profile-procedures-title"
                      className="text-sm font-semibold text-slate-900"
                    >
                      Procedures performed
                    </div>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                      {(data.procedures_performed || []).length ? (
                        data.procedures_performed.map((p, idx) => (
                          <li
                            data-testid={`doctor-profile-procedure-${idx}`}
                            key={`${p}-${idx}`}
                          >
                            {p}
                          </li>
                        ))
                      ) : (
                        <li data-testid="doctor-profile-procedures-empty">—</li>
                      )}
                    </ul>
                  </Card>
                </div>
              </div>
            </div>

            <div
              data-testid="doctor-profile-disclaimer"
              className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600"
            >
              This profile information is self-declared by the surgeon and is
              shown after admin review. This platform does not recommend or rank
              doctors.
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div
                data-testid="doctor-profile-locations-title"
                className="text-sm font-semibold text-slate-900"
              >
                Clinic / Hospital locations
              </div>

              {!locations.length ? (
                <div
                  data-testid="doctor-profile-locations-empty"
                  className="mt-2 text-sm text-slate-600"
                >
                  —
                </div>
              ) : (
                <Accordion
                  data-testid="doctor-profile-locations-accordion"
                  type="single"
                  collapsible
                  className="mt-3"
                >
                  {locations.map((l, idx) => {
                    const mapQuery = encodeURIComponent(
                      [l.facility_name, l.address, l.city, l.pincode]
                        .filter(Boolean)
                        .join(", "),
                    );
                    return (
                      <AccordionItem
                        data-testid={`doctor-profile-location-item-${idx}`}
                        key={l.id}
                        value={l.id}
                        className="rounded-2xl border border-slate-200 px-3"
                      >
                        <AccordionTrigger
                          data-testid={`doctor-profile-location-trigger-${idx}`}
                          className="text-left"
                        >
                          <div>
                            <div className="text-sm font-semibold text-slate-900">
                              {l.facility_name || `Location ${idx + 1}`}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {l.city} {l.pincode ? `· ${l.pincode}` : ""}
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent
                          data-testid={`doctor-profile-location-content-${idx}`}
                        >
                          <div className="space-y-3 pb-3 text-sm text-slate-600">
                            <div>
                              {l.address || "—"}
                              {l.city ? `, ${l.city}` : ""}
                              {l.pincode ? ` - ${l.pincode}` : ""}
                            </div>
                            <div>
                              <span className="text-xs font-semibold text-slate-700">
                                OPD:
                              </span>{" "}
                              {l.opd_timings || "—"}
                            </div>
                            <div>
                              <span className="text-xs font-semibold text-slate-700">
                                Phone:
                              </span>{" "}
                              {l.phone || "—"}
                            </div>
                            <a
                              data-testid={`doctor-profile-location-maps-${idx}`}
                              href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex text-sm font-medium text-sky-700 hover:text-sky-800 transition-colors"
                            >
                              Open in Google Maps →
                            </a>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div
                data-testid="doctor-profile-contact-note"
                className="text-xs text-slate-500"
              >
                Note: OrthoConnect does not provide appointment booking.
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
