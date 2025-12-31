import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminLogin() {
  const api = useMemo(() => apiClient(), []);
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/admin/login", { password });
      localStorage.setItem("oc_admin_token", res.data.token);
      navigate("/admin/dashboard");
    } catch (e) {
      setError(e?.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main data-testid="admin-login-page" className="bg-white">
      <section className="mx-auto max-w-lg px-4 py-12 sm:px-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1
            data-testid="admin-login-title"
            className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl"
          >
            Admin
          </h1>
          <p
            data-testid="admin-login-subtitle"
            className="mt-2 text-sm text-slate-600"
          >
            Sign in to review surgeon profiles and documents.
          </p>

          {error ? (
            <div
              data-testid="admin-login-error"
              className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
            >
              {error}
            </div>
          ) : null}

          <div className="mt-6 space-y-2">
            <div className="text-xs font-semibold text-slate-700">Password</div>
            <Input
              data-testid="admin-login-password-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded-xl border-slate-200 bg-slate-50/60"
            />
          </div>

          <Button
            data-testid="admin-login-submit-button"
            onClick={submit}
            disabled={loading || password.length < 3}
            className="mt-6 h-11 w-full rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </Button>

          <div
            data-testid="admin-login-note"
            className="mt-4 text-xs text-slate-500"
          >
            MVP note: change the admin password in backend env.
          </div>
        </div>
      </section>
    </main>
  );
}
