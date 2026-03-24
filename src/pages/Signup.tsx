import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { colors } from "@/components/kyagi/data";
import kyagiLogo from "@/assets/kyagi-logo-final.png";

export default function Signup() {
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get("invite") || "";

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [inviterName, setInviterName] = useState("");

  // Look up inviter name for a nice welcome message
  useEffect(() => {
    if (!inviteCode) return;
    (async () => {
      const { data } = await supabase
        .from("invite_codes" as any)
        .select("inviter_id")
        .eq("code", inviteCode)
        .maybeSingle() as any;
      if (data?.inviter_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", data.inviter_id)
          .maybeSingle();
        if (profile?.display_name) setInviterName(profile.display_name);
      }
    })();
  }, [inviteCode]);

  // Normalize phone to E.164 and hash with SHA-256
  async function hashPhone(raw: string): Promise<string | null> {
    if (!raw.trim()) return null;
    let normalized = raw.replace(/[\s\-\(\)\.]/g, "");
    if (!normalized.startsWith("+")) normalized = "+1" + normalized;
    const encoder = new TextEncoder();
    const data = encoder.encode(normalized);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("password must be at least 6 characters");
      return;
    }
    setLoading(true);

    // Hash phone number if provided
    const phoneHash = await hashPhone(phone);

    const { data: signupData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          invite_code: inviteCode || undefined,
          phone_hash: phoneHash,
        },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      // Save phone hash to profile if user was created
      if (phoneHash && signupData?.user?.id) {
        supabase
          .from("profiles")
          .update({ phone_hash: phoneHash } as any)
          .eq("user_id", signupData.user.id)
          .then(() => {});
      }
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 font-sans" style={{ background: colors.bg }}>
        <div className="w-full max-w-sm text-center">
          <div className="rounded-2xl p-8 border" style={{ background: colors.card, borderColor: colors.border }}>
            <div className="text-3xl mb-3">✉️</div>
            <h2 className="font-serif text-xl font-semibold mb-2" style={{ color: colors.text }}>check your email</h2>
            <p className="font-sans text-sm mb-5" style={{ color: colors.textMuted }}>
              we sent a confirmation link to <strong style={{ color: colors.text }}>{email}</strong>. click it to activate your account.
              {inviteCode && " once confirmed, you'll automatically join your friend's circle."}
            </p>
            <Link to="/login" className="font-sans text-sm font-semibold no-underline" style={{ color: colors.cobalt }}>
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
          <img src={kyagiLogo} alt="kyagi" className="w-16 h-16 mx-auto mb-3" />
          <h1 className="font-serif text-4xl font-semibold tracking-tight mb-2" style={{ color: colors.text }}>
            kyagi
          </h1>
          {inviterName ? (
            <p className="font-sans text-sm" style={{ color: colors.cobalt }}>
              {inviterName} invited you to their circle 💛
            </p>
          ) : (
            <p className="font-sans text-sm" style={{ color: colors.textMuted }}>
              create your account
            </p>
          )}
        </div>

        <form onSubmit={handleSignup} className="rounded-2xl p-6 border" style={{ background: colors.card, borderColor: colors.border }}>
          {error && (
            <div className="rounded-lg p-3 mb-4 font-sans text-xs" style={{ background: "#A5212A15", color: "#A5212A" }}>
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block font-sans text-xs font-semibold mb-1.5" style={{ color: colors.text }}>display name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="w-full py-2.5 px-3.5 rounded-xl border font-sans text-sm outline-none box-border"
              style={{ borderColor: colors.border, background: colors.bg, color: colors.text }}
              placeholder="your name"
            />
          </div>

          <div className="mb-4">
            <label className="block font-sans text-xs font-semibold mb-1.5" style={{ color: colors.text }}>email</label>
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

          <div className="mb-4">
            <label className="block font-sans text-xs font-semibold mb-1.5" style={{ color: colors.text }}>phone number (optional)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full py-2.5 px-3.5 rounded-xl border font-sans text-sm outline-none box-border"
              style={{ borderColor: colors.border, background: colors.bg, color: colors.text }}
              placeholder="for friends to find you on kyagi"
            />
          </div>

          <div className="mb-5">
            <label className="block font-sans text-xs font-semibold mb-1.5" style={{ color: colors.text }}>password</label>
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl border-0 font-sans text-sm font-semibold cursor-pointer transition-opacity"
            style={{ background: colors.maroon, color: colors.ivory, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "creating account..." : inviteCode ? "join the circle" : "create account"}
          </button>
        </form>

        <p className="text-center mt-5 font-sans text-sm" style={{ color: colors.textMuted }}>
          already have an account?{" "}
          <Link to="/login" className="font-semibold no-underline" style={{ color: colors.cobalt }}>
            sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
