import React, { useState } from "react";
import { colors, PROMPTS } from "./data";
import { promptIcons } from "./icons";
import { PhotoMedia } from "./MediaBlock";
import { useArchiveMonths, useArchivePostsByMonth } from "@/hooks/use-archive";

function formatDay(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Compute streak: consecutive calendar days (backwards from today) with ≥1 post */
function computeStreak(postDates: string[]): number {
  if (postDates.length === 0) return 0;
  const uniqueDays = new Set(
    postDates.map(d => {
      const dt = new Date(d);
      return `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`;
    })
  );
  let streak = 0;
  const now = new Date();
  for (let i = 0; i < 365; i++) {
    const check = new Date(now);
    check.setDate(check.getDate() - i);
    const key = `${check.getFullYear()}-${check.getMonth()}-${check.getDate()}`;
    if (uniqueDays.has(key)) {
      streak++;
    } else if (i === 0) {
      // today might not have a post yet, keep going
      continue;
    } else {
      break;
    }
  }
  return streak;
}

/** Count unique days with posts */
function computeDaysRecorded(postDates: string[]): number {
  const uniqueDays = new Set(
    postDates.map(d => {
      const dt = new Date(d);
      return `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`;
    })
  );
  return uniqueDays.size;
}

export function ArchiveScreen() {
  const { data: archiveData, isLoading } = useArchiveMonths();
  const latestMonth = archiveData?.months?.[0]?.key ?? null;
  const [selectedMonth, setSelectedMonth] = useState<string | null>("__auto__");
  const effectiveMonth = selectedMonth === "__auto__" ? latestMonth : selectedMonth;
  const showingMonthList = effectiveMonth === null;
  const { data: monthPosts, isLoading: postsLoading } = useArchivePostsByMonth(effectiveMonth);

  const months = archiveData?.months || [];
  const totalCount = archiveData?.totalCount || 0;
  const mediaCount = archiveData?.mediaCount || 0;
  const allDates = archiveData?.allDates || [];
  const daysRecorded = computeDaysRecorded(allDates);
  const streak = computeStreak(allDates);

  // Group posts by day
  const dayGroups: { day: string; posts: typeof monthPosts }[] = [];
  if (monthPosts) {
    const grouped = new Map<string, typeof monthPosts>();
    // Sort posts ascending (oldest first) to match compose order
    const sortedPosts = [...monthPosts].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    for (const p of sortedPosts) {
      const day = formatDay(p.created_at);
      if (!grouped.has(day)) grouped.set(day, []);
      grouped.get(day)!.push(p);
    }
    // Show days in reverse chronological order (newest day first)
    const dayKeys = Array.from(grouped.keys()).reverse();
    for (const day of dayKeys) {
      dayGroups.push({ day, posts: grouped.get(day)! });
    }
  }

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="font-serif text-[22px] font-medium italic m-0 mb-1.5" style={{ color: colors.text }}>your archive</h2>
        <p className="font-sans text-xs m-0" style={{ color: colors.textMuted }}>a curated album of your life</p>
      </div>

      {/* Stats row: Days Recorded / Moments Captured / Streak */}
      {!isLoading && (
        <div className="flex gap-2.5 mb-5">
          <div className="flex-1 rounded-xl p-3 text-center" style={{ background: colors.card, border: `1px solid ${colors.border}` }}>
            <div className="font-sans text-xl font-bold" style={{ color: colors.cobalt }}>{daysRecorded}</div>
            <div className="font-sans text-[10px] mt-0.5" style={{ color: colors.textMuted }}>days recorded</div>
          </div>
          <div className="flex-1 rounded-xl p-3 text-center" style={{ background: colors.card, border: `1px solid ${colors.border}` }}>
            <div className="font-sans text-xl font-bold" style={{ color: colors.accent }}>{totalCount}</div>
            <div className="font-sans text-[10px] mt-0.5" style={{ color: colors.textMuted }}>moments captured</div>
          </div>
          <div className="flex-1 rounded-xl p-3 text-center" style={{ background: colors.card, border: `1px solid ${colors.border}` }}>
            <div className="font-sans text-xl font-bold flex items-center justify-center gap-1" style={{ color: colors.amber }}>
              🔥 {streak}
            </div>
            <div className="font-sans text-[10px] mt-0.5" style={{ color: colors.textMuted }}>day streak</div>
          </div>
        </div>
      )}

      {/* Bigger stats card */}
      <div className="rounded-xl py-4 px-5 mb-5 text-center"
           style={{ background: `linear-gradient(135deg, #2B5BA8, #1E4D8C)` }}>
        <div className="font-sans text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: "#C48A1A" }}>your year so far</div>
        {isLoading ? (
          <div className="w-5 h-5 rounded-full border-2 animate-spin-loader mx-auto my-3" 
               style={{ borderColor: "rgba(240,232,200,0.3)", borderTopColor: "#F0E8C8" }} />
        ) : (
          <>
            <div className="font-serif text-4xl font-semibold" style={{ color: "#F0E8C8" }}>{totalCount}</div>
            <div className="font-sans text-xs" style={{ color: "rgba(240,232,200,0.75)" }}>moments captured</div>
            <div className="mt-3 flex justify-center gap-5">
              <div className="text-center">
                <div className="font-sans text-base font-bold" style={{ color: "#F0E8C8" }}>{totalCount}</div>
                <div className="font-sans text-[10px]" style={{ color: "rgba(240,232,200,0.6)" }}>entries</div>
              </div>
              <div className="text-center">
                <div className="font-sans text-base font-bold" style={{ color: "#F0E8C8" }}>{mediaCount}</div>
                <div className="font-sans text-[10px]" style={{ color: "rgba(240,232,200,0.6)" }}>media</div>
              </div>
              <div className="text-center">
                <div className="font-sans text-base font-bold" style={{ color: "#F0E8C8" }}>{months.length}</div>
                <div className="font-sans text-[10px]" style={{ color: "rgba(240,232,200,0.6)" }}>months</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Month list or detail */}
      {showingMonthList ? (
        <>
          {isLoading && (
            <div className="text-center py-8">
              <div className="font-sans text-xs" style={{ color: colors.textMuted }}>loading archive...</div>
            </div>
          )}

          {!isLoading && months.length === 0 && (
            <div className="text-center py-8">
              <div className="text-3xl mb-3">📓</div>
              <div className="font-serif text-base italic mb-1.5" style={{ color: colors.text }}>nothing here yet</div>
              <div className="font-sans text-xs" style={{ color: colors.textMuted }}>your entries will appear here as you share</div>
            </div>
          )}

          {months.map((m, i) => (
            <button key={m.key} onClick={() => setSelectedMonth(m.key)}
              className="w-full text-left rounded-xl p-4 px-4 mb-2.5 border cursor-pointer flex items-center justify-between box-border animate-fade-slide-in"
              style={{ background: colors.card, borderColor: colors.border, animationDelay: `${i * 0.07}s` }}>
              <div>
                <div className="font-sans text-sm font-semibold" style={{ color: colors.text }}>{m.label}</div>
              </div>
              <div className="rounded-full py-0.5 px-2.5 font-sans text-[11px]" style={{ background: colors.warmGray, color: colors.textMuted }}>
                {m.count}
              </div>
            </button>
          ))}
        </>
      ) : (
        <div>
          <button onClick={() => setSelectedMonth(null)} 
            className="bg-transparent border-0 cursor-pointer font-sans text-xs mb-3.5 p-0"
            style={{ color: colors.accent }}>
            ← back to all months
          </button>

          {postsLoading && (
            <div className="text-center py-8">
              <div className="w-5 h-5 rounded-full border-2 animate-spin-loader mx-auto mb-3" 
                   style={{ borderColor: colors.border, borderTopColor: colors.accent }} />
            </div>
          )}

          {dayGroups.map((group, i) => (
            <div key={group.day} className="rounded-xl p-4 mb-2.5 border animate-fade-slide-in"
                 style={{ background: colors.card, borderColor: colors.border, animationDelay: `${i * 0.08}s` }}>
              <div className="font-sans text-[11px] font-semibold mb-2.5" style={{ color: colors.accent }}>{group.day}</div>
              {group.posts!.map((post, j) => {
                const prompt = PROMPTS.find(p => p.id === post.prompt_type) || PROMPTS[0];
                return (
                  <div key={post.id} className={j > 0 ? "pt-2.5 mt-2.5 border-t" : ""} style={{ borderColor: colors.border }}>
                    <div className="inline-flex items-center gap-1 rounded-2xl py-0.5 pl-1.5 pr-2 mb-1"
                         style={{ background: `${prompt.color}12` }}>
                      {promptIcons[prompt.icon](prompt.color)}
                      <span className="font-sans text-[9px] font-semibold" style={{ color: prompt.color }}>{prompt.label}</span>
                    </div>
                    <p className="font-serif text-[13px] leading-relaxed m-0" style={{ color: colors.text }}>{post.content}</p>
                    {post.media.map((m, k) => (
                      <PhotoMedia key={k} url={m.url} />
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
