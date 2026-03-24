import React, { useState, useRef, useCallback } from "react";
import { colors } from "./data";
import { avatarColor } from "./FeedScreen";
import { useCompleteOnboarding } from "@/hooks/use-onboarding";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import kyagiLogo from "@/assets/kyagi-logo-final.png";
import sonalPostImg from "@/assets/onboarding-sonal-post.jpg";
import sonalAvatar from "@/assets/onboarding-sonal.png";
import delAvatar from "@/assets/onboarding-del.jpg";
import alyssaAvatar from "@/assets/onboarding-alyssa.jpeg";


const TOTAL_SCREENS = 5;

// ─── Dot Visualization for Screen 1 ───
function VillageDots() {
  const rows = [
    [0, 1, 2, 3],
    [4, 5, 6, 7, 8],
    [9, 10, 11, 12, 13, 14],
    [15, 16, 17, 18],
    [19],
  ];

  const seed = (i: number) => {
    const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };

  const wineRed = "#7A1F2E";
  const periwinkle = "#6C6AE8";

  return (
    <div className="flex flex-col items-center gap-1">
      {rows.map((row, ri) => (
        <div key={ri} className="flex items-center justify-center" style={{ gap: 6 }}>
          {row.map((dotIdx) => {
            const s = seed(dotIdx);
            const size = 11 + s * 4;
            const color = dotIdx % 2 === 0 ? wineRed : periwinkle;
            const offsetX = (seed(dotIdx + 50) - 0.5) * 12;
            const offsetY = (seed(dotIdx + 100) - 0.5) * 12;
            return (
              <div
                key={dotIdx}
                className="rounded-full"
                style={{
                  width: size,
                  height: size,
                  background: color,
                  opacity: 0.72,
                  transform: `translate(${offsetX}px, ${offsetY}px)`,
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Shared card style ───
const cardStyle: React.CSSProperties = {
  background: "#FEFCF6",
  borderRadius: 16,
  border: "0.5px solid rgba(122, 31, 46, 0.08)",
  padding: 14,
  marginBottom: 10,
};

// ─── Screen 2: Feed Preview Cards ───
function TopCard() {
  return (
    <div style={cardStyle}>
      <div className="flex items-center mb-2.5">
        <div
          className="rounded-full flex items-center justify-center text-white font-sans text-sm font-semibold flex-shrink-0"
          style={{ background: "#8B1A2B", width: 40, height: 40 }}
        >
          D
        </div>
        <div className="ml-3 flex-1">
          <span className="font-sans text-sm font-semibold" style={{ color: colors.text }}>del</span>
          <div className="font-sans text-[11px] mt-0.5" style={{ color: colors.textMuted }}>yesterday · 6:12 pm</div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className="inline-flex items-center gap-1.5 rounded-full py-0.5 pl-1.5 pr-2.5" style={{ background: "rgba(108,106,232,0.07)" }}>
          <span className="font-sans text-[10px] font-semibold tracking-wide" style={{ color: "#6C6AE8" }}>no context</span>
        </div>
      </div>
      <p className="font-serif leading-relaxed m-0" style={{ color: colors.text, fontSize: "14.5px" }}>
        made the most incredible lamb kofta tonight
      </p>
      <div className="mt-2 mb-2">
        <div className="w-full" style={{ height: 140, borderRadius: 12, background: "linear-gradient(135deg, #D4956A 0%, #C27742 50%, #A85D30 100%)" }} />
      </div>
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-1.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.blueGray} strokeWidth="1.5" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
          <span className="font-sans text-[11px]" style={{ color: colors.blueGray }}>reply</span>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.blueGray} strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
      </div>
    </div>
  );
}

function MiddleCard() {
  const sColor = avatarColor("sonal-sample");
  return (
    <div style={cardStyle}>
      <div className="flex items-center mb-2.5">
        <div
          className="rounded-full flex items-center justify-center text-white font-sans text-sm font-semibold flex-shrink-0 overflow-hidden"
          style={{ background: sColor, width: 40, height: 40 }}
        >
          <img src={sonalAvatar} alt="sonal" className="w-full h-full object-cover" />
        </div>
        <div className="ml-3 flex-1">
          <span className="font-sans text-sm font-semibold" style={{ color: colors.text }}>sonal</span>
          <div className="font-sans text-[11px] mt-0.5" style={{ color: colors.textMuted }}>today · 10:47 am</div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className="inline-flex items-center gap-1.5 rounded-full py-0.5 pl-1.5 pr-2.5" style={{ background: "rgba(122, 31, 46, 0.1)" }}>
          <span className="font-sans text-[10px] font-semibold tracking-wide" style={{ color: "#7A1F2E" }}>a moment i loved...</span>
        </div>
      </div>
      <p className="font-serif leading-relaxed m-0" style={{ color: colors.text, fontSize: "14.5px" }}>
        turned my apartment into a cafe for my birthday
      </p>
      <div className="mt-1.5 mb-1.5">
        <img src={sonalPostImg} alt="" className="w-full object-cover" style={{ maxHeight: 160, borderRadius: 12 }} loading="lazy" />
      </div>
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-1.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.blueGray} strokeWidth="1.5" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
          <span className="font-sans text-[11px]" style={{ color: colors.blueGray }}>reply</span>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.blueGray} strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
      </div>
    </div>
  );
}

function BottomCard() {
  return (
    <div style={cardStyle}>
      <div className="flex items-center mb-2.5">
        <div
          className="rounded-full flex items-center justify-center font-sans text-sm font-semibold flex-shrink-0 overflow-hidden"
          style={{ background: "#EACED0", width: 40, height: 40 }}
        >
          <img src={alyssaAvatar} alt="alyssa" className="w-full h-full object-cover" />
        </div>
        <div className="ml-3 flex-1">
          <span className="font-sans text-sm font-semibold" style={{ color: colors.text }}>alyssa</span>
          <div className="font-sans text-[11px] mt-0.5" style={{ color: colors.textMuted }}>yesterday · 3:22 pm</div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className="inline-flex items-center gap-1.5 rounded-full py-0.5 pl-1.5 pr-2.5" style={{ background: "rgba(217, 61, 18, 0.1)" }}>
          <span className="font-sans text-[10px] font-semibold tracking-wide" style={{ color: "#D93D12" }}>here's a rec...</span>
        </div>
      </div>
      <p className="font-serif leading-relaxed m-0" style={{ color: colors.text, fontSize: "14.5px" }}>
        just finished reading michael pollan's latest book: a world appears
      </p>
    </div>
  );
}

function LayeredFeedPreview() {
  return (
    <div className="w-full relative" style={{ height: "50vh", overflow: "hidden" }}>
      <MiddleCard />
      <BottomCard />
    </div>
  );
}

// ─── Screen 3: Flare Card ───
function FlareCard() {
  const sColor = avatarColor("sonal-sample");
  return (
    <div style={{ ...cardStyle, padding: 18, margin: "0 14px" }}>
      <div className="flex items-center gap-3 mb-3">
        <div className="relative flex-shrink-0">
          <div
            className="rounded-full flex items-center justify-center text-white font-sans text-sm font-semibold overflow-hidden"
            style={{ background: sColor, width: 44, height: 44 }}
          >
            <img src={sonalAvatar} alt="sonal" className="w-full h-full object-cover" />
          </div>
          <div
            className="absolute -bottom-0.5 -right-0.5 rounded-full"
            style={{ width: 16, height: 16, background: "#6C6AE8", border: "2px solid #FEFCF6" }}
          />
        </div>
        <div>
          <div className="font-sans" style={{ fontSize: 14, fontWeight: 500, color: colors.text }}>sonal is down to hang</div>
          <div className="font-sans" style={{ fontSize: 13, color: "#6C6AE8" }}>free tonight</div>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          className="flex-1 border-0 font-sans font-medium"
          style={{ background: "#7A1F2E", color: "#fff", borderRadius: 12, padding: 12, fontSize: 13, cursor: "default" }}
        >
          i'm down too
        </button>
        <button
          className="flex-1 border-0 font-sans font-medium"
          style={{ background: "#F4EDD8", color: colors.textMuted, borderRadius: 12, padding: 12, fontSize: 13, cursor: "default" }}
        >
          not today
        </button>
      </div>
    </div>
  );
}

// ─── Screen 4: Calendar Preview ───
function CalendarPreview() {
  const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const timeLabels = ["early", "am", "pm", "eve"];
  // Which cells have periwinkle fill (row, col)
  const freeCells = new Set(["0-4", "1-2", "1-5", "2-0", "2-3", "2-5", "3-1", "3-5", "3-6"]);
  // Which cells have cobalt overlap
  const overlapCells = new Set(["2-5", "3-5"]);
  const todayCol = 2; // wednesday

  return (
    <div style={{ ...cardStyle, margin: "0 14px", padding: 14 }}>
      {/* Day headers */}
      <div className="grid grid-cols-8 gap-0.5 mb-1">
        <div /> {/* empty corner */}
        {days.map((d, i) => (
          <div key={i} className="text-center font-sans" style={{ fontSize: 10, color: colors.blueGray }}>
            <div>{d}</div>
            <div className="mt-0.5 mx-auto flex items-center justify-center" style={{
              width: 18, height: 18, borderRadius: 9, fontSize: 10,
              color: i === todayCol ? "#D93D12" : colors.textMuted,
              border: i === todayCol ? "1.5px solid #D93D12" : "none",
              fontWeight: i === todayCol ? 600 : 400,
            }}>
              {15 + i}
            </div>
          </div>
        ))}
      </div>
      {/* Grid rows */}
      {timeLabels.map((label, row) => (
        <div key={row} className="grid grid-cols-8 gap-0.5 mb-0.5">
          <div className="font-sans flex items-center" style={{ fontSize: 9, color: colors.blueGray }}>{label}</div>
          {days.map((_, col) => {
            const key = `${row}-${col}`;
            const isOverlap = overlapCells.has(key);
            const isFree = freeCells.has(key);
            return (
              <div
                key={col}
                className="rounded flex items-center justify-center"
                style={{
                  height: 28,
                  background: isOverlap ? "#3B5EBF" : isFree ? "rgba(108, 106, 232, 0.18)" : "#F4EDD8",
                  borderRadius: 4,
                }}
              >
                {isOverlap && <span className="font-sans text-white" style={{ fontSize: 9, fontWeight: 600 }}>1</span>}
              </div>
            );
          })}
        </div>
      ))}
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2">
        {[
          { color: "rgba(108, 106, 232, 0.18)", label: "you're free" },
          { color: "#3B5EBF", label: "friends overlap" },
          { color: "#7A1F2E", label: "scheduled" },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1">
            <div className="rounded-full" style={{ width: 6, height: 6, background: l.color }} />
            <span className="font-sans" style={{ fontSize: 9, color: colors.blueGray }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConfirmedHangoutCard() {
  return (
    <div style={{ ...cardStyle, margin: "10px 14px 0", padding: 14 }}>
      <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="rounded-full flex items-center justify-center font-sans text-sm font-semibold flex-shrink-0 overflow-hidden"
              style={{ background: "#EACED0", width: 40, height: 40 }}
            >
              <img src={delAvatar} alt="del" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="font-sans" style={{ fontSize: 14, fontWeight: 500, color: colors.text }}>walk with del</div>
            <div className="font-sans" style={{ fontSize: 12, color: colors.blueGray }}>saturday morning · confirmed</div>
          </div>
        </div>
        <div className="font-sans" style={{
          fontSize: 10, fontWeight: 500, color: "#6C6AE8",
          background: "rgba(108, 106, 232, 0.1)", padding: "3px 8px", borderRadius: 8,
        }}>
          confirmed
        </div>
      </div>
    </div>
  );
}

// ─── Main Onboarding Flow ───
interface OnboardingFlowProps {
  onComplete: (navigateTo?: "village") => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [screen, setScreen] = useState(0);
  const touchStartX = useRef(0);
  const completeOnboarding = useCompleteOnboarding();
  const [completing, setCompleting] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) {
      if (dx < 0 && screen < TOTAL_SCREENS - 1) setScreen(screen + 1);
      if (dx > 0 && screen > 0) setScreen(screen - 1);
    }
  };

  const handleMeetCircle = async () => {
    setCompleting(true);
    try {
      await completeOnboarding.mutateAsync("exploring");
      onComplete("village");
    } catch {
      setCompleting(false);
    }
  };

  const handleSkip = async () => {
    try {
      await completeOnboarding.mutateAsync("exploring");
      onComplete();
    } catch {}
  };

  const handleEnableNotifications = async () => {
    try {
      if ("Notification" in window) {
        await Notification.requestPermission();
      }
    } catch {}
    setScreen(4);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col"
      style={{ background: screen === 3 ? "#F0F0F2" : colors.bg }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex-1 flex flex-col overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
        {/* ── Screen 1: Your Village ── */}
        {screen === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center animate-fade-slide-in">
            <img src={kyagiLogo} alt="kyagi" style={{ width: 56 }} />
            <div style={{ height: 20 }} />
            <VillageDots />
            <div style={{ height: 20 }} />
            <div style={{ fontFamily: "Georgia, serif", fontSize: 22, color: colors.text }}>
              this is your village.
            </div>
            <div style={{ height: 8 }} />
            <div className="font-sans" style={{ fontSize: 14, color: colors.textMuted }}>
              your closest 20 people, all in one place.
            </div>
          </div>
        )}

        {/* ── Screen 2: Your Feed ── */}
        {screen === 1 && (
          <div className="flex-1 flex flex-col animate-fade-slide-in">
            <div className="font-sans" style={{ fontSize: 15, fontWeight: 500, color: colors.text, padding: "20px 18px 14px" }}>
              welcome to your feed
            </div>
            <div className="px-4">
              <MiddleCard />
              <BottomCard />
            </div>
            {/* End of feed CTA */}
            <div className="flex flex-col items-center px-6 pb-0 pt-1 mt-1">
              <div style={{ fontFamily: "Georgia, serif", fontSize: 15, color: colors.text, textAlign: "center" }}>
                that's everything.
              </div>
              <div className="font-sans" style={{ fontSize: 12, color: colors.blueGray, textAlign: "center", marginTop: 0 }}>
                now go hang out with someone.
              </div>
              <div
                className="font-sans text-center"
                style={{
                  background: "#7A1F2E",
                  color: "#FEFCF6",
                  fontSize: 12,
                  fontWeight: 500,
                  borderRadius: 999,
                  padding: "8px 22px",
                  marginTop: 6,
                }}
              >
                the only app where your feed ends.
              </div>
            </div>
          </div>
        )}

        {/* ── Screen 3: Meet Offline (Combined) ── */}
        {screen === 2 && (
          <div className="flex-1 flex flex-col animate-fade-slide-in overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
            <div className="font-sans" style={{ fontSize: 16, fontWeight: 500, color: colors.text, padding: "20px 18px 12px" }}>
              meet offline
            </div>

            {/* Scheduled section */}
            <div className="flex items-center gap-1.5" style={{ padding: "0 18px 8px" }}>
              <span className="font-sans" style={{ fontSize: 15, fontWeight: 700, color: "#7A1F2E" }}>1.</span>
              <span className="font-sans" style={{ fontSize: 14, fontWeight: 600, color: "#7A1F2E", textTransform: "uppercase", letterSpacing: 1 }}>
                schedule in advance
              </span>
              <span style={{ fontSize: 16 }}>📅</span>
            </div>
            <CalendarPreview />
            <ConfirmedHangoutCard />

            {/* Flare section */}
            <div className="flex items-center gap-1.5" style={{ padding: "14px 18px 8px" }}>
              <span className="font-sans" style={{ fontSize: 15, fontWeight: 700, color: "#6C6AE8" }}>2.</span>
              <span className="font-sans" style={{ fontSize: 14, fontWeight: 600, color: "#6C6AE8", textTransform: "uppercase", letterSpacing: 1 }}>
                send a spontaneous flare
              </span>
              <span style={{ fontSize: 16 }}>⚡️</span>
            </div>
            <FlareCard />

            {/* Bottom CTA */}
            <div className="flex-1" />
            <div className="text-center px-6 pb-4 pt-3">
              <div style={{ fontFamily: "Georgia, serif", fontSize: 17, color: colors.text }}>
                real plans with real friends.
              </div>
              <div className="font-sans mt-1" style={{ fontSize: 13, color: colors.textMuted }}>
                send a flare or schedule something —
              </div>
              <div className="font-sans" style={{ fontSize: 13, color: colors.textMuted }}>
                kyagi makes it easy to show up.
              </div>
            </div>
          </div>
        )}

        {/* ── Screen 4: Notifications ── */}
        {screen === 3 && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center animate-fade-slide-in"
            style={{ background: "#F0F0F2" }}>
            {/* Bell icon */}
            <div className="relative">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6C6AE8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <div className="absolute" style={{ top: 2, right: 4, width: 8, height: 8, borderRadius: 4, background: "#6C6AE8" }} />
            </div>
            <div style={{ height: 20 }} />
            <div style={{ fontFamily: "Georgia, serif", fontSize: 20, color: "#2A2A2E" }}>
              notifications that respect you.
            </div>
            <div style={{ height: 12 }} />
            <div className="font-sans" style={{ fontSize: 14, color: "#6B6B76", lineHeight: 1.6, maxWidth: 280 }}>
              just a heads up when a friend wants to see you and for your weekly sunday reset.
            </div>
            <div style={{ height: 32 }} />
            <button
              onClick={handleEnableNotifications}
              className="w-full border-0 cursor-pointer font-sans font-medium"
              style={{
                maxWidth: 300,
                background: "#6C6AE8",
                color: "#FFFFFF",
                fontSize: 15,
                fontWeight: 500,
                borderRadius: 14,
                padding: 14,
              }}
            >
              enable notifications
            </button>
            <button
              onClick={() => setScreen(4)}
              className="bg-transparent border-0 cursor-pointer font-sans mt-3"
              style={{ fontSize: 12, color: "#8A8A96" }}
            >
              not now
            </button>
          </div>
        )}

        {/* ── Screen 5: Closing ── */}
        {screen === 4 && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center animate-fade-slide-in">
            <img src={kyagiLogo} alt="kyagi" style={{ width: 48 }} />
            <div style={{ height: 24 }} />
            <div style={{ fontFamily: "Georgia, serif", fontSize: 20, color: colors.text }}>
              updates from friends,
            </div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 20, color: colors.text }}>
              with a scroll that ends.
            </div>
            <div style={{ height: 8 }} />
            <div className="font-sans" style={{ fontSize: 14, color: colors.textMuted }}>
              welcome to kyagi.
            </div>
            <div style={{ height: 32 }} />
            <button
              onClick={handleMeetCircle}
              disabled={completing}
              className="w-full border-0 cursor-pointer font-sans font-medium"
              style={{
                maxWidth: 300,
                background: "#7A1F2E",
                color: "#FEFCF6",
                fontSize: 16,
                fontWeight: 500,
                borderRadius: 14,
                padding: 16,
                opacity: completing ? 0.6 : 1,
              }}
            >
              {completing ? "loading..." : "curate your village"}
            </button>
          </div>
        )}
      </div>

      {/* Dots — 5 dots */}
      <div className="flex items-center justify-center pb-2" style={{ gap: 6 }}>
        {Array.from({ length: TOTAL_SCREENS }).map((_, i) => (
          <button
            key={i}
            onClick={() => setScreen(i)}
            className="rounded-full border-0 cursor-pointer p-0"
            style={{ width: 6, height: 6, background: screen === i ? "#6C6AE8" : "#D4DAE8" }}
          />
        ))}
      </div>

      {/* Skip — shown on screens 1-3, not on screen 5 */}
      {screen < 4 && (
        <button
          onClick={handleSkip}
          className="bg-transparent border-0 cursor-pointer font-sans text-xs mx-auto block pb-6"
          style={{ color: colors.blueGray }}
        >
          skip
        </button>
      )}
      {screen === 4 && <div style={{ height: 32 }} />}
    </div>
  );
}
