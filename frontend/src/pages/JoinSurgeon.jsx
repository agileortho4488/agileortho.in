import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api";
import { SUBSPECIALTIES } from "@/lib/constants";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import ProfilePhotoBlock from "@/components/profile/ProfilePhotoBlock";

function emptyLocation() {
  const id = globalThis.crypto?.randomUUID?.() || String(Date.now());
  return {
    id,
    facility_name: "",
    address: "",
    city: "",
    pincode: "",
    opd_timings: "",
    phone: "",
  };
}

function getToken() {
  return localStorage.getItem("oc_surgeon_token") || "";
}

export default function JoinSurgeon() {
  const api = useMemo(() => apiClient(), []);

  const [authStep, setAuthStep] = useState("request"); // request | verify | dashboard
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [mockedOtp, setMockedOtp] = useState(null);
  const [smsSent, setSmsSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);

  const [status, setStatus] = useState(null);
  const [profileExists, setProfileExists] = useState(false);

  const [subspecialtySet, setSubspecialtySet] = useState(new Set());
  const [profile, setProfile] = useState({
    qualifications: "",
    registration_number: "",
    about: "",
    conditions_treated: "",
    procedures_performed: "",
    website: "",
  });
  const [locations, setLocations] = useState([emptyLocation()]);

  const [docType, setDocType] = useState("registration");
  const [docFiles, setDocFiles] = useState([]);

  async function requestOtp() {
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/otp/request", { mobile });
      setSmsSent(res.data.sms_sent);
      setMockedOtp(res.data.mocked_otp || null);
      setAuthStep("verify");
      // Start 30 second countdown for resend
      setResendCountdown(30);
    } catch (e) {
      setError(e?.response?.data?.detail || "OTP request failed");
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    if (resendCountdown > 0) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/otp/request", { mobile });
      setSmsSent(res.data.sms_sent);
      setMockedOtp(res.data.mocked_otp || null);
      // Restart countdown
      setResendCountdown(30);
    } catch (e) {
      setError(e?.response?.data?.detail || "Resend failed");
    } finally {
      setLoading(false);
    }
  }

  // Countdown timer effect
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => {
      setResendCountdown((c) => c - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  async function verifyOtp() {
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/otp/verify", { mobile, code: otp });
      localStorage.setItem("oc_surgeon_token", res.data.token);
      setAuthStep("dashboard");
    } catch (e) {
      setError(e?.response?.data?.detail || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  }

  async function loadExistingProfile() {
    const token = getToken();
    if (!token) return;
    try {
      const res = await api.get("/surgeon/me/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.exists) {
        setProfileExists(true);
        setStatus(res.data.status);
        setProfile({
          qualifications: res.data.qualifications || "",
          registration_number: res.data.registration_number || "",
          about: res.data.about || "",
          conditions_treated: (res.data.conditions_treated || []).join(", "),
          procedures_performed: (res.data.procedures_performed || []).join(", "),
          website: res.data.website || "",
        });
        setSubspecialtySet(new Set(res.data.subspecialties || []));
        setLocations(
          (res.data.locations || []).length ? res.data.locations : [emptyLocation()],
        );
      } else {
        setProfileExists(false);
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (getToken()) {
      setAuthStep("dashboard");
      loadExistingProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleSub(s) {
    setSubspecialtySet((prev) => {
      const next = new Set(prev);
      if (next.has(s)) {
        next.delete(s);
      } else {
        // Limit to max 2 subspecialties
        if (next.size >= 2) {
          return prev; // Don't add more if already 2
        }
        next.add(s);
      }
      return next;
    });
  }

  async function submitProfile() {
    setLoading(true);
    setError("");
    try {
      const token = getToken();
      const payload = {
        qualifications: profile.qualifications,
        registration_number: profile.registration_number,
        subspecialties: Array.from(subspecialtySet),
        about: profile.about,
        website: profile.website,
        conditions_treated: profile.conditions_treated
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        procedures_performed: profile.procedures_performed
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        locations: locations.map((l) => ({
          id: l.id,
          facility_name: l.facility_name,
          address: l.address,
          city: l.city,
          pincode: l.pincode,
          opd_timings: l.opd_timings,
          phone: l.phone,
        })),
      };

      await api.put("/surgeon/me/profile", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (docFiles.length) {
        const docsFd = new FormData();
        docsFd.append("doc_type", docType);
        docFiles.forEach((f) => docsFd.append("files", f));

        await api.post("/surgeon/me/profile/documents", docsFd, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        });
      }

      setStatus("pending");
      setProfileExists(true); // Enable photo upload after profile submission
    } catch (e) {
      setError(e?.response?.data?.detail || "Submission failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main data-testid="surgeon-portal-page" className="bg-white">
      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1
              data-testid="surgeon-portal-title"
              className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl"
            >
              Surgeon Portal
            </h1>
            <p
              data-testid="surgeon-portal-subtitle"
              className="mt-2 text-sm leading-relaxed text-slate-600"
            >
              Login with mobile OTP. Fill your profile and submit for admin
              approval.
            </p>
          </div>

          {authStep === "dashboard" ? (
            <Button
              data-testid="surgeon-logout-button"
              variant="secondary"
              onClick={() => {
                localStorage.removeItem("oc_surgeon_token");
                setAuthStep("request");
                setStatus(null);
              }}
              className="h-10 rounded-full bg-slate-100 text-slate-800 hover:bg-slate-200"
            >
              Logout
            </Button>
          ) : null}
        </div>

        {error ? (
          <div
            data-testid="surgeon-portal-error"
            className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
          >
            {error}
          </div>
        ) : null}

        {authStep !== "dashboard" ? (
          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-slate-700">Mobile</div>
                <Input
                  data-testid="surgeon-mobile-input"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="10-digit mobile"
                  className="h-11 rounded-xl border-slate-200 bg-slate-50/60"
                />
              </div>

              {authStep === "verify" ? (
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-slate-700">OTP</div>
                  <Input
                    data-testid="surgeon-otp-input"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="6-digit OTP"
                    className="h-11 rounded-xl border-slate-200 bg-slate-50/60"
                  />
                </div>
              ) : null}
            </div>

            {authStep === "verify" && smsSent ? (
              <div
                data-testid="surgeon-sms-sent"
                className="mt-4 rounded-2xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900"
              >
                OTP sent to your mobile number. Please check your SMS.
              </div>
            ) : null}

            {mockedOtp && authStep === "verify" && !smsSent ? (
              <div
                data-testid="surgeon-mocked-otp"
                className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
              >
                Development Mode - OTP: <b>{mockedOtp}</b>
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              {authStep === "request" ? (
                <Button
                  data-testid="surgeon-request-otp-button"
                  onClick={requestOtp}
                  disabled={loading || mobile.replace(/\D/g, "").length < 10}
                  className="h-11 rounded-xl bg-sky-700 px-6 text-white hover:bg-sky-800 disabled:opacity-50"
                >
                  {loading ? "Sending…" : "Send OTP"}
                </Button>
              ) : (
                <>
                  <Button
                    data-testid="surgeon-verify-otp-button"
                    onClick={verifyOtp}
                    disabled={loading || otp.trim().length !== 6}
                    className="h-11 rounded-xl bg-slate-900 px-6 text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {loading ? "Verifying…" : "Verify & Continue"}
                  </Button>
                  <Button
                    data-testid="surgeon-resend-otp-button"
                    onClick={resendOtp}
                    disabled={loading || resendCountdown > 0}
                    variant="outline"
                    className="h-11 rounded-xl border-slate-200 px-6 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : "Resend OTP"}
                  </Button>
                  <button
                    data-testid="surgeon-change-mobile-button"
                    type="button"
                    onClick={() => {
                      setAuthStep("request");
                      setOtp("");
                      setMockedOtp(null);
                      setSmsSent(false);
                      setResendCountdown(0);
                    }}
                    className="text-sm text-slate-500 underline hover:text-slate-700"
                  >
                    Change number
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div
                    data-testid="surgeon-profile-status-title"
                    className="text-sm font-semibold text-slate-900"
                  >
                    Profile status
                  </div>
                  <div
                    data-testid="surgeon-profile-status"
                    className="mt-1 text-sm text-slate-600"
                  >
                    {status ? status : "not submitted yet"}
                  </div>
                </div>
                <div
                  data-testid="surgeon-profile-status-note"
                  className="text-xs text-slate-500"
                >
                  Admin will make it live after review.
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">
                Professional details
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-slate-700">
                    Qualification
                  </div>
                  <Input
                    data-testid="surgeon-qualification-input"
                    value={profile.qualifications}
                    onChange={(e) =>
                      setProfile((p) => ({ ...p, qualifications: e.target.value }))
                    }
                    className="h-11 rounded-xl border-slate-200 bg-slate-50/60"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-slate-700">
                    Medical Registration No.
                  </div>
                  <Input
                    data-testid="surgeon-registration-input"
                    value={profile.registration_number}
                    onChange={(e) =>
                      setProfile((p) => ({ ...p, registration_number: e.target.value }))
                    }
                    className="h-11 rounded-xl border-slate-200 bg-slate-50/60"
                  />
                </div>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-700">
                    Subspecialty focus (select up to 2)
                  </div>
                  <div className="text-xs text-slate-500">
                    {subspecialtySet.size}/2 selected
                  </div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {SUBSPECIALTIES.map((s) => (
                    <label
                      data-testid={`surgeon-subspecialty-${s.toLowerCase()}`}
                      key={s}
                      className={`flex items-center gap-3 rounded-2xl border p-3 transition-all ${
                        subspecialtySet.has(s)
                          ? "border-teal-300 bg-teal-50"
                          : subspecialtySet.size >= 2
                          ? "border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <Checkbox
                        data-testid={`surgeon-subspecialty-checkbox-${s.toLowerCase()}`}
                        checked={subspecialtySet.has(s)}
                        onCheckedChange={() => toggleSub(s)}
                        disabled={!subspecialtySet.has(s) && subspecialtySet.size >= 2}
                      />
                      <div className="text-sm font-medium text-slate-800">{s}</div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-5 space-y-1.5">
                <div className="text-xs font-semibold text-slate-700">
                  Personal/Clinic Website (optional)
                </div>
                <Input
                  data-testid="surgeon-website-input"
                  value={profile.website}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, website: e.target.value }))
                  }
                  placeholder="https://www.example.com"
                  className="h-11 rounded-xl border-slate-200 bg-slate-50/60"
                />
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-slate-700">About</div>
                  <Textarea
                    data-testid="surgeon-about-textarea"
                    value={profile.about}
                    onChange={(e) =>
                      setProfile((p) => ({ ...p, about: e.target.value }))
                    }
                    className="min-h-[110px] rounded-2xl border-slate-200 bg-slate-50/60"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-slate-700">
                    Conditions treated (comma separated)
                  </div>
                  <Textarea
                    data-testid="surgeon-conditions-textarea"
                    value={profile.conditions_treated}
                    onChange={(e) =>
                      setProfile((p) => ({ ...p, conditions_treated: e.target.value }))
                    }
                    placeholder="e.g., ACL tear, Meniscus injury, Knee arthritis"
                    className="min-h-[110px] rounded-2xl border-slate-200 bg-slate-50/60"
                  />
                </div>
              </div>

              <div className="mt-4 space-y-1.5">
                <div className="text-xs font-semibold text-slate-700">
                  Procedures performed (comma separated)
                </div>
                <Textarea
                  data-testid="surgeon-procedures-textarea"
                  value={profile.procedures_performed}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, procedures_performed: e.target.value }))
                  }
                  placeholder="e.g., ACL reconstruction, Knee replacement, Arthroscopy"
                  className="min-h-[110px] rounded-2xl border-slate-200 bg-slate-50/60"
                />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-900">Locations</div>
                <Button
                  data-testid="surgeon-add-location"
                  type="button"
                  variant="secondary"
                  onClick={() => setLocations((ls) => [...ls, emptyLocation()])}
                  className="h-9 rounded-full bg-slate-100 text-slate-800 hover:bg-slate-200"
                >
                  Add
                </Button>
              </div>

              <div className="mt-4 grid gap-4">
                {locations.map((l, idx) => (
                  <Card
                    data-testid={`surgeon-location-card-${idx}`}
                    key={l.id}
                    className="rounded-3xl border-slate-200 p-5 shadow-none"
                  >
                    <div className="flex items-start justify-between">
                      <div className="text-sm font-semibold text-slate-900">
                        Location {idx + 1}
                      </div>
                      {locations.length > 1 ? (
                        <button
                          data-testid={`surgeon-remove-location-${idx}`}
                          type="button"
                          className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                          onClick={() =>
                            setLocations((ls) => ls.filter((x) => x.id !== l.id))
                          }
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <div className="text-xs font-semibold text-slate-700">Name</div>
                        <Input
                          data-testid={`surgeon-location-facility-${idx}`}
                          value={l.facility_name}
                          onChange={(e) =>
                            setLocations((ls) =>
                              ls.map((x) =>
                                x.id === l.id
                                  ? { ...x, facility_name: e.target.value }
                                  : x,
                              ),
                            )
                          }
                          className="h-11 rounded-xl border-slate-200 bg-slate-50/60"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <div className="text-xs font-semibold text-slate-700">City</div>
                        <Input
                          data-testid={`surgeon-location-city-${idx}`}
                          value={l.city}
                          onChange={(e) =>
                            setLocations((ls) =>
                              ls.map((x) =>
                                x.id === l.id ? { ...x, city: e.target.value } : x,
                              ),
                            )
                          }
                          className="h-11 rounded-xl border-slate-200 bg-slate-50/60"
                        />
                      </div>
                    </div>

                    <div className="mt-4 space-y-1.5">
                      <div className="text-xs font-semibold text-slate-700">Address</div>
                      <Textarea
                        data-testid={`surgeon-location-address-${idx}`}
                        value={l.address}
                        onChange={(e) =>
                          setLocations((ls) =>
                            ls.map((x) =>
                              x.id === l.id
                                ? { ...x, address: e.target.value }
                                : x,
                            ),
                          )
                        }
                        className="min-h-[90px] rounded-2xl border-slate-200 bg-slate-50/60"
                      />
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                      <div className="space-y-1.5">
                        <div className="text-xs font-semibold text-slate-700">Pincode</div>
                        <Input
                          data-testid={`surgeon-location-pincode-${idx}`}
                          value={l.pincode}
                          onChange={(e) =>
                            setLocations((ls) =>
                              ls.map((x) =>
                                x.id === l.id
                                  ? { ...x, pincode: e.target.value }
                                  : x,
                              ),
                            )
                          }
                          className="h-11 rounded-xl border-slate-200 bg-slate-50/60"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <div className="text-xs font-semibold text-slate-700">OPD</div>
                        <Input
                          data-testid={`surgeon-location-opd-${idx}`}
                          value={l.opd_timings}
                          onChange={(e) =>
                            setLocations((ls) =>
                              ls.map((x) =>
                                x.id === l.id
                                  ? { ...x, opd_timings: e.target.value }
                                  : x,
                              ),
                            )
                          }
                          className="h-11 rounded-xl border-slate-200 bg-slate-50/60"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <div className="text-xs font-semibold text-slate-700">Phone</div>
                        <Input
                          data-testid={`surgeon-location-phone-${idx}`}
                          value={l.phone}
                          onChange={(e) =>
                            setLocations((ls) =>
                              ls.map((x) =>
                                x.id === l.id
                                  ? { ...x, phone: e.target.value }
                                  : x,
                              ),
                            )
                          }
                          className="h-11 rounded-xl border-slate-200 bg-slate-50/60"
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <ProfilePhotoBlock
              onUploaded={loadExistingProfile}
              disabled={!profileExists}
              disabledReason="Submit your profile details once (Qualification/Registration/Locations), then upload a photo."
            />

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">Documents</div>
              <div className="mt-2 text-xs text-slate-500">
                Upload registration proof/degree certificates. These are private
                and used for admin verification.
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div>
                  <div className="text-xs font-semibold text-slate-700">Type</div>
                  <div className="mt-2 flex gap-2">
                    {["registration", "degree", "other"].map((t) => (
                      <button
                        data-testid={`surgeon-doc-type-${t}`}
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
                    data-testid="surgeon-docs-input"
                    className="mt-2"
                    type="file"
                    multiple
                    onChange={(e) => setDocFiles(Array.from(e.target.files || []))}
                  />
                  <div
                    data-testid="surgeon-docs-count"
                    className="mt-2 text-xs text-slate-500"
                  >
                    Selected: {docFiles.length}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Button
                data-testid="surgeon-submit-profile"
                onClick={submitProfile}
                disabled={loading}
                className="h-11 rounded-xl bg-slate-900 px-6 text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {loading ? "Submitting…" : "Submit for approval"}
              </Button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
