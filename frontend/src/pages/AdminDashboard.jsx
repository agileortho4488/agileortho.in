import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function getToken() {
  return localStorage.getItem("oc_admin_token") || "";
}

function statusBadge(status) {
  const map = {
    pending: "bg-amber-50 text-amber-800",
    approved: "bg-emerald-50 text-emerald-800",
    rejected: "bg-rose-50 text-rose-800",
    needs_clarification: "bg-blue-50 text-blue-800",
  };
  return map[status] || "bg-slate-100 text-slate-700";
}

export default function AdminDashboard() {
  const api = useMemo(() => apiClient(), []);
  const navigate = useNavigate();
  const [tab, setTab] = useState("pending");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  const [selectedId, setSelectedId] = useState(null);
  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) || null,
    [items, selectedId],
  );

  const [rejectionReason, setRejectionReason] = useState("");
  const [subspecialties, setSubspecialties] = useState("");
  const [photoVisibility, setPhotoVisibility] = useState("admin_only");

  async function load(status) {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/admin/surgeons", {
        params: { status },
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setItems(res.data || []);
      setSelectedId(res.data?.[0]?.id || null);
    } catch (e) {
      const msg = e?.response?.data?.detail || "Unable to load";
      setError(msg);
      if (e?.response?.status === 401) {
        localStorage.removeItem("oc_admin_token");
        navigate("/admin");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    setRejectionReason(selected?.rejection_reason || "");
    setSubspecialties((selected?.subspecialties || []).join(", "));
    setPhotoVisibility(selected?.photo_visibility || "admin_only");
  }, [selected]);

  async function approve() {
    if (!selected) return;
    await api.patch(
      `/admin/surgeons/${selected.id}`,
      {
        status: "approved",
        subspecialties: subspecialties
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        photo_visibility: photoVisibility,
      },
      { headers: { Authorization: `Bearer ${getToken()}` } },
    );
    load(tab);
  }

  async function reject() {
    if (!selected) return;
    await api.patch(
      `/admin/surgeons/${selected.id}`,
      {
        status: "rejected",
        rejection_reason: rejectionReason || "Not specified",
        photo_visibility: photoVisibility,
      },
      { headers: { Authorization: `Bearer ${getToken()}` } },
    );
    load(tab);
  }

  function downloadLink(docId) {
    const backend = process.env.REACT_APP_BACKEND_URL;
    const token = getToken();
    return `${backend}/api/admin/documents/${docId}/download?token=${encodeURIComponent(
      token,
    )}`;
  }

  function adminPhotoUrl(surgeonId) {
    const backend = process.env.REACT_APP_BACKEND_URL;
    const token = getToken();
    return `${backend}/api/admin/surgeons/${surgeonId}/photo?token=${encodeURIComponent(
      token,
    )}`;
  }


  return (
    <main data-testid="admin-dashboard-page" className="bg-white">
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1
              data-testid="admin-dashboard-title"
              className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl"
            >
              Admin Dashboard
            </h1>
            <p
              data-testid="admin-dashboard-subtitle"
              className="mt-2 text-sm text-slate-600"
            >
              Review profiles, verify documents, and approve/reject.
            </p>
          </div>
          <Button
            data-testid="admin-logout-button"
            variant="secondary"
            onClick={() => {
              localStorage.removeItem("oc_admin_token");
              navigate("/admin");
            }}
            className="h-10 rounded-full bg-slate-100 text-slate-800 hover:bg-slate-200"
          >
            Logout
          </Button>
        </div>

        {error ? (
          <div
            data-testid="admin-dashboard-error"
            className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
          >
            {error}
          </div>
        ) : null}

        <div className="mt-6">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList data-testid="admin-tabs" className="bg-slate-100">
              <TabsTrigger data-testid="admin-tab-pending" value="pending">
                Pending
              </TabsTrigger>
              <TabsTrigger data-testid="admin-tab-needs-clarification" value="needs_clarification">
                Needs Info
              </TabsTrigger>
              <TabsTrigger data-testid="admin-tab-approved" value="approved">
                Approved
              </TabsTrigger>
              <TabsTrigger data-testid="admin-tab-rejected" value="rejected">
                Rejected
              </TabsTrigger>
            </TabsList>

            <TabsContent value={tab}>
              <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Profiles</div>
                  <div className="mt-3 space-y-3">
                    {loading ? (
                      <div
                        data-testid="admin-list-loading"
                        className="text-sm text-slate-600"
                      >
                        Loading…
                      </div>
                    ) : null}
                    {!loading && !items.length ? (
                      <div
                        data-testid="admin-list-empty"
                        className="rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-sm text-slate-600"
                      >
                        No profiles in this status.
                      </div>
                    ) : null}

                    {items.map((i) => (
                      <button
                        data-testid={`admin-list-item-${i.id}`}
                        key={i.id}
                        type="button"
                        onClick={() => setSelectedId(i.id)}
                        className={[
                          "w-full rounded-2xl border p-4 text-left",
                          "transition-[border-color,box-shadow]",
                          selectedId === i.id
                            ? "border-sky-200 bg-sky-50 shadow-sm"
                            : "border-slate-200 bg-white hover:border-sky-200",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">
                              {i.name}
                            </div>
                            <div className="mt-1 text-xs text-slate-600">
                              {i.registration_number}
                            </div>
                          </div>
                          <Badge
                            data-testid={`admin-status-badge-${i.id}`}
                            className={
                              "rounded-full " +
                              statusBadge(i.status) +
                              " hover:" +
                              statusBadge(i.status)
                            }
                          >
                            {i.status}
                          </Badge>
                        </div>
                        <div className="mt-2 text-xs text-slate-500">
                          {i.locations?.[0]?.city || i.clinic?.city || ""}{" "}
                          {i.locations?.[0]?.pincode || i.clinic?.pincode
                            ? `· ${i.locations?.[0]?.pincode || i.clinic?.pincode}`
                            : ""}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-slate-900">Review</div>

                  {!selected ? (
                    <div
                      data-testid="admin-review-empty"
                      className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-sm text-slate-600"
                    >
                      Select a profile to review.
                    </div>
                  ) : (
                    <div
                      data-testid="admin-review-panel"
                      className="mt-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div
                            data-testid="admin-review-name"
                            className="text-lg font-semibold text-slate-900"
                          >
                            {selected.name}
                          </div>
                          <div
                            data-testid="admin-review-qualifications"
                            className="mt-1 text-sm text-slate-600"
                          >
                            {selected.qualifications}
                          </div>
                        </div>
                        <Badge
                          data-testid="admin-review-status"
                          className={
                            "rounded-full " +
                            statusBadge(selected.status) +
                            " hover:" +
                            statusBadge(selected.status)
                          }
                        >
                          {selected.status}
                        </Badge>
                      </div>

                      <div className="mt-5 grid gap-4 md:grid-cols-2">
                        <div>
                          <div className="text-xs font-semibold text-slate-700">
                            Registration No.
                          </div>
                          <div
                            data-testid="admin-review-reg"
                            className="mt-1 text-sm font-semibold text-slate-900"
                          >
                            {selected.registration_number}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-700">
                            Subspecialties (edit)
                          </div>


                      <div className="mt-5">
                        <div className="text-xs font-semibold text-slate-700">
                          Profile photo
                        </div>

                        {selected.has_profile_photo ? (
                          <div className="mt-3 grid gap-4 md:grid-cols-[120px_1fr] md:items-start">
                            <img
                              data-testid="admin-photo-preview"
                              src={adminPhotoUrl(selected.id)}
                              alt=""
                              className="h-[120px] w-[120px] rounded-2xl border border-slate-200 object-cover"
                            />
                            <div>
                              <div
                                data-testid="admin-photo-visibility-label"
                                className="text-xs font-semibold text-slate-700"
                              >
                                Visibility
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {[
                                  {
                                    value: "admin_only",
                                    label: "Admin only (default)",
                                  },
                                  { value: "public", label: "Public" },
                                ].map((o) => (
                                  <button
                                    data-testid={`admin-photo-visibility-${o.value}`}
                                    key={o.value}
                                    type="button"
                                    onClick={() => setPhotoVisibility(o.value)}
                                    className={[
                                      "rounded-full border px-3 py-1.5 text-xs",
                                      "transition-[background-color,border-color,color]",
                                      photoVisibility === o.value
                                        ? "border-sky-200 bg-sky-50 text-sky-900"
                                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                                    ].join(" ")}
                                  >
                                    {o.label}
                                  </button>
                                ))}
                              </div>
                              <div
                                data-testid="admin-photo-visibility-note"
                                className="mt-2 text-xs text-slate-500"
                              >
                                If set to Public, the photo will be visible on the
                                doctor’s public profile.
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div
                            data-testid="admin-photo-empty"
                            className="mt-2 rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-600"
                          >
                            No photo uploaded.
                          </div>
                        )}
                      </div>

                          <Input
                            data-testid="admin-review-subspecialties-input"
                            value={subspecialties}
                            onChange={(e) => setSubspecialties(e.target.value)}
                            placeholder="e.g., Knee, Hip"
                            className="mt-1 h-10 rounded-xl border-slate-200 bg-slate-50/60"
                          />
                        </div>
                      </div>

                      <div className="mt-5">
                        <div className="text-xs font-semibold text-slate-700">
                          Locations
                        </div>
                        <div className="mt-2 space-y-2">
                          {(selected.locations || []).length ? (
                            selected.locations.map((l, idx) => (
                              <div
                                data-testid={`admin-location-${idx}`}
                                key={l.id}
                                className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700"
                              >
                                <div className="font-semibold text-slate-900">
                                  {l.facility_name || `Location ${idx + 1}`}
                                </div>
                                <div className="mt-1 text-slate-600">
                                  {l.address}
                                  {l.city ? `, ${l.city}` : ""}
                                  {l.pincode ? ` - ${l.pincode}` : ""}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  OPD: {l.opd_timings || "—"} · Phone: {l.phone || "—"}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div
                              data-testid="admin-locations-empty"
                              className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-600"
                            >
                              —
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-5">
                        <div className="text-xs font-semibold text-slate-700">
                          Documents
                        </div>
                        <div className="mt-2 space-y-2">
                          {(selected.documents || []).length ? (
                            selected.documents.map((d) => (
                              <div
                                data-testid={`admin-doc-row-${d.id}`}
                                key={d.id}
                                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
                              >
                                <div>
                                  <div className="text-sm font-medium text-slate-900">
                                    {d.filename}
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    type: {d.type}
                                  </div>
                                </div>
                                <a
                                  data-testid={`admin-doc-download-${d.id}`}
                                  href={downloadLink(d.id)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition-colors"
                                >
                                  Download
                                </a>
                              </div>
                            ))
                          ) : (
                            <div
                              data-testid="admin-docs-empty"
                              className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-600"
                            >
                              No documents uploaded.
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-6 grid gap-3 md:grid-cols-2">
                        <Button
                          data-testid="admin-approve-button"
                          onClick={approve}
                          className="h-11 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800"
                        >
                          Approve
                        </Button>
                        <div className="space-y-2">
                          <Textarea
                            data-testid="admin-rejection-reason-textarea"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Rejection reason"
                            className="min-h-[64px] rounded-2xl border-slate-200 bg-slate-50/60"
                          />
                          <Button
                            data-testid="admin-reject-button"
                            variant="secondary"
                            onClick={reject}
                            className="h-11 w-full rounded-xl bg-rose-600 text-white hover:bg-rose-700"
                          >
                            Reject
                          </Button>
                        </div>
                      </div>

                      <div
                        data-testid="admin-dashboard-note"
                        className="mt-4 text-xs text-slate-500"
                      >
                        Note: This dashboard is for verification only. OrthoConnect
                        does not rank or promote doctors.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </main>
  );
}
