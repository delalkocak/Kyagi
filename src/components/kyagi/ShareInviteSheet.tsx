import React, { useState, useEffect } from "react";
import { colors } from "./data";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/use-posts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import kyagiLogo from "@/assets/kyagi-logo-final.png";

function generateCode(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

interface ShareInviteSheetProps {
  onClose: () => void;
}

export function ShareInviteSheet({ onClose }: ShareInviteSheetProps) {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const [inviteLink, setInviteLink] = useState("");
  const [message, setMessage] = useState("");
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Check for existing unused invite code
      const { data: existing } = await supabase
        .from("invite_codes")
        .select("code")
        .eq("inviter_id", user.id)
        .is("used_at", null)
        .limit(1)
        .maybeSingle();

      let code: string;
      if (existing?.code) {
        code = existing.code;
      } else {
        code = generateCode();
        await supabase.from("invite_codes").insert({
          inviter_id: user.id,
          code,
        });
      }

      const link = `${window.location.origin}/signup?invite=${code}`;
      setInviteLink(link);
      const displayName = profile?.display_name || "a friend";
      setMessage(
        `i'm on this app called kyagi — it's a tiny village for close friends, no strangers, no algorithm. want to join mine? ${link}`
      );
    })();
  }, [user, profile]);

  const handleShare = async () => {
    setSharing(true);
    try {
      if (navigator.share) {
        await navigator.share({ text: message });
      } else {
        await navigator.clipboard.writeText(message);
        toast.success("copied to clipboard!");
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        await navigator.clipboard.writeText(message);
        toast.success("copied to clipboard!");
      }
    }
    setSharing(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[70]"
        style={{ background: "rgba(0,0,0,0.3)" }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed left-0 right-0 bottom-0 z-[71] animate-fade-slide-in"
        style={{
          background: "#FEFCF6",
          borderRadius: "16px 16px 0 0",
          padding: 24,
          paddingBottom: "max(24px, env(safe-area-inset-bottom, 24px))",
        }}
      >
        {/* Handle */}
        <div className="flex justify-center mb-4">
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "#D4DAE8" }} />
        </div>

        {/* Headline */}
        <div className="font-sans text-base font-medium mb-3" style={{ color: "#2C2E3A" }}>
          invite a friend
        </div>

        {/* Preview card */}
        <div className="rounded-xl p-3 mb-3" style={{ background: "#F4EDD8" }}>
          <div className="flex items-center gap-2 mb-1">
            <img src={kyagiLogo} alt="" style={{ width: 24, height: 24 }} />
            <span className="font-sans text-[13px] font-medium" style={{ color: "#2C2E3A" }}>
              {profile?.display_name || "a friend"} invited you to their village
            </span>
          </div>
          <div className="font-sans text-[11px]" style={{ color: "#8090AC" }}>
            a place for 20 friends and the small moments that matter.
          </div>
        </div>

        {/* Editable message */}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full font-sans text-[13px] outline-none resize-none box-border"
          style={{
            borderRadius: 10,
            border: `1px solid ${colors.border}`,
            padding: 12,
            minHeight: 80,
            color: "#2C2E3A",
            background: "#FEFCF6",
          }}
        />

        {/* Share button */}
        <button
          onClick={handleShare}
          disabled={sharing || !message}
          className="w-full border-0 cursor-pointer font-sans font-medium mt-4"
          style={{
            background: "#7A1F2E",
            color: "#fff",
            fontSize: 14,
            borderRadius: 12,
            padding: 14,
            opacity: sharing ? 0.6 : 1,
          }}
        >
          share invite
        </button>
      </div>
    </>
  );
}
