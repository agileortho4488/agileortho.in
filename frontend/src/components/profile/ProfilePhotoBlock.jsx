import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api";

function getToken() {
  return localStorage.getItem("oc_surgeon_token") || "";
}

export default function ProfilePhotoBlock({ onUploaded }) {
  const api = useMemo(() => apiClient(), []);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function upload() {
    if (!file) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      await api.post("/surgeon/me/profile/photo", fd, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "multipart/form-data",
        },
      });
      setSuccess("Photo uploaded. It will remain private until admin makes it public.");
      setFile(null);
      onUploaded?.();
    } catch (e) {
      setError(e?.response?.data?.detail || "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      data-testid="surgeon-photo-block"
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div
        data-testid="surgeon-photo-title"
        className="text-sm font-semibold text-slate-900"
      >
        Profile photo (optional)
      </div>
      <div
        data-testid="surgeon-photo-note"
        className="mt-2 text-xs text-slate-500"
      >
        Default visibility is <b>admin-only</b>. Admin can enable public display
        after verification.
      </div>

      {error ? (
        <div
          data-testid="surgeon-photo-error"
          className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
        >
          {error}
        </div>
      ) : null}

      {success ? (
        <div
          data-testid="surgeon-photo-success"
          className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
        >
          {success}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
        <Input
          data-testid="surgeon-photo-input"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <Button
          data-testid="surgeon-photo-upload-button"
          onClick={upload}
          disabled={!file || loading}
          className="h-11 rounded-xl bg-slate-900 px-6 text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? "Uploading…" : "Upload"}
        </Button>
      </div>
    </div>
  );
}
