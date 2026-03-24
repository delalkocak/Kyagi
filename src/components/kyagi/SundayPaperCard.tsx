import React, { useState } from "react";
import { colors } from "./data";
import { VillageMonthly, useDismissMonthly } from "@/hooks/use-sunday-paper";
import { useRecommendationSections } from "@/hooks/use-rec-sections";
import { avatarColor } from "./FeedScreen";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

function formatDateRange(start: string, end: string): string {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  const sMonth = s.toLocaleDateString("en", { month: "long" }).toLowerCase();
  const eMonth = e.toLocaleDateString("en", { month: "long" }).toLowerCase();
  const year = e.getFullYear();
  if (sMonth === eMonth) {
    return `${sMonth} ${year}`;
  }
  return `${sMonth} – ${eMonth} ${year}`;
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="mb-3">
      <div
        className="font-serif text-[10px] uppercase tracking-[2px] font-medium"
        style={{ color: "#8B2332", marginBottom: 6 }}
      >
        {label}
      </div>
      <div style={{ borderTop: "1px solid #D4C9B8" }} />
    </div>
  );
}

function RecList({ items }: { items: { emoji: string; name: string; text: string; user_id: string; avatar_url: string | null }[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2.5">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden mt-0.5"
            style={{ background: avatarColor(item.user_id) }}
          >
            {item.avatar_url ? (
              <img src={item.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-[9px] font-semibold">
                {item.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <p className="font-sans text-[12.5px] leading-relaxed m-0" style={{ color: "#4A4035" }}>
            {item.emoji} <span className="font-semibold">{item.name}</span> recommended {item.text}
          </p>
        </div>
      ))}
    </div>
  );
}

export function VillageMonthlyCard({ paper, onTapMoment, archiveMode }: { paper: VillageMonthly; onTapMoment?: (postId: string) => void; archiveMode?: boolean }) {
  const dismiss = useDismissMonthly();
  const dateRange = formatDateRange(paper.week_start, paper.week_end);
  const [expanded, setExpanded] = useState(!!archiveMode);
  const { data: recSections } = useRecommendationSections();

  // Fetch avatar for moment-of-month user
  const momentUserId = paper.moment_of_week_data?.user_id;
  const { data: momentProfile } = useQuery({
    queryKey: ["profile-avatar", momentUserId],
    enabled: !!momentUserId,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("user_id", momentUserId!)
        .single();
      return data;
    },
  });

  // Check if paper has any content at all
  const hasAnyContent = paper.image_of_week_url ||
    paper.moment_of_week_data ||
    recSections?.reading ||
    recSections?.dining ||
    recSections?.gallery ||
    (paper.top_poster_name && paper.top_poster_count);

  const handleToggle = () => setExpanded(prev => !prev);

  return (
    <div
      className="rounded-2xl mb-3.5 overflow-hidden relative"
      style={{
        minHeight: 52,
        background: expanded ? "#FAF6EF" : "#8B2332",
        border: expanded ? "0.5px solid #E8E0D0" : "0.5px solid transparent",
        transition: "background-color 250ms ease, border-color 250ms ease",
      }}
    >
      {/* Collapsed bar */}
      <div
        onClick={handleToggle}
        className="flex items-center justify-between cursor-pointer absolute top-0 left-0 w-full z-10"
        style={{
          padding: "0 20px",
          height: 52,
          opacity: expanded ? 0 : 1,
          pointerEvents: expanded ? "none" : "auto",
          transition: "opacity 150ms ease",
        }}
      >
        <span className="font-serif text-[16px] lowercase" style={{ color: "#FFFFFF" }}>
          the village monthly
        </span>
        <div className="flex items-center gap-3">
          <span
            className="font-sans text-[12px] uppercase tracking-wider"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            {dateRange}
          </span>
          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.6)" }}>▼</span>
        </div>
      </div>

      {/* Expanded content */}
      <div
        style={{
          display: "grid",
          gridTemplateRows: expanded ? "1fr" : "0fr",
          transition: "grid-template-rows 400ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div style={{ overflow: "hidden" }}>
          <div
            style={{
              opacity: expanded ? 1 : 0,
              transition: expanded ? "opacity 250ms ease 100ms" : "opacity 150ms ease",
            }}
          >
            {/* Masthead */}
            <div style={{ padding: "10px 24px 0" }}>
              {/* Collapse control */}
              <div className="flex justify-end mb-2">
                <button
                  onClick={handleToggle}
                  className="bg-transparent border-0 cursor-pointer p-1"
                  style={{ color: "#8C7E6E" }}
                >
                  <span className="text-[10px]">▲</span>
                </button>
              </div>

              {/* Top maroon rule */}
              <div style={{ borderTop: "2px solid #8B2332", marginBottom: 14 }} />

              {/* Title */}
              <div className="text-center">
                <h2
                  className="font-serif lowercase m-0"
                  style={{
                    fontSize: 28,
                    color: "#2C2420",
                    letterSpacing: "-0.5px",
                    fontWeight: 400,
                    lineHeight: 1.1,
                  }}
                >
                  the village monthly
                </h2>
              </div>

              {/* Date + Edition */}
              <div
                className="text-center font-sans uppercase mt-2"
                style={{ fontSize: 11, letterSpacing: "1.5px", color: "#8C7E6E" }}
              >
                {dateRange}
              </div>

              {/* Bottom maroon rule */}
              <div style={{ borderTop: "2px solid #8B2332", marginTop: 14 }} />

              {/* Warm gray divider below masthead */}
              <div style={{ borderTop: "1px solid #C4B8A4", marginTop: 16, marginBottom: 20 }} />
            </div>

            {/* Sections */}
            <div style={{ padding: "0 24px" }}>
              {!hasAnyContent ? (
                <div className="mb-5">
                  <p className="font-serif text-[13px] leading-relaxed italic text-center m-0" style={{ color: "#8C7E6E" }}>
                    a quiet month in the village. sometimes those are the best ones.
                  </p>
                </div>
              ) : (
                <>
                  {paper.image_of_week_url && (
                    <div className="mb-5">
                      <SectionHeader label="image of the month" />
                      <button
                        onClick={() => paper.image_of_week_post_id && onTapMoment?.(paper.image_of_week_post_id)}
                        className="w-full bg-transparent border-0 cursor-pointer p-0"
                      >
                        <div className="rounded-xl overflow-hidden">
                          <img src={paper.image_of_week_url} alt="image of the month" className="w-full object-cover rounded-xl" style={{ maxHeight: 200 }} />
                        </div>
                      </button>
                    </div>
                  )}

                  {paper.moment_of_week_data && (
                    <div className="mb-5">
                      <SectionHeader label="moment of the month" />
                      <button
                        onClick={() => onTapMoment?.(paper.moment_of_week_data!.post_id)}
                        className="w-full text-left bg-transparent border-0 cursor-pointer p-0"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                            style={{ background: avatarColor(paper.moment_of_week_data.user_id) }}
                          >
                            {momentProfile?.avatar_url ? (
                              <img src={momentProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-white text-[10px] font-semibold">
                                {paper.moment_of_week_data.friend_name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-sans text-[11px] font-semibold" style={{ color: "#4A4035" }}>
                              {paper.moment_of_week_data.friend_name}
                            </div>
                            <p className="font-serif text-[12.5px] leading-relaxed m-0 mt-0.5" style={{ color: "#4A4035" }}>
                              {paper.moment_of_week_data.content_preview}
                            </p>
                            {paper.moment_of_week_data.reaction_count > 0 && (
                              <div className="font-sans text-[9px] mt-1" style={{ color: "#8C7E6E" }}>
                                {paper.moment_of_week_data.reaction_count} friend{paper.moment_of_week_data.reaction_count !== 1 ? "s" : ""} reacted
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    </div>
                  )}

                  {recSections?.reading && (
                    <div className="mb-5">
                      <SectionHeader label={recSections.reading.label} />
                      <RecList items={recSections.reading.items} />
                    </div>
                  )}

                  {recSections?.dining && (
                    <div className="mb-5">
                      <SectionHeader label={recSections.dining.label} />
                      <RecList items={recSections.dining.items} />
                    </div>
                  )}

                  {recSections?.gallery && (
                    <div className="mb-5">
                      <SectionHeader label={recSections.gallery.label} />
                      <RecList items={recSections.gallery.items} />
                    </div>
                  )}

                  {paper.top_poster_name && paper.top_poster_count && (
                    <div className="mb-5">
                      <SectionHeader label="village mvp" />
                      <p className="font-sans text-[12.5px] leading-relaxed m-0" style={{ color: "#4A4035" }}>
                        🏅 {paper.top_poster_name} shared {paper.top_poster_count} moment{paper.top_poster_count !== 1 ? "s" : ""} this month.
                      </p>
                    </div>
                  )}

                  <div className="mb-3">
                    <SectionHeader label="this month, try..." />
                    <p className="font-sans text-[12.5px] leading-relaxed italic m-0" style={{ color: "#4A4035" }}>
                      {paper.nudge}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: "0 24px 20px" }}>
              <div style={{ borderTop: "1px solid #D4C9B8", paddingTop: 12 }}>
                <div className="font-serif text-[12px] italic text-center" style={{ color: "#8C7E6E" }}>
                  see you next month.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** @deprecated Use VillageMonthlyCard */
export const SundayPaperCard = VillageMonthlyCard;
