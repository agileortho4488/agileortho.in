import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { apiClient } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

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
        const res = await api.get(`/surgeons/by-slug/${slug}`);
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
    const address = data?.clinic?.address || "";
    const city = data?.clinic?.city || "";
    const pincode = data?.clinic?.pincode || "";
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
      <main data-testid="doctor-profile-loading" className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="text-sm text-slate-600">Loading profile…</div>
      </main>
    );
  }

  if (error) {
    return (
      <main data-testid="doctor-profile-error" className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      </main>
    );
  }

  if (!data) return null;

  const mapQuery = encodeURIComponent(
    [data?.clinic?.address, data?.clinic?.city, data?.clinic?.pincode]
      .filter(Boolean)
      .join(", "),
  );

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
              <div className="flex flex-wrap items-start justify-between gap-3">
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
                data-testid="doctor-profile-clinic-title"
                className="text-sm font-semibold text-slate-900"
              >
                Clinic / Hospital location
              </div>
              <div
                data-testid="doctor-profile-clinic-address"
                className="mt-2 text-sm leading-relaxed text-slate-600"
              >
                {data?.clinic?.address || "—"}
                {data?.clinic?.city ? `, ${data.clinic.city}` : ""}
                {data?.clinic?.pincode ? ` - ${data.clinic.pincode}` : ""}
              </div>

              <a
                data-testid="doctor-profile-google-maps-link"
                href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex text-sm font-medium text-sky-700 hover:text-sky-800 transition-colors"
              >
                Open in Google Maps →
              </a>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div
                data-testid="doctor-profile-opd-title"
                className="text-sm font-semibold text-slate-900"
              >
                OPD timings
              </div>
              <div
                data-testid="doctor-profile-opd-body"
                className="mt-2 text-sm text-slate-600"
              >
                {data?.clinic?.opd_timings || "—"}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div
                data-testid="doctor-profile-contact-title"
                className="text-sm font-semibold text-slate-900"
              >
                Contact (clinic phone)
              </div>
              <div
                data-testid="doctor-profile-contact-phone"
                className="mt-2 text-sm font-semibold text-slate-900"
              >
                {data?.clinic?.phone || "—"}
              </div>
              <div
                data-testid="doctor-profile-contact-note"
                className="mt-2 text-xs text-slate-500"
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
