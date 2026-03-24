import React, { useState, useRef } from "react";
import { colors } from "./data";
import { useWeeklyFlow, WeeklyFriend } from "@/hooks/use-weekly-flow";
import { TimeBlockKey } from "@/hooks/use-schedule";
import { avatarColor } from "./FeedScreen";

const TIME_BLOCK_KEYS: TimeBlockKey[] = ["early_morning", "morning", "afternoon", "evening"];
const SLOT_LABELS: Record<string, string> = {
  early_morning: "Early AM",
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

const DAY_ABBREV = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/* Shared avatar: shows photo if available, initial circle otherwise */
function FriendAvatar({ friend, size = 40 }: { friend: WeeklyFriend; size?: number }) {
  const bg = avatarColor(friend.id);
  if (friend.avatarUrl) {
    return (
      <img
        src={friend.avatarUrl}
        alt=""
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, background: bg }}
    >
      <span className="text-white font-semibold" style={{ fontSize: size * 0.35 }}>
        {friend.avatarInitial}
      </span>
    </div>
  );
}

interface WeeklyFlowModalProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function WeeklyFlowModal({ onComplete, onSkip }: WeeklyFlowModalProps) {
  const [card, setCard] = useState(0);
  const {
    daysToShow,
    isShortWeek,
    friends,
    selectedFriendIds,
    toggleFriend,
    selectTopThree,
    availabilitySet,
    toggleAvailability,
    completeFlow,
  } = useWeeklyFlow();

  const touchStartX = useRef(0);
  const [completing, setCompleting] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) {
      if (dx < 0 && card < 2) setCard(card + 1);
      if (dx > 0 && card > 0) setCard(card - 1);
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await completeFlow.mutateAsync();
      onComplete();
    } catch {
      setCompleting(false);
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];

  // Build summary pills — grouped by day
  const freePills = daysToShow
    .map(d => {
      const dateStr = d.toISOString().split("T")[0];
      const slots = TIME_BLOCK_KEYS.filter(slot => availabilitySet.has(`${dateStr}|${slot}`));
      if (slots.length === 0) return null;
      const slotLabels = slots.map(s => SLOT_LABELS[s].toLowerCase()).join(" · ");
      return { day: DAY_ABBREV[d.getDay()], times: slotLabels };
    })
    .filter(Boolean) as { day: string; times: string }[];

  const selectedFriends = friends.filter(f => selectedFriendIds.has(f.id));

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "#F4EDD8" }}
    >
      {/* Cards container */}
      <div
        className="w-full max-w-[360px] flex-1 flex flex-col justify-center px-4 mx-auto overflow-y-auto py-6"
        style={{ WebkitOverflowScrolling: "touch" }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="rounded-2xl overflow-hidden flex-shrink-0" style={{ background: "#FEFCF6" }}>
          <div className="p-4">
            {/* YOUR WEEK label */}
            <div
              className="font-sans text-[11px] font-semibold uppercase tracking-widest mb-2"
              style={{ color: "#8090AC", letterSpacing: "1px" }}
            >
              YOUR WEEK
            </div>

            {card === 0 && (
              <AvailabilityCard
                daysToShow={daysToShow}
                isShortWeek={isShortWeek}
                availabilitySet={availabilitySet}
                toggleAvailability={toggleAvailability}
                todayStr={todayStr}
              />
            )}

            {card === 1 && (
              <FriendsCard
                friends={friends}
                selectedFriendIds={selectedFriendIds}
                toggleFriend={toggleFriend}
                selectTopThree={selectTopThree}
              />
            )}

            {card === 2 && (
              <SummaryCard
                freePills={freePills}
                selectedFriends={selectedFriends}
                completing={completing}
                onComplete={handleComplete}
              />
            )}
          </div>
        </div>

        {/* Dots */}
        <div className="flex items-center justify-center gap-2 mt-5">
          {[0, 1, 2].map(i => (
            <button
              key={i}
              onClick={() => setCard(i)}
              className="w-2 h-2 rounded-full border-0 cursor-pointer p-0"
              style={{ background: card === i ? "#6C6AE8" : "#D4DAE8" }}
            />
          ))}
        </div>

        {/* Skip */}
        <button
          onClick={onSkip}
          className="mt-3 bg-transparent border-0 cursor-pointer font-sans text-xs mx-auto block"
          style={{ color: "#8090AC" }}
        >
          skip for now
        </button>
      </div>
    </div>
  );
}

