import React from "react";
import { colors } from "./data";
import { avatarColor } from "./FeedScreen";
import {
  MonthlyEdition,
  MonthlyRecPost,
  useMonthlyRecPosts,
  buildRecSections,
  getLeadStory,
  formatEditionMonth,
} from "@/hooks/use-village-monthly";
import { promptIcons } from "./icons";

interface VillageMonthlyViewProps {
  edition: MonthlyEdition;
  onBack: () => void;
}

export function VillageMonthlyView({ edition, onBack }: VillageMonthlyViewProps) {
  const { data: recPosts = [], isLoading } = useMonthlyRecPosts(edition.edition_month);
  const leadStory = getLeadStory(recPosts);
  // Exclude lead story from category sections to avoid duplication
  const remainingPosts = leadStory ? recPosts.filter(p => p.id !== leadStory.id) : recPosts;
  const sections = buildRecSections(remainingPosts);
  const monthLabel = formatEditionMonth(edition.edition_month);

  return (
    <div className="animate-fade-slide-in">
      {/* Back button */}
      <button
        onClick={onBack}
        className="bg-transparent border-0 cursor-pointer font-sans text-xs mb-3 p-0"
        style={{ color: colors.accent }}
      >
        ← back to my village
      </button>

      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "#FAF6EF", border: "0.5px solid #E8E0D0" }}
      >
        {/* Masthead */}
        <div style={{ padding: "20px 24px 0" }}>
          <div style={{ borderTop: "2px solid #8B2332", marginBottom: 14 }} />
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
          <div
            className="text-center font-sans uppercase mt-2"
            style={{ fontSize: 11, letterSpacing: "1.5px", color: "#8C7E6E" }}
          >
            {monthLabel}
          </div>
          <div style={{ borderTop: "2px solid #8B2332", marginTop: 14 }} />
          {!isLoading && recPosts.length > 0 && (
            <div
              className="text-center font-sans mt-3"
              style={{ fontSize: 11, color: "#8C7E6E", letterSpacing: "0.5px" }}
            >
              {recPosts.length} recommendation{recPosts.length !== 1 ? "s" : ""} from your village
            </div>
          )}
          <div style={{ borderTop: "1px solid #C4B8A4", marginTop: 16, marginBottom: 20 }} />
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <div
              className="w-5 h-5 rounded-full border-2 animate-spin-loader mx-auto mb-3"
              style={{ borderColor: colors.border, borderTopColor: colors.accent }}
            />
          </div>
        ) : recPosts.length === 0 ? (
          <div style={{ padding: "0 24px 24px" }}>
            <p
              className="font-serif text-[13px] leading-relaxed italic text-center m-0"
              style={{ color: "#8C7E6E" }}
            >
              a quiet month in the village. sometimes those are the best ones.
            </p>
          </div>
        ) : (
          <div style={{ padding: "0 24px" }}>
            {/* Lead Story */}
            {leadStory && (
              <div className="mb-6">
                <div className="mb-3">
                  <div
                    className="font-serif text-[10px] uppercase tracking-[2px] font-medium"
                    style={{ color: "#8B2332", marginBottom: 6 }}
                  >
                    lead story
                  </div>
                  <div style={{ borderTop: "1px solid #D4C9B8" }} />
                </div>

                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                    style={{ background: avatarColor(leadStory.user_id) }}
                  >
                    {leadStory.avatar_url ? (
                      <img
                        src={leadStory.avatar_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-[12px] font-semibold">
                        {leadStory.display_name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className="font-sans text-[12px] font-semibold"
                      style={{ color: "#4A4035" }}
                    >
                      {leadStory.display_name}
                    </div>
                    <p
                      className="font-serif text-[15px] leading-relaxed m-0 mt-1"
                      style={{ color: "#2C2420" }}
                    >
                      {leadStory.content}
                    </p>
                    {leadStory.like_count > 0 && (
                      <div
                        className="font-sans text-[9px] mt-1.5"
                        style={{ color: "#8C7E6E" }}
                      >
                        {leadStory.like_count} friend
                        {leadStory.like_count !== 1 ? "s" : ""} reacted
                      </div>
                    )}
                  </div>
                </div>

                {leadStory.media_url && (
                  <div className="mt-3 rounded-xl overflow-hidden">
                    <img
                      src={leadStory.media_url}
                      alt=""
                      className="w-full object-cover rounded-xl"
                      style={{ maxHeight: 200 }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Category Sections */}
            {sections.map((section) => (
              <div key={section.category} className="mb-5">
                <div className="mb-3">
                  <div
                    className="font-serif text-[10px] uppercase tracking-[2px] font-medium"
                    style={{ color: "#8B2332", marginBottom: 6 }}
                  >
                    {section.header}
                  </div>
                  <div style={{ borderTop: "1px solid #D4C9B8" }} />
                </div>

                <div className="flex flex-col gap-3">
                  {section.items.map((item) => (
                    <div key={item.id} className="flex items-start gap-2.5">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden mt-0.5"
                        style={{ background: avatarColor(item.user_id) }}
                      >
                        {item.avatar_url ? (
                          <img
                            src={item.avatar_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-white text-[9px] font-semibold">
                            {item.display_name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div
                          className="font-sans text-[11px] font-semibold"
                          style={{ color: "#4A4035" }}
                        >
                          {item.display_name}
                        </div>
                        <p
                          className="font-sans text-[12px] leading-relaxed m-0 mt-0.5 line-clamp-2"
                          style={{ color: "#4A4035" }}
                        >
                          {item.content}
                        </p>
                      </div>
                      {item.media_url && (
                        <div
                          className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0"
                          style={{ background: "#E8E0D0" }}
                        >
                          <img
                            src={item.media_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: "0 24px 20px" }}>
          <div
            style={{ borderTop: "1px solid #D4C9B8", paddingTop: 12 }}
          >
            <div
              className="font-serif text-[12px] italic text-center"
              style={{ color: "#8C7E6E" }}
            >
              see you next month.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
