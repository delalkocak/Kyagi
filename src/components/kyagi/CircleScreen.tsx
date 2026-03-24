import React, { useState } from "react";
import { colors } from "./data";
import { PlusIcon } from "./icons";
import { useMyCircle, usePendingRequests, useRespondToRequest, CircleMember, getNextShuffleDate } from "@/hooks/use-circle";
import { format } from "date-fns";
import { UserSearch } from "./UserSearch";

const PASTEL_COLORS = ["#E8D5E0", "#D5E0E8", "#E0E8D5", "#E8E0D5", "#D5D8E8", "#E8D5D5"];

function pastelBg(name: string) {
  return PASTEL_COLORS[name.charCodeAt(0) % PASTEL_COLORS.length];
}

function FriendRow({ m, active }: { m: CircleMember; active: boolean }) {
  const initial = m.display_name.charAt(0).toUpperCase();
  const bgColor = active ? pastelBg(m.display_name) : "#DDD";
  const textColor = active ? colors.text : "#888";

  return (
    <div
      className="flex items-center gap-3 py-2.5 px-1"
      style={{ borderBottom: `0.5px solid ${colors.border}`, opacity: active ? 1 : 0.55 }}
    >
      {m.avatar_url ? (
        <img src={m.avatar_url} alt={m.display_name} className="w-9 h-9 rounded-full object-cover shrink-0" />
      ) : (
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center font-sans text-[13px] font-medium shrink-0"
          style={{ background: bgColor, color: textColor }}
        >
          {initial}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="font-sans text-[14px] font-medium truncate" style={{ color: active ? colors.text : "#888" }}>
          {m.display_name}
        </div>
      </div>
    </div>
  );
}

export function CircleScreen() {
  const { data, isLoading } = useMyCircle();
  const { data: pendingRequests, isLoading: loadingRequests } = usePendingRequests();
  const respondMutation = useRespondToRequest();
  const [showSearch, setShowSearch] = useState(false);
  const [showAllActive, setShowAllActive] = useState(false);
  const [showAllInactive, setShowAllInactive] = useState(false);

  const active = data?.active || [];
  const inactive = data?.inactive || [];
  const requests = pendingRequests || [];
  const nextShuffle = getNextShuffleDate();
  const shuffleLabel = format(nextShuffle, "MMMM d");

  const handleRespond = (requestId: string, senderId: string, accept: boolean) => {
    respondMutation.mutate({ requestId, accept });
  };

  const activeVisible = showAllActive ? active : active.slice(0, 5);
  const activeRemaining = active.length - 5;
  const inactiveVisible = showAllInactive ? inactive : inactive.slice(0, 3);
  const inactiveRemaining = inactive.length - 3;

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="font-serif text-[22px] font-medium italic m-0 mb-1.5" style={{ color: colors.text }}>my village</h2>
      </div>

      {/* Loading */}
      {(isLoading || loadingRequests) && !data && (
        <div className="text-center py-12">
          <div className="w-6 h-6 rounded-full border-2 animate-spin-loader mx-auto mb-3"
            style={{ borderColor: colors.border, borderTopColor: colors.accent }} />
          <div className="font-sans text-xs" style={{ color: colors.textMuted }}>loading my village...</div>
        </div>
      )}

      {/* Pending friend requests */}
      {requests.length > 0 && (
        <div className="mb-5">
          <div className="font-sans text-[10px] font-bold uppercase tracking-wider mb-2.5" style={{ color: colors.textMuted }}>
            pending requests ({requests.length})
          </div>
          {requests.map((req) => {
            const initial = req.sender_display_name.charAt(0).toUpperCase();
            return (
              <div key={req.id}
                className="rounded-xl p-3.5 mb-2 flex items-center gap-3 border animate-fade-slide-in"
                style={{ background: colors.card, borderColor: `${colors.accent}30` }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-sans text-[13px] font-medium shrink-0"
                  style={{ background: pastelBg(req.sender_display_name), color: colors.text }}>
                  {initial}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-sans text-[13px] font-medium truncate" style={{ color: colors.text }}>
                    {req.sender_display_name}
                  </div>
                  <div className="font-sans text-[10px]" style={{ color: colors.textMuted }}>
                    wants to join my village
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => handleRespond(req.id, req.sender_id, true)}
                    disabled={respondMutation.isPending}
                    className="rounded-lg py-1.5 px-3 border-0 font-sans text-[11px] font-semibold cursor-pointer transition-opacity"
                    style={{ background: colors.accent, color: "#fff", opacity: respondMutation.isPending ? 0.6 : 1 }}>
                    accept
                  </button>
                  <button
                    onClick={() => handleRespond(req.id, req.sender_id, false)}
                    disabled={respondMutation.isPending}
                    className="rounded-lg py-1.5 px-3 border font-sans text-[11px] font-semibold cursor-pointer transition-opacity"
                    style={{ background: "transparent", borderColor: colors.border, color: colors.textMuted, opacity: respondMutation.isPending ? 0.6 : 1 }}>
                    deny
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && active.length === 0 && inactive.length === 0 && requests.length === 0 && (
        <div className="text-center py-8 mb-4">
          <div className="text-3xl mb-3">👋</div>
          <div className="font-serif text-base italic mb-1.5" style={{ color: colors.text }}>my village is empty</div>
          <div className="font-sans text-xs" style={{ color: colors.textMuted }}>find friends by name or @username</div>
        </div>
      )}

      {/* Section A: Friends in your village */}
      {!isLoading && active.length > 0 && (
        <div className="mb-5">
          <div className="font-sans text-[11px] font-medium uppercase tracking-[1.5px] mb-1" style={{ color: colors.accent }}>
            friends & family in your village · {active.length}
          </div>
          <div className="font-sans text-[12px] italic mb-3" style={{ color: colors.textTertiary }}>
            you see each other's posts · shuffles {shuffleLabel.toLowerCase()}
          </div>
          {activeVisible.map((m) => (
            <FriendRow key={m.user_id} m={m} active />
          ))}
          {!showAllActive && activeRemaining > 0 && (
            <button
              onClick={() => setShowAllActive(true)}
              className="w-full py-2 bg-transparent border-0 font-sans text-[12px] cursor-pointer"
              style={{ color: colors.textTertiary }}
            >
              +{activeRemaining} more
            </button>
          )}
        </div>
      )}

      {/* Section B: Not in rotation */}
      {!isLoading && inactive.length > 0 && (
        <div className="mb-5">
          <div className="font-sans text-[11px] font-medium uppercase tracking-[1.5px] mb-1" style={{ color: colors.textMuted }}>
            not in rotation · {inactive.length}
          </div>
          <div className="font-sans text-[12px] italic mb-3" style={{ color: colors.textTertiary }}>
            may rotate in next shuffle
          </div>
          {inactiveVisible.map((m) => (
            <FriendRow key={m.user_id} m={m} active={false} />
          ))}
          {!showAllInactive && inactiveRemaining > 0 && (
            <button
              onClick={() => setShowAllInactive(true)}
              className="w-full py-2 bg-transparent border-0 font-sans text-[12px] cursor-pointer"
              style={{ color: colors.textTertiary }}
            >
              +{inactiveRemaining} more
            </button>
          )}
        </div>
      )}

      {/* Find friends button */}
      <button onClick={() => setShowSearch(!showSearch)}
        className="w-full py-3 rounded-xl border-0 font-sans text-[13px] font-semibold cursor-pointer flex items-center justify-center gap-1.5"
        style={{ background: colors.accent, color: "#fff" }}>
        <PlusIcon size={14} color="#fff" /> find & add friends
      </button>

      {/* User search panel */}
      {showSearch && (
        <div className="mt-3">
          <UserSearch onClose={() => setShowSearch(false)} />
        </div>
      )}
    </div>
  );
}
