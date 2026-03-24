import React, { useState } from "react";

interface OnboardingNudgeCardProps {
  onFindFriends: () => void;
  onInviteSomeone: () => void;
}

export function OnboardingNudgeCard({ onFindFriends, onInviteSomeone }: OnboardingNudgeCardProps) {
  const [dismissed, setDismissed] = useState(false);

  // Track dismissals in localStorage
  const dismissKey = "kyagi_nudge_dismissals";
  const dismissals = parseInt(localStorage.getItem(dismissKey) || "0", 10);

  if (dismissed || dismissals >= 3) return null;

  const handleDismiss = () => {
    localStorage.setItem(dismissKey, String(dismissals + 1));
    setDismissed(true);
  };

  return (
    <div
      className="rounded-2xl p-5 mb-3 border relative"
      style={{ background: "#FEFCF6", borderColor: "rgba(122, 31, 46, 0.08)", borderWidth: "0.5px" }}
    >
      {/* Dismiss X */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 bg-transparent border-0 cursor-pointer p-0"
        style={{ color: "#8090AC" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      <div className="text-center">
        <div style={{ fontFamily: "Georgia, serif", fontSize: 16, color: "#2C2E3A" }}>
          who else belongs here?
        </div>
        <div style={{ height: 4 }} />
        <div className="font-sans" style={{ fontSize: 13, color: "#8090AC" }}>
          your village has room for 20.
        </div>
        <div style={{ height: 14 }} />
        <div className="flex gap-2.5">
          <button
            onClick={onFindFriends}
            className="flex-1 border-0 cursor-pointer font-sans font-medium"
            style={{ background: "#6C6AE8", color: "#fff", fontSize: 13, borderRadius: 12, padding: 12 }}
          >
            find friends
          </button>
          <button
            onClick={onInviteSomeone}
            className="flex-1 border-0 cursor-pointer font-sans font-medium"
            style={{ background: "#7A1F2E", color: "#fff", fontSize: 13, borderRadius: 12, padding: 12 }}
          >
            invite someone
          </button>
        </div>
      </div>
    </div>
  );
}