/* ─── Card 1: Availability ─── */
function AvailabilityCard({
  daysToShow,
  isShortWeek,
  availabilitySet,
  toggleAvailability,
  todayStr,
}: {
  daysToShow: Date[];
  isShortWeek: boolean;
  availabilitySet: Set<string>;
  toggleAvailability: any;
  todayStr: string;
}) {
  return (
    <>
      <div className="font-serif text-xl mb-1" style={{ color: "#2C2E3A", fontFamily: "Georgia, serif" }}>
        {isShortWeek ? "any time left this week?" : "when could you see someone?"}
      </div>
      <div className="font-sans text-[13px] mb-4" style={{ color: "#8090AC" }}>
        tap the blocks when you're free
      </div>

      {/* Grid */}
      <div className="-mx-1">
        <table className="w-full border-collapse table-fixed" style={{ tableLayout: "fixed" }}>
          <colgroup>
            <col style={{ width: 52 }} />
            {daysToShow.map((_, i) => <col key={i} />)}
          </colgroup>
          <thead>
            <tr>
              <th style={{ width: 52 }} />
              {daysToShow.map(d => {
                const dateStr = d.toISOString().split("T")[0];
                const isToday = dateStr === todayStr;
                const dayAbbr = DAY_ABBREV[d.getDay()];
                const dateNum = d.getDate();
                return (
                  <th key={dateStr} className="text-center pb-2 px-0.5">
                    <div
                      className="font-sans text-[10px] font-medium"
                      style={{ color: isToday ? "#D93D12" : "#8090AC" }}
                    >
                      {dayAbbr}
                    </div>
                    <div
                      className="font-sans text-[10px] font-semibold mx-auto flex items-center justify-center"
                      style={{
                        color: isToday ? "#D93D12" : "#8090AC",
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        border: isToday ? "1.5px solid #D93D12" : "none",
                      }}
                    >
                      {dateNum}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {TIME_BLOCK_KEYS.map(slot => (
              <tr key={slot}>
                <td className="pr-1.5 py-0.5">
                  <div className="font-sans text-[10px] font-medium text-right" style={{ color: "#8090AC" }}>
                    {SLOT_LABELS[slot]}
                  </div>
                </td>
                {daysToShow.map(d => {
                  const dateStr = d.toISOString().split("T")[0];
                  const key = `${dateStr}|${slot}`;
                  const isFree = availabilitySet.has(key);
                  return (
                    <td key={key} className="px-0.5 py-0.5">
                      <button
                        onClick={() => toggleAvailability.mutate({ date: dateStr, timeSlot: slot })}
                        className="w-full border-0 cursor-pointer p-0"
                        style={{
                          height: 24,
                          borderRadius: 6,
                          background: isFree ? `${colors.electricIndigo}30` : "#F4EDD8",
                          border: isFree ? "none" : "1px solid #D4DAE8",
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ background: `${colors.electricIndigo}30` }} />
          <span className="font-sans text-[10px]" style={{ color: "#8090AC" }}>free</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded" style={{ background: "#F4EDD8", border: "1px solid #D4DAE8" }} />
          <span className="font-sans text-[10px]" style={{ color: "#8090AC" }}>not set</span>
        </div>
      </div>
    </>
  );
}

/* ─── Card 2: Priority Friends ─── */
function FriendsCard({
  friends,
  selectedFriendIds,
  toggleFriend,
  selectTopThree,
}: {
  friends: WeeklyFriend[];
  selectedFriendIds: Set<string>;
  toggleFriend: (id: string) => void;
  selectTopThree: () => void;
}) {
  return (
    <>
      <div className="font-serif text-xl mb-1" style={{ color: "#2C2E3A", fontFamily: "Georgia, serif" }}>
        anyone in particular?
      </div>
      <div className="font-sans text-[13px] mb-4" style={{ color: "#8090AC" }}>
        pick 1–3 friends you'd love to see this week
      </div>

      <div className="max-h-[280px] overflow-y-auto -mx-1 px-1" style={{ WebkitOverflowScrolling: "touch" }}>
        {friends.map(f => {
          const isSelected = selectedFriendIds.has(f.id);
          const bgColor = avatarColor(f.id);
          return (
            <button
              key={f.id}
              onClick={() => toggleFriend(f.id)}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl mb-1.5 border cursor-pointer bg-transparent text-left"
              style={{
                borderColor: isSelected ? "#6C6AE8" : "transparent",
                borderWidth: "1.5px",
              }}
            >
              <FriendAvatar friend={f} size={40} />
              <div className="flex-1 min-w-0">
                <div className="font-sans text-sm font-medium" style={{ color: "#2C2E3A" }}>
                  {f.displayName}
                </div>
                <div className="font-sans text-[11px]" style={{ color: "#8090AC" }}>
                  {f.lastSeenDaysAgo === null
                    ? "haven't hung out yet"
                    : f.lastSeenDaysAgo === 0
                    ? "saw today"
                    : `last saw ${f.lastSeenDaysAgo} day${f.lastSeenDaysAgo !== 1 ? "s" : ""} ago`}
                </div>
              </div>
              <div
                className="w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: isSelected ? "#6C6AE8" : "transparent",
                  border: isSelected ? "1.5px solid #6C6AE8" : "1.5px solid #D4DAE8",
                }}
              >
                {isSelected && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6L5 8.5L9.5 3.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </button>
          );
        })}

        {/* Surprise me */}
        <button
          onClick={selectTopThree}
          className="w-full p-3 rounded-xl mt-1 cursor-pointer bg-transparent text-center"
          style={{
            border: "1.5px dashed #D4DAE8",
          }}
        >
          <span className="font-sans text-[13px]" style={{ color: "#8090AC" }}>
            surprise me — suggest who i haven't seen
          </span>
        </button>
      </div>
    </>
  );
}

/* ─── Card 3: Summary ─── */
function SummaryCard({
  freePills,
  selectedFriends,
  completing,
  onComplete,
}: {
  freePills: { day: string; times: string }[];
  selectedFriends: WeeklyFriend[];
  completing: boolean;
  onComplete: () => void;
}) {
  return (
    <>
      <div className="font-serif text-xl mb-1" style={{ color: "#2C2E3A", fontFamily: "Georgia, serif" }}>
        you're set
      </div>
      <div className="font-sans text-[13px] mb-5" style={{ color: "#8090AC" }}>
        we'll keep an eye out and nudge you if the stars align.
      </div>

      {/* Free windows */}
      <div className="mb-4">
        <div
          className="font-sans text-[11px] font-semibold uppercase tracking-wider mb-2"
          style={{ color: "#8090AC" }}
        >
          YOUR FREE WINDOWS
        </div>
        <div className="flex flex-wrap gap-1.5">
          {freePills.length > 0 ? (
            freePills.map((p, i) => (
              <span
                key={i}
                className="font-sans text-xs px-3 py-1 rounded-full"
                style={{ background: `#6C6AE833`, color: "#6C6AE8" }}
              >
                <span className="font-semibold">{p.day}</span> {p.times}
              </span>
            ))
          ) : (
            <span
              className="font-sans text-xs px-3 py-1 rounded-full"
              style={{ background: "#D4DAE8", color: "#8090AC" }}
            >
              no blocks set yet
            </span>
          )}
        </div>
      </div>

      {/* Want to see */}
      <div className="mb-5">
        <div
          className="font-sans text-[11px] font-semibold uppercase tracking-wider mb-2"
          style={{ color: "#8090AC" }}
        >
          WANT TO SEE
        </div>
        {selectedFriends.length > 0 ? (
          <div className="flex gap-4">
            {selectedFriends.map(f => (
              <div key={f.id} className="flex flex-col items-center">
                <FriendAvatar friend={f} size={40} />
                <span className="font-sans text-xs" style={{ color: "#2C2E3A" }}>
                  {f.displayName}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="font-sans text-[13px]" style={{ color: "#8090AC" }}>
            no one selected — that's okay
          </div>
        )}
      </div>

      {/* CTA */}
      <button
        onClick={onComplete}
        disabled={completing}
        className="w-full py-3.5 rounded-[14px] border-0 cursor-pointer font-sans text-[15px] font-medium"
        style={{ background: "#7A1F2E", color: "#FEFCF6", opacity: completing ? 0.6 : 1 }}
      >
        {completing ? "saving..." : "start your week"}
      </button>

      {/* Footer */}
      <div
        className="text-center mt-3.5 font-serif text-xs italic"
        style={{ color: "#8090AC", fontFamily: "Georgia, serif" }}
      >
        go see your people.
      </div>
    </>
  );
}
