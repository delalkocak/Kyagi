import React from "react";
import { colors } from "./data";
import { useNotifications, Notification } from "@/hooks/use-notifications";
import { formatDistanceToNow } from "date-fns";

const typeIcons: Record<string, string> = {
  comment: "💬",
  friend_request: "👋",
  friend_joined: "🎉",
  schedule_request: "📅",
  schedule_accepted: "🎉",
  schedule_declined: "😔",
  priority_reminder: "🌿",
  post_highlight: "✨",
  village_monthly: "📰",
  sunday_paper: "📰",
  flare_response: "⚡",
  weekly_nudge: "📅",
};

function NotificationItem({ n, onTap }: { n: Notification; onTap: () => void }) {
  return (
    <button
      onClick={onTap}
      className="w-full text-left flex items-start gap-3 px-4 py-3 transition-colors"
      style={{
        background: n.read ? "transparent" : colors.card,
        cursor: "pointer",
        border: "none",
        borderBottom: `1px solid ${colors.border}`,
      }}
    >
      <div className="text-base flex-shrink-0 mt-0.5">{typeIcons[n.type] || "🔔"}</div>
      <div className="flex-1 min-w-0">
        <div
          className={`font-sans text-[13px] leading-snug ${n.read ? "font-normal" : "font-semibold"}`}
          style={{ color: colors.text }}
        >
          {n.title}
        </div>
        {n.body && (
          <div className="font-sans text-[11px] mt-0.5 truncate" style={{ color: colors.textMuted }}>
            {n.body}
          </div>
        )}
        <div className="font-sans text-[10px] mt-1" style={{ color: colors.textMuted }}>
          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
        </div>
      </div>
      {!n.read && (
        <div
          className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
          style={{ background: colors.electricIndigo }}
        />
      )}
    </button>
  );
}

interface NotificationsPanelProps {
  onClose: () => void;
  onNavigate?: (screen: string, context?: { type: string; referenceId: string | null }) => void;
}

export function NotificationsPanel({ onClose, onNavigate }: NotificationsPanelProps) {
  const { data: notifications, isLoading, unreadCount, markRead, markAllRead } = useNotifications();

  const handleTap = (n: Notification) => {
    if (!n.read) markRead.mutate(n.id);
    const ctx = { type: n.type, referenceId: n.reference_id };
    if (n.type === "friend_request" && onNavigate) onNavigate("profile", ctx);
    if ((n.type === "schedule_request" || n.type === "schedule_accepted" || n.type === "schedule_declined" || n.type === "priority_reminder") && onNavigate) onNavigate("schedule", ctx);
    if (n.type === "comment" && onNavigate) onNavigate("feed", ctx);
    if (n.type === "village_monthly" || n.type === "sunday_paper") onNavigate?.("feed", ctx);
    if (n.type === "flare_response") onNavigate?.("feed", ctx);
    if (n.type === "friend_joined") onNavigate?.("feed", ctx);
    if (n.type === "group_hang_request" || n.type === "group_hang_approved" || n.type === "group_hang_denied") onNavigate?.("schedule", ctx);
    if (n.type === "weekly_nudge") onNavigate?.("schedule", { type: "schedule_nudge", referenceId: n.reference_id });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col" style={{ background: colors.bg }}>
      {/* Header */}
      <div
        className="px-4 pb-3 flex items-center justify-between flex-shrink-0 border-b"
        style={{ borderColor: colors.border, paddingTop: "max(env(safe-area-inset-top, 12px), 12px)" }}
      >
        <button
          onClick={onClose}
          className="font-sans text-sm bg-transparent border-0 cursor-pointer"
          style={{ color: colors.accent }}
        >
          ← back
        </button>
        <div className="font-serif text-lg font-semibold" style={{ color: colors.text }}>
          notifications
        </div>
        {unreadCount > 0 ? (
          <button
            onClick={() => markAllRead.mutate()}
            className="font-sans text-[11px] bg-transparent border-0 cursor-pointer"
            style={{ color: colors.accent }}
          >
            mark all read
          </button>
        ) : (
          <div className="w-16" />
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
        {isLoading && (
          <div className="text-center py-12">
            <div className="font-sans text-xs" style={{ color: colors.textMuted }}>
              loading...
            </div>
          </div>
        )}

        {!isLoading && (!notifications || notifications.length === 0) && (
          <div className="text-center py-16 px-6">
            <div className="text-3xl mb-3">🔔</div>
            <div className="font-serif text-base" style={{ color: colors.text }}>
              all caught up
            </div>
            <div className="font-sans text-[11px] mt-1" style={{ color: colors.textMuted }}>
              notifications will appear here when friends interact with you
            </div>
          </div>
        )}

        {notifications?.map((n) => (
          <NotificationItem key={n.id} n={n} onTap={() => handleTap(n)} />
        ))}
      </div>
    </div>
  );
}
