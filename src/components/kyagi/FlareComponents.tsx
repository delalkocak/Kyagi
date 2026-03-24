import React, { useState, useEffect } from "react";
import { Zap, Check, Calendar, Download } from "lucide-react";
import { colors } from "./data";
import {
  useMyActiveFlare,
  useFlareResponses,
  useCancelFlare,
  useCircleFriendsForFlares,
  useSendFlare,
  getExpiresAt,
  flareAvailabilityLabel,
  flareCountdown,
  flareExpiresLabel,
} from "@/hooks/use-flares";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { avatarColor } from "./FeedScreen";

// ─── FAB ───
export function FlaresFAB({ onTap }: { onTap: () => void }) {
  const { data: activeFlare } = useMyActiveFlare();
  const hasActive = Array.isArray(activeFlare) ? activeFlare.length > 0 : !!activeFlare;

  return (
    <button
      onClick={onTap}
      className="fixed flex items-center justify-center border-0 cursor-pointer"
      style={{
        width: 56,
        height: 56,
        borderRadius: 28,
        background: "#9B9FD4",
        right: 16,
        bottom: 80,
        zIndex: 40,
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.18)",
        animation: "flare-fab-in 200ms ease-out both",
      }}
    >
      <Zap size={24} color="#7B2D3B" fill="#7B2D3B" strokeWidth={2.2} />
      {hasActive && (
        <div
          className="absolute"
          style={{
            width: 14,
            height: 14,
            borderRadius: 7,
            background: "#7B2D3B",
            border: "2px solid #fff",
            top: 0,
            right: 0,
            animation: "flare-pulse 2s ease-in-out infinite",
          }}
        />
      )}
      <style>{`
        @keyframes flare-fab-in {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes flare-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
    </button>
  );
}

// ─── Backdrop ───
function SheetBackdrop({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    />
  );
}

// ─── Creation Bottom Sheet ───
export function FlareCreationSheet({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [availType, setAvailType] = useState<"right_now" | "tonight" | "custom">("right_now");
  const [customHour, setCustomHour] = useState(6);
  const [customAmPm, setCustomAmPm] = useState<"AM" | "PM">("PM");
  const [message, setMessage] = useState("");
  const [whoSees, setWhoSees] = useState<"everyone" | "pick">("everyone");
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());

  const { data: friends = [] } = useCircleFriendsForFlares();
  const sendFlare = useSendFlare();

  const canSend =
    whoSees === "everyone"
      ? friends.length > 0
      : selectedFriends.size > 0;

  const handleSend = async () => {
    if (!user || !canSend) return;

    const expiresAt = getExpiresAt(availType, customHour, customAmPm);
    const recipientUserIds =
      whoSees === "everyone"
        ? friends.map((f: any) => f.user_id)
        : friends.filter((f: any) => selectedFriends.has(f.user_id)).map((f: any) => f.user_id);

    try {
      await sendFlare.mutateAsync({
        availabilityType: availType,
        message,
        expiresAt,
        recipientUserIds,
      });
      onClose();
      toast.success(flareExpiresLabel(availType, expiresAt).replace("expires", "flare sent! expires"));
    } catch (err: any) {
      toast.error(err?.message || "something went wrong");
    }
  };

  const toggleFriend = (userId: string) => {
    setSelectedFriends((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  return (
    <>
      <SheetBackdrop onClose={onClose} />
      <div
        className="fixed left-0 right-0 z-50 rounded-t-2xl animate-fade-slide-in flex flex-col"
        style={{
          background: colors.card,
          maxHeight: "calc(100vh - 70px)",
          bottom: 48,
          paddingBottom: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
          <div style={{ width: 36, height: 4, borderRadius: 2, background: colors.border }} />
        </div>

        <div className="px-5 pb-2 overflow-y-auto flex-1">
          {/* Availability type */}
          <div className="font-sans text-[11px] font-semibold mb-2 uppercase tracking-wider" style={{ color: colors.textMuted }}>
            when are you free?
          </div>
          <div className="flex gap-2 mb-4">
            {(
              [
                { key: "right_now", label: "right now" },
                { key: "tonight", label: "tonight" },
                { key: "custom", label: "pick a time" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setAvailType(opt.key)}
                className="flex-1 py-2.5 rounded-full border font-sans text-[12px] font-semibold cursor-pointer transition-all"
                style={{
                  background: availType === opt.key ? colors.accent : "transparent",
                  color: availType === opt.key ? "#fff" : colors.text,
                  borderColor: availType === opt.key ? colors.accent : colors.border,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Custom time picker */}
          {availType === "custom" && (
            <div className="flex items-center gap-3 mb-4 pl-1">
              <select
                value={customHour}
                onChange={(e) => setCustomHour(parseInt(e.target.value))}
                className="py-2 px-3 rounded-xl border font-sans text-[13px] outline-none"
                style={{ borderColor: colors.border, background: colors.warmGray, color: colors.text }}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
              <div className="flex rounded-full overflow-hidden border" style={{ borderColor: colors.border }}>
                {(["AM", "PM"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setCustomAmPm(v)}
                    className="px-4 py-2 font-sans text-[12px] font-semibold border-0 cursor-pointer"
                    style={{
                      background: customAmPm === v ? colors.accent : "transparent",
                      color: customAmPm === v ? "#fff" : colors.text,
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message */}
          <div className="font-sans text-[11px] font-semibold mb-2 uppercase tracking-wider" style={{ color: colors.textMuted }}>
            add a note (optional)
          </div>
          <div className="relative mb-4">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 80))}
              placeholder="down for anything"
              className="w-full py-2.5 px-3 rounded-xl border font-sans text-[13px] outline-none box-border"
              style={{ borderColor: colors.border, background: colors.warmGray, color: colors.text }}
            />
            {message.length >= 60 && (
              <span
                className="absolute right-3 top-1/2 -translate-y-1/2 font-sans text-[9px]"
                style={{ color: message.length >= 75 ? colors.accent : colors.textMuted }}
              >
                {message.length}/80
              </span>
            )}
          </div>

          {/* Who sees this */}
          <div className="font-sans text-[11px] font-semibold mb-2 uppercase tracking-wider" style={{ color: colors.textMuted }}>
            who sees this?
          </div>
          <div className="flex gap-2 mb-3">
            {(
              [
                { key: "everyone", label: "everyone" },
                { key: "pick", label: "pick friends" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.key}
                onClick={() => setWhoSees(opt.key)}
                className="flex-1 py-2.5 rounded-full border font-sans text-[12px] font-semibold cursor-pointer transition-all"
                style={{
                  background: whoSees === opt.key ? colors.accent : "transparent",
                  color: whoSees === opt.key ? "#fff" : colors.text,
                  borderColor: whoSees === opt.key ? colors.accent : colors.border,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Friend picker */}
          {whoSees === "pick" && (
            <div className="mb-4 max-h-40 overflow-y-auto rounded-xl border p-2" style={{ borderColor: colors.border }}>
              {friends.length === 0 && (
                <div className="font-sans text-[11px] py-3 text-center" style={{ color: colors.textMuted }}>
                  no friends in your circle yet
                </div>
              )}
              {friends.map((f: any) => (
                <button
                  key={f.user_id}
                  onClick={() => toggleFriend(f.user_id)}
                  className="w-full flex items-center gap-3 py-2 px-2 rounded-lg bg-transparent border-0 cursor-pointer"
                  style={{ background: selectedFriends.has(f.user_id) ? `${colors.accent}08` : "transparent" }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: avatarColor(f.user_id) }}
                  >
                    <span className="text-white text-[11px] font-semibold">
                      {f.display_name?.[0]?.toUpperCase() || "?"}
                    </span>
                  </div>
                  <span className="font-sans text-[13px] flex-1 text-left" style={{ color: colors.text }}>
                    {f.display_name?.split(" ")[0] || "friend"}
                  </span>
                  <div
                    className="w-5 h-5 rounded border flex items-center justify-center"
                    style={{
                      borderColor: selectedFriends.has(f.user_id) ? colors.accent : colors.border,
                      background: selectedFriends.has(f.user_id) ? colors.accent : "transparent",
                    }}
                  >
                    {selectedFriends.has(f.user_id) && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
                        <path d="M2.5 6L5 8.5L9.5 3.5" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!canSend || sendFlare.isPending}
            className="w-full py-3 rounded-xl border-0 font-sans text-[14px] font-semibold cursor-pointer transition-all"
            style={{
              background: canSend ? colors.accent : `${colors.accent}40`,
              color: "#fff",
              opacity: sendFlare.isPending ? 0.6 : 1,
            }}
          >
            {sendFlare.isPending ? "sending..." : "send flare"}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Calendar helpers ───
function toICSDateStr(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function toGCalDateStr(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function generateICSFile(start: Date, end: Date) {
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kyagi//Flare//EN",
    "BEGIN:VEVENT",
    `DTSTART:${toICSDateStr(start)}`,
    `DTEND:${toICSDateStr(end)}`,
    "SUMMARY:Hangout with friends",
    "DESCRIPTION:Planned on Kyagi",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "hangout.ics";
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Flare Response List Sheet (for sender) ───
function FlareResponseListSheet({
  flareId,
  availabilityType,
  expiresAt,
  onClose,
}: {
  flareId: string;
  availabilityType: string;
  expiresAt: string;
  onClose: () => void;
}) {
  const { data: responses = [] } = useFlareResponses(flareId);

  const showCalendar = availabilityType === "tonight" || availabilityType === "custom";

  const startDate = new Date(expiresAt);
  // For "tonight" use the expires_at as approximate start; end = start + 1hr
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

  const gCalUrl = `https://calendar.google.com/calendar/event?action=TEMPLATE&text=Hangout+with+friends&dates=${toGCalDateStr(startDate)}/${toGCalDateStr(endDate)}&details=Planned+on+Kyagi`;
  const outlookUrl = `https://outlook.live.com/calendar/0/action/compose?subject=Hangout+with+friends&startdt=${startDate.toISOString()}&enddt=${endDate.toISOString()}&body=Planned+on+Kyagi`;

  return (
    <>
      <SheetBackdrop onClose={onClose} />
      <div
        className="fixed left-0 right-0 bottom-0 z-50 rounded-t-2xl animate-fade-slide-in"
        style={{
          background: colors.card,
          maxHeight: "70vh",
          overflowY: "auto",
          paddingBottom: "env(safe-area-inset-bottom, 16px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div style={{ width: 36, height: 4, borderRadius: 2, background: colors.border }} />
        </div>

        <div className="px-5 pb-5">
          <div className="font-sans text-[14px] font-semibold mb-4" style={{ color: colors.text }}>
            {responses.length} friend{responses.length !== 1 ? "s" : ""} {responses.length !== 1 ? "are" : "is"} down!
          </div>

          {/* Response list */}
          <div className="mb-4">
            {responses.map((r: any, i: number) => (
              <div key={r.id}>
                <div className="flex items-center gap-3 py-2.5">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: avatarColor(r.responder_id) }}
                  >
                    <span className="text-white text-[12px] font-semibold">
                      {r.responder_name?.[0]?.toUpperCase() || "?"}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-sans text-[13px] font-semibold" style={{ color: colors.text }}>
                      {r.responder_name?.split(" ")[0] || "friend"}
                    </div>
                    {r.message && (
                      <div className="font-sans text-[12px] mt-0.5" style={{ color: colors.textMuted }}>
                        {r.message}
                      </div>
                    )}
                  </div>
                </div>
                {i < responses.length - 1 && (
                  <div style={{ height: 1, background: colors.border, marginLeft: 48 }} />
                )}
              </div>
            ))}
          </div>

          {/* Calendar section */}
          {showCalendar && (
            <div className="mb-4">
              <div className="font-sans text-[11px] font-semibold mb-2 uppercase tracking-wider" style={{ color: colors.textMuted }}>
                add to your calendar
              </div>
              <div className="flex gap-2">
                <a
                  href={gCalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border font-sans text-[11px] font-semibold no-underline"
                  style={{ borderColor: colors.border, color: colors.text }}
                >
                  <Calendar size={12} />
                  google
                </a>
                <a
                  href={outlookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border font-sans text-[11px] font-semibold no-underline"
                  style={{ borderColor: colors.border, color: colors.text }}
                >
                  <Calendar size={12} />
                  outlook
                </a>
                <button
                  onClick={() => generateICSFile(startDate, endDate)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border font-sans text-[11px] font-semibold cursor-pointer bg-transparent"
                  style={{ borderColor: colors.border, color: colors.text }}
                >
                  <Download size={12} />
                  .ics
                </button>
              </div>
            </div>
          )}

          {/* Close */}
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl border font-sans text-[13px] font-semibold cursor-pointer"
            style={{ background: "transparent", borderColor: colors.border, color: colors.text }}
          >
            close
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Active Flare Sheet (shows all active flares) ───
export function ActiveFlareSheet({ onClose }: { onClose: () => void }) {
  const { data: activeFlares } = useMyActiveFlare();
  const flares = activeFlares || [];
  const firstFlare = flares[0] || null;
  const { data: responses = [] } = useFlareResponses(firstFlare?.id);
  const cancelFlare = useCancelFlare();
  const [countdown, setCountdown] = useState("");
  const [showResponses, setShowResponses] = useState(false);
  const [selectedFlareIdx, setSelectedFlareIdx] = useState(0);

  const selectedFlare = flares[selectedFlareIdx] || null;

  useEffect(() => {
    if (!selectedFlare) return;
    const update = () => setCountdown(flareCountdown(selectedFlare.expires_at));
    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, [selectedFlare?.expires_at]);

  const handleCancel = async () => {
    if (!selectedFlare) return;
    await cancelFlare.mutateAsync(selectedFlare.id);
    if (flares.length <= 1) {
      onClose();
    } else {
      setSelectedFlareIdx(0);
    }
    toast("flare cancelled");
  };

  if (flares.length === 0) return null;

  return (
    <>
      <SheetBackdrop onClose={onClose} />
      <div
        className="fixed left-0 right-0 z-50 rounded-t-2xl animate-fade-slide-in"
        style={{
          background: colors.card,
          bottom: 48,
          paddingBottom: 16,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div style={{ width: 36, height: 4, borderRadius: 2, background: colors.border }} />
        </div>

        <div className="px-5 pb-5">
          <div className="font-sans text-[14px] font-semibold mb-1" style={{ color: colors.text }}>
            your flare{flares.length > 1 ? "s are" : " is"} live
          </div>

          {/* Flare tabs if multiple */}
          {flares.length > 1 && (
            <div className="flex gap-2 mb-3">
              {flares.map((f, i) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFlareIdx(i)}
                  className="px-3 py-1 rounded-full border-0 font-sans text-[11px] font-semibold cursor-pointer"
                  style={{
                    background: i === selectedFlareIdx ? colors.cobalt : colors.warmGray,
                    color: i === selectedFlareIdx ? "#fff" : colors.textMuted,
                  }}
                >
                  {f.message ? `"${f.message.slice(0, 15)}${f.message.length > 15 ? "…" : ""}"` : `flare ${i + 1}`}
                </button>
              ))}
            </div>
          )}

          {selectedFlare && (
            <>
              <div className="font-sans text-[13px] mb-1" style={{ color: colors.cobalt }}>
                {flareAvailabilityLabel(selectedFlare)}
              </div>
              {selectedFlare.message && (
                <div className="font-sans text-[12px] italic mb-2" style={{ color: colors.textMuted }}>
                  "{selectedFlare.message}"
                </div>
              )}
              <div className="font-sans text-[11px] mb-4" style={{ color: colors.textMuted }}>
                expires in {countdown}
              </div>

              {/* Inline response avatars */}
              {selectedFlareIdx === 0 && responses.length > 0 && (
                <div className="mb-4">
                  <div className="font-sans text-[13px] font-semibold mb-2" style={{ color: colors.cobalt }}>
                    {responses.length} friend{responses.length > 1 ? "s" : ""} {responses.length > 1 ? "are" : "is"} down!
                  </div>
                  <div className="flex flex-col gap-2 mb-2">
                    {responses.map((r: any) => (
                      <div key={r.id} className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                          style={{ background: avatarColor(r.responder_id) }}
                        >
                          {r.responder_avatar_url ? (
                            <img src={r.responder_avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-white text-[11px] font-semibold">
                              {r.responder_name?.[0]?.toUpperCase() || "?"}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-sans text-[13px] font-medium" style={{ color: colors.text }}>
                            {r.responder_name?.split(" ")[0] || "friend"}
                          </div>
                          {r.message && (
                            <div className="font-sans text-[11px]" style={{ color: colors.textMuted }}>
                              "{r.message}"
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowResponses(true)}
                    className="bg-transparent border-0 cursor-pointer font-sans text-[11px] p-0"
                    style={{ color: colors.textMuted }}
                  >
                    add to calendar →
                  </button>
                </div>
              )}

              {selectedFlareIdx === 0 && responses.length === 0 && (
                <div className="font-sans text-[12px] italic mb-4" style={{ color: colors.textMuted }}>
                  waiting for friends to respond...
                </div>
              )}

              {/* Cancel */}
              <button
                onClick={handleCancel}
                disabled={cancelFlare.isPending}
                className="w-full py-3 mt-2 rounded-xl border font-sans text-[13px] font-semibold cursor-pointer"
                style={{
                  background: "transparent",
                  borderColor: colors.redOrange,
                  color: colors.redOrange,
                  opacity: cancelFlare.isPending ? 0.5 : 1,
                }}
              >
                {cancelFlare.isPending ? "cancelling..." : "cancel this flare"}
              </button>
            </>
          )}
        </div>
      </div>

      {showResponses && selectedFlare && (
        <FlareResponseListSheet
          flareId={selectedFlare.id}
          availabilityType={selectedFlare.availability_type}
          expiresAt={selectedFlare.expires_at}
          onClose={() => setShowResponses(false)}
        />
      )}
    </>
  );
}

// ─── Flare Controller (manages which sheet to show) ───
export function FlareController({ visible }: { visible: boolean }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const { data: activeFlares } = useMyActiveFlare();
  const hasFlares = activeFlares && activeFlares.length > 0;

  if (!visible) return null;

  return (
    <>
      <FlaresFAB onTap={() => setSheetOpen(true)} />
      {sheetOpen && (
        hasFlares ? (
          <ActiveFlareSheet onClose={() => setSheetOpen(false)} />
        ) : (
          <FlareCreationSheet onClose={() => setSheetOpen(false)} />
        )
      )}
    </>
  );
}
