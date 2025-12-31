import { useMemo, useState } from "react";
import { apiClient } from "@/lib/api";
import { SUBSPECIALTIES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";

const steps = [
  { key: "identity", label: "Identity" },
  { key: "practice", label: "Practice" },
  { key: "clinic", label: "Clinic" },
  { key: "uploads", label: "Uploads" },
];

export default function JoinSurgeon() {
  const api = useMemo(() => apiClient(), []);
  const [stepIndex, setStepIndex] = useState(0);
  const [subspecialtySet, setSubspecialtySet] = useState(new Set());
  const [form, setForm] = useState({
    name: "",
    qualifications: "",
    registrationNumber: "",
    about: "",
    conditionsTreated: "",
    proceduresPerformed: "",
    clinicAddress: "",
    clinicCity: "",
    clinicPincode: "",
    clinicOpdTimings: "",
    clinicPhone: "",
  });

  const [photoFile, setPhotoFile] = useState(null);
  const [docType, setDocType] = useState("registration");
  const [docFiles, setDocFiles] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  function setField(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  const activeStep = steps[stepIndex];

  function toggleSub(s) {
    setSubspecialtySet((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  function canContinue() {
    if (activeStep.key === "identity") {
      return (
        form.name.trim() &&
        form.qualifications.trim() &&
        form.registrationNumber.trim()
      );
    }
    if (activeStep.key === "clinic") {
      return form.clinicAddress.trim() && form.clinicPincode.trim().length >= 3;
    }
    if (activeStep.key === "uploads") {
      return docFiles.length >= 1;
    }
    return true;
  }

  async function submit() {
    setSubmitting(true);
    setError("");
    try {
      const subs = Array.from(subspecialtySet);

      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("qualifications", form.qualifications);
      fd.append("registration_number", form.registrationNumber);
      fd.append("subspecialties", subs.join(","));
      fd.append("about", form.about);
      fd.append("conditions_treated", form.conditionsTreated);
      fd.append("procedures_performed", form.proceduresPerformed);
      fd.append("clinic_address", form.clinicAddress);
      fd.append("clinic_city", form.clinicCity);
      fd.append("clinic_pincode", form.clinicPincode);
      fd.append("clinic_opd_timings", form.clinicOpdTimings);
      fd.append("clinic_phone", form.clinicPhone);
      if (photoFile) fd.append("profile_photo", photoFile);

      const created = await api.post("/surgeons/join", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const { id, upload_token } = created.data;

      const docsFd = new FormData();
      docsFd.append("doc_type", docType);
      docFiles.forEach((f) => docsFd.append("files", f));

      await api.post(`/surgeons/${id}/documents`, docsFd, {
        headers: {
          "Content-Type": "multipart/form-data",
          "X-Upload-Token": upload_token,
        },
      });

      setResult({ ...created.data, uploadedDocs: docFiles.length });
    } catch (e) {
      setError(e?.response?.data?.detail || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <main data-testid="join-success" className="bg-white">
        <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h1
              data-testid="join-success-title"
              className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl"
            >
              Profile submitted for review
            </h1>
            <p
              data-testid="join-success-subtext"
              className="mt-3 text-sm leading-relaxed text-slate-600"
            >
              Thank you. Your profile is currently <b>pending admin approval</b>.
              Once approved, it will appear in public search.
            </p>

            <div
              data-testid="join-success-details"
              className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700"
            >
              <div>Profile ID: {result.id}</div>
              <div>Documents uploaded: {result.uploadedDocs}</div>
            </div>

            <div
              data-testid="join-success-disclaimer"
              className="mt-5 text-xs text-slate-500"
            >
              This platform does not recommend or rank doctors. No appointment
              booking is provided.
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main data-testid="join-page" className="bg-white">
      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1
              data-testid="join-title"
              className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl"
            >
              Join as Surgeon (Free)
            </h1>
            <p
              data-testid="join-subtitle"
              className="mt-2 text-sm leading-relaxed text-slate-600"
            >
              Create your professional profile. Profiles go live only after admin
              approval. No paid listings.
            </p>
          </div>
          <div data-testid="join-step-indicator" className="text-xs text-slate-500">
            Step {stepIndex + 1} of {steps.length}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {steps.map((s, idx) => (
            <div
              data-testid={`join-step-${s.key}`}
              key={s.key}
              className={[
                "rounded-2xl border px-4 py-3",
                idx === stepIndex
                  ? "border-sky-200 bg-sky-50"
                  : "border-slate-200 bg-white",
              ].join(" ")}
            >
              <div className="text-xs font-semibold text-slate-900">
                {idx + 1}. {s.label}
              </div>
            </div>
          ))}
        </div>

        {error ? (
          <div
            data-testid="join-error"
            className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
          >
            {error}
          </div>
        ) : null}

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {activeStep.key === "identity" ? (
            <div data-testid="join-step-identity" className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-slate-700">Name</div>
                  <Input
                    data-testid="join-name-input"
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    placeholder="Dr. First Last"
                    className="h-11 rounded-xl border-slate-200 bg-slate-50/60"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-slate-700">
                    Qualification
                  </div>
                  <Input
                    data-testid="join-qualification-input"
                    value={form.qualifications}
                    onChange={(e) => setField("qualifications", e.target.value)}
                    placeholder="MS Ortho, DNB, Fellowship…"
                    className="h-11 rounded-xl border-slate-200 bg-slate-50/60"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-slate-700">
                  Medical Registration Number (mandatory)
                </div>
                <Input
                  data-testid="join-registration-input"
                  value={form.registrationNumber}
                  onChange={(e) => setField("registrationNumber", e.target.value)}
                  placeholder="e.g., MCI/State Reg. No."
                  className="h-11 rounded-xl border-slate-200 bg-slate-50/60"
                />
              </div>
            </div>
          ) : null}

          {activeStep.key === "practice" ? (
            <div data-testid="join-step-practice" className="grid gap-5">
              <div>
                <div
                  data-testid="join-subspecialty-title"
                  className="text-xs font-semibold text-slate-700"
                >
                  Subspecialty focus
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {SUBSPECIALTIES.map((s) => (
                    <label
                      data-testid={`join-subspecialty-${s.toLowerCase()}`}
                      key={s}
                      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3"
                    >
                      <Checkbox
                        data-testid={`join-subspecialty-checkbox-${s.toLowerCase()}`}
                        checked={subspecialtySet.has(s)}
                        onCheckedChange={() => toggleSub(s)}
                      />
                      <div className="text-sm font-medium text-slate-800">{s}</div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-slate-700">About</div>
                <Textarea
                  data-testid="join-about-textarea"
                  value={form.about}
                  onChange={(e) => setField("about", e.target.value)}
                  placeholder="Short professional bio (no marketing, no pricing, no claims)"
                  className="min-h-[110px] rounded-2xl border-slate-200 bg-slate-50/60"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-slate-700">
                    Conditions treated (comma separated)
                  </div>
                  <Textarea
                    data-testid="join-conditions-textarea"
                    value={form.conditionsTreated}
                    onChange={(e) => setField("conditionsTreated", e.target.value)}
                    placeholder="e.g., knee arthritis, meniscus tear"
                    className="min-h-[110px] rounded-2xl border-slate-200 bg-slate-50/60"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-slate-700">
                    Procedures performed (comma separated)
                  </div>
                  <Textarea
                    data-testid="join-procedures-textarea"
                    value={form.proceduresPerformed}
                    onChange={(e) => setField("proceduresPerformed", e.target.value)}
                    placeholder="e.g., arthroscopy, joint replacement"
                    className="min-h-[110px] rounded-2xl border-slate-200 bg-slate-50/60"
                  />
                </div>
              </div>
            </div>
          ) : null}

          {activeStep.key === "clinic" ? (
            <div data-testid="join-step-clinic" className="grid gap-4">
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-slate-700">
                  Clinic / Hospital address
                </div>
                <Textarea
                  data-testid="join-clinic-address-textarea"
                  value={form.clinicAddress}
                  onChange={(e) => setField("clinicAddress", e.target.value)}
                  placeholder="Full address"
                  className="min-h-[110px] rounded-2xl border-slate-200 bg-slate-50/60"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-slate-700">City</div>
                  <Input
                    data-testid="join-city-input"
                    value={form.clinicCity}
                    onChange={(e) => setField("clinicCity", e.target.value)}
                    placeholder="e.g., Mumbai"
                    className="h-11 rounded-xl border-slate-200 bg-slate-50/60"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-slate-700">
                    Pincode
                  </div>
                  <Input
                    data-testid="join-pincode-input"
                    value={form.clinicPincode}
                    onChange={(e) => setField("clinicPincode", e.target.value)}
                    placeholder="e.g., 400001"
                    className="h-11 rounded-xl border-slate-200 bg-slate-50/60"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-slate-700">
                    Clinic phone
                  </div>
                  <Input
                    data-testid="join-phone-input"
                    value={form.clinicPhone}
                    onChange={(e) => setField("clinicPhone", e.target.value)}
                    placeholder="Clinic phone (no personal numbers)"
                    className="h-11 rounded-xl border-slate-200 bg-slate-50/60"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-slate-700">OPD timings</div>
                <Input
                  data-testid="join-opd-input"
                  value={form.clinicOpdTimings}
                  onChange={(e) => setField("clinicOpdTimings", e.target.value)}
                  placeholder="e.g., Mon–Sat 6–8pm"
                  className="h-11 rounded-xl border-slate-200 bg-slate-50/60"
                />
              </div>
            </div>
          ) : null}

          {activeStep.key === "uploads" ? (
            <div data-testid="join-step-uploads" className="grid gap-5">
              <Card className="rounded-2xl border-slate-200 p-4 shadow-none">
                <div
                  data-testid="join-photo-title"
                  className="text-sm font-semibold text-slate-900"
                >
                  Profile photo (optional)
                </div>
                <div className="mt-3">
                  <Input
                    data-testid="join-photo-input"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                  />
                </div>
              </Card>

              <Card className="rounded-2xl border-slate-200 p-4 shadow-none">
                <div
                  data-testid="join-docs-title"
                  className="text-sm font-semibold text-slate-900"
                >
                  Verification documents (upload at least 1)
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  Examples: medical registration proof, degree certificate.
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <div className="text-xs font-semibold text-slate-700">Type</div>
                    <div className="mt-2 flex gap-2">
                      {["registration", "degree", "other"].map((t) => (
                        <button
                          data-testid={`join-doc-type-${t}`}
                          key={t}
                          type="button"
                          onClick={() => setDocType(t)}
                          className={[
                            "rounded-full border px-3 py-1.5 text-xs",
                            "transition-[background-color,border-color,color]",
                            docType === t
                              ? "border-sky-200 bg-sky-50 text-sky-900"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                          ].join(" ")}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-slate-700">Files</div>
                    <Input
                      data-testid="join-docs-input"
                      className="mt-2"
                      type="file"
                      multiple
                      onChange={(e) => setDocFiles(Array.from(e.target.files || []))}
                    />
                    <div
                      data-testid="join-docs-count"
                      className="mt-2 text-xs text-slate-500"
                    >
                      Selected: {docFiles.length}
                    </div>
                  </div>
                </div>
              </Card>

              <div
                data-testid="join-uploads-note"
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600"
              >
                Document uploads are used only for admin verification and are not
                publicly visible.
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex items-center justify-between gap-3">
            <Button
              data-testid="join-back-button"
              variant="secondary"
              disabled={stepIndex === 0 || submitting}
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              className="h-10 rounded-full bg-slate-100 text-slate-800 hover:bg-slate-200"
            >
              Back
            </Button>

            {stepIndex < steps.length - 1 ? (
              <Button
                data-testid="join-next-button"
                disabled={!canContinue() || submitting}
                onClick={() => setStepIndex((i) => Math.min(steps.length - 1, i + 1))}
                className="h-10 rounded-full bg-sky-700 px-6 text-white hover:bg-sky-800 disabled:opacity-50"
              >
                Continue
              </Button>
            ) : (
              <Button
                data-testid="join-submit-button"
                disabled={!canContinue() || submitting}
                onClick={submit}
                className="h-10 rounded-full bg-slate-900 px-6 text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {submitting ? "Submitting…" : "Submit for approval"}
              </Button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
