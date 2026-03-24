import React, { useState } from "react";
import { Zap, Check } from "lucide-react";
import { colors } from "./data";
import { useFriendFlares, useRespondToFlare, flareAvailabilityLabel } from "@/hooks/use-flares";
import { avatarColor } from "./FeedScreen";
import { toast } from "sonner";

// ─── Response Bottom Sheet ───
function FlareResponseSheet({
  flareId,
  onClose,
}: {
  flareId: string;
  onClose: () => void;
}) {
  const [note, setNote] = useState("");
  const respondToFlare = useRespondToFlare();

  const handleSend = async (includeNote: boolean) => {
    try {
      await respondToFlare.mutateAsync({
        flareId,
        message: includeNote ? note : undefined,
      });
      onClose();
      toast.success("sent!", { duration: 2000 });
    } catch (err: any) {
      // Handle duplicate gracefully
      if (err?.message?.includes("duplicate") || err?.code === "23505") {
        onClose();
      } else {
        toast.error(err?.message || "something went wrong");
      }
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50"
        style={{ background: "rgba(0,0,0,0.4)" }}
        onClick={onClose}
      />
      <div
        className="fixed left-0 right-0 z-50 rounded-t-2xl animate-fade-slide-in"
        style={{
          background: colors.card,
          maxHeight: "30vh",
          bottom: 48,
          paddingBottom: 16,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div style={{ width: 36, height: 4, borderRadius: 2, background: colors.border }} />
        </div>
        <div className="px-5 pb-5">
          <div className="flex items-center gap-1.5 mb-3">
            <Check size={16} style={{ color: colors.accent }} />
            <span className="font-sans text-[14px] font-semibold" style={{ color: colors.text }}>
              you're in!
            </span>
          </div>

          <div className="relative mb-4">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 150))}
              placeholder="add a note (optional)"
              className="w-full py-2.5 px-3 rounded-xl border font-sans text-[13px] outline-none box-border"
              style={{ borderColor: colors.border, background: colors.warmGray, color: colors.text }}
              autoFocus
            />
            {note.length >= 120 && (
              <span
                className="absolute right-3 top-1/2 -translate-y-1/2 font-sans text-[9px]"
                style={{ color: note.length >= 140 ? colors.accent : colors.textMuted }}
              >
                {note.length}/150
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSend(true)}
              disabled={respondToFlare.isPending}
              className="flex-1 py-2.5 rounded-full border-0 font-sans text-[13px] font-semibold cursor-pointer"
              style={{ background: colors.accent, color: "#fff", opacity: respondToFlare.isPending ? 0.6 : 1 }}
            >
              send
            </button>
            <button
              onClick={() => handleSend(false)}
              disabled={respondToFlare.isPending}
              className="bg-transparent border-0 font-sans text-[13px] cursor-pointer"
              style={{ color: colors.textMuted }}
            >
              skip
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Friend Flare Cards (horizontal scroll for Meet Offline tab) ───
export function FriendFlareCards() {
  const { data: flares = [] } = useFriendFlares();
  const [respondingFlareId, setRespondingFlareId] = useState<string | null>(null);

  if (flares.length === 0) {
    return (
      <div className="mb-5">
        <div className="font-sans text-xs font-semibold mb-2" style={{ color: colors.text }}>
          friends who are free
        </div>
        <div className="flex items-center gap-1.5 py-3">
          <Zap size={14} style={{ color: colors.textMuted }} />
          <span className="font-sans text-[12px]" style={{ color: colors.textMuted }}>
            no flares right now.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-5">
      <div className="font-sans text-xs font-semibold mb-2" style={{ color: colors.text }}>
        friends who are free
      </div>
      <div
        className="flex gap-2.5 -mx-4 px-4 pb-1"
        style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}
      >
        {flares.map((flare: any) => (
          <div
            key={flare.id}
            className="flex-shrink-0 rounded-xl p-3 flex flex-col items-center"
            style={{
              width: 120,
              background: `${colors.accent}14`,
              border: `1px solid ${colors.accent}20`,
            }}
          >
            {/* Avatar */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center mb-1.5"
              style={{ background: avatarColor(flare.sender_id) }}
            >
              <span className="text-white text-[13px] font-semibold">
                {flare.sender_name?.[0]?.toUpperCase() || "?"}
              </span>
            </div>

            {/* Name */}
            <div className="font-sans text-[12px] font-semibold text-center mb-0.5" style={{ color: colors.text }}>
              {flare.sender_name?.split(" ")[0] || "friend"}
            </div>

            {/* Availability */}
            <div className="font-sans text-[10px] text-center mb-1" style={{ color: colors.textMuted }}>
              {flareAvailabilityLabel(flare)}
            </div>

            {/* Message */}
            {flare.message && (
              <div
                className="font-sans text-[10px] italic text-center mb-1.5"
                style={{
                  color: colors.textMuted,
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                "{flare.message}"
              </div>
            )}

            {/* Button */}
            {flare.has_responded ? (
              <div className="font-sans text-[10px] font-semibold mt-auto" style={{ color: `${colors.accent}99` }}>
                responded ✓
              </div>
            ) : (
              <button
                onClick={() => setRespondingFlareId(flare.id)}
                className="mt-auto w-full py-1.5 rounded-full border-0 font-sans text-[11px] font-semibold cursor-pointer"
                style={{ background: colors.accent, color: "#fff" }}
              >
                i'm down
              </button>
            )}
          </div>
        ))}
      </div>

      {respondingFlareId && (
        <FlareResponseSheet
          flareId={respondingFlareId}
          onClose={() => setRespondingFlareId(null)}
        />
      )}
    </div>
  );
}

// ─── Flare Banner (thin bar for Feed tab) ───
export function FlareBanner({ onTap }: { onTap: () => void }) {
  const { data: flares = [] } = useFriendFlares();

  if (flares.length === 0) return null;

  const firstName = flares[0]?.sender_name?.split(" ")[0] || "a friend";
  const label =
    flares.length === 1
      ? `${firstName} is ${flares[0].availability_type === "tonight" ? "free tonight" : "free right now"}`
      : `${firstName} + ${flares.length - 1} other${flares.length > 2 ? "s" : ""} are free`;

  return (
    <button
      onClick={onTap}
      className="w-full flex items-center gap-2 px-4 py-2.5 mb-2 rounded-xl border-0 cursor-pointer"
      style={{ background: `${colors.accent}14` }}
    >
      <Zap size={14} style={{ color: colors.accent }} fill={colors.accent} />
      <span className="font-sans text-[12px] font-semibold" style={{ color: colors.accent }}>
        {label}
      </span>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={colors.accent} strokeWidth="2" strokeLinecap="round" className="ml-auto">
        <path d="M6 4l4 4-4 4" />
      </svg>
    </button>
  );
}
