import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { colors } from "@/components/kyagi/data";
import kyagiLogo from "@/assets/kyagi-logo-final.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 font-sans" style={{ background: colors.bg }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src={kyagiLogo} alt="kyagi" className="w-16 h-16 mx-auto mb-3" />
          <h1 className="font-serif text-4xl font-semibold tracking-tight mb-2" style={{ color: colors.text }}>
            kyagi
          </h1>
          <p className="font-sans text-sm" style={{ color: colors.textMuted }}>
            better for you social media
          </p>
        </div>

        <form onSubmit={handleLogin} className="rounded-2xl p-6 border" style={{ background: colors.card, borderColor: colors.border }}>
          {error && (
            <div className="rounded-lg p-3 mb-4 font-sans text-xs" style={{ background: "#A5212A15", color: "#A5212A" }}>
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block font-sans text-xs font-semibold mb-1.5" style={{ color: colors.text }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full py-2.5 px-3.5 rounded-xl border font-sans text-sm outline-none box-border transition-colors"
              style={{ borderColor: colors.border, background: colors.bg, color: colors.text }}
              placeholder="you@email.com"
            />
          </div>

          <div className="mb-2">
            <label className="block font-sans text-xs font-semibold mb-1.5" style={{ color: colors.text }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full py-2.5 px-3.5 rounded-xl border font-sans text-sm outline-none box-border transition-colors"
              style={{ borderColor: colors.border, background: colors.bg, color: colors.text }}
              placeholder="••••••••"
            />
          </div>

          <div className="text-right mb-5">
            <Link to="/forgot-password" className="font-sans text-xs no-underline" style={{ color: colors.periwinkle }}>
              forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl border-0 font-sans text-sm font-semibold cursor-pointer transition-opacity"
            style={{ background: colors.maroon, color: colors.ivory, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "signing in..." : "sign in"}
          </button>
        </form>

        <p className="text-center mt-5 font-sans text-sm" style={{ color: colors.textMuted }}>
          don't have an account?{" "}
          <Link to="/signup" className="font-semibold no-underline" style={{ color: colors.cobalt }}>
            sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
