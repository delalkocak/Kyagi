import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { colors } from "@/components/kyagi/data";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for recovery token in URL hash
    const hash = window.location.hash;
    if (!hash.includes("type=recovery")) {
      navigate("/login");
    }
  }, [navigate]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => navigate("/"), 2000);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 font-sans" style={{ background: colors.bg }}>
        <div className="w-full max-w-sm text-center">
          <div className="rounded-2xl p-8 border" style={{ background: colors.card, borderColor: colors.border }}>
            <div className="text-3xl mb-3">✅</div>
            <h2 className="font-serif text-xl font-semibold mb-2" style={{ color: colors.text }}>password updated</h2>
            <p className="font-sans text-sm" style={{ color: colors.textMuted }}>redirecting you to the app...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 font-sans" style={{ background: colors.bg }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-serif text-4xl font-semibold tracking-tight mb-2" style={{ color: colors.text }}>kyagi</h1>
          <p className="font-sans text-sm" style={{ color: colors.textMuted }}>set a new password</p>
        </div>

        <form onSubmit={handleReset} className="rounded-2xl p-6 border" style={{ background: colors.card, borderColor: colors.border }}>
          {error && (
            <div className="rounded-lg p-3 mb-4 font-sans text-xs" style={{ background: "#A5212A15", color: "#A5212A" }}>{error}</div>
          )}
          <div className="mb-4">
            <label className="block font-sans text-xs font-semibold mb-1.5" style={{ color: colors.text }}>New password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full py-2.5 px-3.5 rounded-xl border font-sans text-sm outline-none box-border"
              style={{ borderColor: colors.border, background: colors.bg, color: colors.text }}
              placeholder="at least 6 characters"
            />
          </div>
          <div className="mb-5">
            <label className="block font-sans text-xs font-semibold mb-1.5" style={{ color: colors.text }}>Confirm password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="w-full py-2.5 px-3.5 rounded-xl border font-sans text-sm outline-none box-border"
              style={{ borderColor: colors.border, background: colors.bg, color: colors.text }}
              placeholder="type it again"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl border-0 font-sans text-sm font-semibold cursor-pointer transition-opacity"
            style={{ background: colors.maroon, color: colors.ivory, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "updating..." : "set new password"}
          </button>
        </form>
      </div>
    </div>
  );
}
