import React, { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { colors } from "@/components/kyagi/data";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 font-sans" style={{ background: colors.bg }}>
        <div className="w-full max-w-sm text-center">
          <div className="rounded-2xl p-8 border" style={{ background: colors.card, borderColor: colors.border }}>
            <div className="text-3xl mb-3">📬</div>
            <h2 className="font-serif text-xl font-semibold mb-2" style={{ color: colors.text }}>check your email</h2>
            <p className="font-sans text-sm" style={{ color: colors.textMuted }}>
              if an account exists for <strong style={{ color: colors.text }}>{email}</strong>, you'll get a reset link.
            </p>
            <Link to="/login" className="block mt-5 font-sans text-sm font-semibold no-underline" style={{ color: colors.cobalt }}>
              back to sign in
            </Link>
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
          <p className="font-sans text-sm" style={{ color: colors.textMuted }}>reset your password</p>
        </div>

        <form onSubmit={handleReset} className="rounded-2xl p-6 border" style={{ background: colors.card, borderColor: colors.border }}>
          {error && (
            <div className="rounded-lg p-3 mb-4 font-sans text-xs" style={{ background: "#A5212A15", color: "#A5212A" }}>{error}</div>
          )}
          <div className="mb-5">
            <label className="block font-sans text-xs font-semibold mb-1.5" style={{ color: colors.text }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full py-2.5 px-3.5 rounded-xl border font-sans text-sm outline-none box-border"
              style={{ borderColor: colors.border, background: colors.bg, color: colors.text }}
              placeholder="you@email.com"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl border-0 font-sans text-sm font-semibold cursor-pointer transition-opacity"
            style={{ background: colors.maroon, color: colors.ivory, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "sending..." : "send reset link"}
          </button>
        </form>

        <p className="text-center mt-5 font-sans text-sm" style={{ color: colors.textMuted }}>
          <Link to="/login" className="font-semibold no-underline" style={{ color: colors.cobalt }}>back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
