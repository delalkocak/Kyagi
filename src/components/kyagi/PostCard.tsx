import React, { useState } from "react";
import { colors, PROMPTS, CATEGORY_DISPLAY } from "./data";
import { promptIcons, HeartIcon } from "./icons";
import { PhotoMedia, AudioMedia, VideoMediaPlayer } from "./MediaBlock";
import { useAddComment } from "@/hooks/use-posts";
import { useLikes, useToggleLike } from "@/hooks/use-likes";
import { LinkPreviewCard, type LinkPreviewData } from "./LinkPreviewCard";

// Dynamic slogans per prompt type
const PROMPT_SLOGANS: Record<string, string[]> = {
  grateful: [
    "host them for dinner this week",
    "write them a handwritten note",
    "send them flowers, just because",
    "tell them in person how much they mean",
  ],
  listening: [
    "make a shared playlist together",
    "go see live music this weekend",
    "have a listening party over FaceTime",
    "trade album recs over coffee",
  ],
  reading: [
    "start a two-person book club",
    "swap books at your next hangout",
    "read side by side at a café",
    "send them the quote that hit hardest",
  ],
  learned: [
    "organize a working session at a café",
    "sign up for a class together",
    "co-work at a hackathon this month",
    "teach each other something new over lunch",
  ],
  moment: [
    "facetime while you're both folding laundry",
    "take a walk together after work",
    "plan a spontaneous adventure this weekend",
    "sit on the porch and just talk",
  ],
  thinking: [
    "go for a long drive and talk it out",
    "have a late-night conversation about it",
    "journal about it, then share your entries",
    "debate it over a bottle of wine",
  ],
  recommend: [
    "plan to try it together this week",
    "host a tasting or watch party",
    "go explore that spot on Saturday",
    "send the link with a 'trust me' text",
  ],
  question: [
    "bring it up at your next dinner",
    "text the group chat and see what happens",
    "plan to go to yoga and talk about it after",
    "save it for your next long car ride",
  ],
};

function getSloganForPrompt(promptType: string): string {
  const slogans = PROMPT_SLOGANS[promptType] || PROMPT_SLOGANS.moment;
  const idx = (new Date().getHours() + promptType.length) % slogans.length;
  return slogans[idx];
}

const CHAR_LIMIT = 120;

interface FeedComment {
  id: string;
  text: string;
  itemIndex: number;
  userName: string;
  userAvatar: string;
  userColor: string;
}

interface PostCardProps {
  postId: string;
  index: number;
  name: string;
  avatar: string;
  color: string;
  date: string;
  time: string;
  promptType: string;
  content: string;
  media: { url: string; media_type: string }[];
  comments: FeedComment[];
  recommendationCategory?: string | null;
  linkUrl?: string | null;
  linkTitle?: string | null;
  linkDescription?: string | null;
  linkImageUrl?: string | null;
  linkSiteName?: string | null;
}

export function PostCard({ postId, index, name, avatar, color, date, time, promptType, content, media, comments, recommendationCategory, linkUrl, linkTitle, linkDescription, linkImageUrl, linkSiteName }: PostCardProps) {
  const [heartAnim, setHeartAnim] = useState(false);
  const [showReply, setShowReply] = useState(false);
  const [draft, setDraft] = useState("");
  const addComment = useAddComment();
  const { data: likesData } = useLikes([postId]);
  const toggleLike = useToggleLike();

  const knownPrompt = PROMPTS.find(p => p.id === promptType);
  const isCustom = !knownPrompt;
  const prompt = knownPrompt || { id: promptType, icon: "sparkle" as const, label: promptType, color: "#5A5A6A" };
  const slogan = getSloganForPrompt(knownPrompt ? promptType : "moment");

  const currentLike = likesData?.[postId];
  const hearted = currentLike?.likedByMe ?? false;
  const heartCount = currentLike?.count ?? 0;

  const toggleHeart = () => {
    toggleLike.mutate({ postId, liked: hearted });
    if (!hearted) { setHeartAnim(true); setTimeout(() => setHeartAnim(false), 400); }
  };

  const submitComment = () => {
    if (!draft.trim() || draft.length > CHAR_LIMIT) return;
    addComment.mutate({ postId, itemIndex: 0, text: draft });
    setDraft("");
    setShowReply(false);
  };

  return (
    <div 
      className="rounded-2xl p-5 pb-4 mb-3.5 border animate-fade-slide-in"
      style={{ background: colors.card, borderColor: colors.border, animationDelay: `${index * 0.08}s` }}>
      {/* Header */}
      <div className="flex items-center mb-4">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-sans text-sm font-semibold flex-shrink-0"
             style={{ background: color }}>
          {avatar}
        </div>
        <div className="ml-3 flex-1">
          <div className="font-sans text-sm font-semibold" style={{ color: colors.text }}>{name}</div>
          <div className="font-sans text-[11px] mt-0.5" style={{ color: colors.textMuted }}>{date} · {time}</div>
        </div>
      </div>

      {/* Prompt tag */}
      {isCustom && (
        <span className="inline-flex items-center gap-1 rounded-full py-0.5 px-2 mr-1.5 mb-1.5 font-sans text-[9px] font-semibold tracking-wide"
              style={{ background: `${prompt.color}12`, color: prompt.color }}>
          ✦ custom
        </span>
      )}
      <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
        <div className="inline-flex items-center gap-1.5 rounded-full py-0.5 pl-1.5 pr-2.5"
             style={{ background: `${prompt.color}12` }}>
          {promptIcons[prompt.icon]?.(prompt.color) || promptIcons.sparkle(prompt.color)}
          <span className="font-sans text-[10px] font-semibold tracking-wide" style={{ color: prompt.color }}>
            {prompt.label}
          </span>
        </div>
        {recommendationCategory && CATEGORY_DISPLAY[recommendationCategory] && (
          <div className="inline-flex items-center gap-1 rounded-full py-0.5 px-2"
               style={{ background: `${colors.electricIndigo}10` }}>
            <span className="text-[10px]">{CATEGORY_DISPLAY[recommendationCategory].emoji}</span>
            <span className="font-sans text-[11px]" style={{ color: colors.textMuted }}>
              {CATEGORY_DISPLAY[recommendationCategory].label}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <p className="font-serif text-sm leading-relaxed m-0" style={{ color: colors.text, fontSize: "14.5px" }}>
        {content}
      </p>

      {/* Media */}
      {media.length > 0 ? (
        media.map((m, i) =>
          m.media_type === "audio" ? (
            <AudioMedia key={i} url={m.url} />
          ) : m.media_type === "video" ? (
            <VideoMediaPlayer key={i} url={m.url} />
          ) : (
            <PhotoMedia key={i} url={m.url} />
          )
        )
      ) : linkUrl ? (
        <LinkPreviewCard
          data={{
            url: linkUrl,
            title: linkTitle || null,
            description: linkDescription || null,
            image_url: linkImageUrl || null,
            site_name: linkSiteName || null,
          }}
          isFeed
        />
      ) : null}

      {/* Comments */}
      {comments.length > 0 && (
        <div className="mt-2.5 pl-0.5">
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2 mt-1.5">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-white font-sans text-[9px] font-semibold flex-shrink-0 mt-0.5"
                   style={{ background: c.userColor }}>
                {c.userAvatar}
              </div>
              <div className="rounded-xl px-2.5 py-1.5 max-w-[80%]" style={{ background: colors.warmGray }}>
                <span className="font-sans text-[11px] font-semibold" style={{ color: colors.text }}>{c.userName}</span>
                <span className="font-sans text-[11px] ml-1.5" style={{ color: colors.text }}>{c.text}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reply */}
      {!showReply ? (
        <button onClick={() => setShowReply(true)} 
                className="mt-2 bg-transparent border-0 p-0 font-sans text-[11px] cursor-pointer opacity-60"
                style={{ color: colors.textMuted }}>
          reply...
        </button>
      ) : (
        <div className="mt-2 animate-fade-slide-in">
          <div className="flex items-center gap-1.5">
            <div className="flex-1 relative">
              <input 
                value={draft} 
                onChange={(e) => setDraft(e.target.value.slice(0, CHAR_LIMIT))} 
                placeholder="keep it brief..."
                onKeyDown={(e) => e.key === "Enter" && submitComment()} 
                autoFocus
                className="w-full py-2 px-3 pr-14 rounded-2xl border font-sans text-[11px] outline-none box-border"
                style={{ borderColor: colors.border, background: colors.warmGray, color: colors.text }}
              />
              <span className={`absolute right-3 top-1/2 -translate-y-1/2 font-sans text-[9px] ${draft.length > 100 ? "font-semibold" : "font-normal"}`}
                    style={{ color: draft.length > 100 ? colors.accent : colors.textMuted }}>
                {draft.length}/{CHAR_LIMIT}
              </span>
            </div>
            <button 
              onClick={submitComment} 
              disabled={!draft.trim()} 
              className="rounded-full w-7 h-7 flex-shrink-0 flex items-center justify-center border-0 cursor-pointer"
              style={{ background: draft.trim() ? colors.accent : colors.warmGray, color: draft.trim() ? "#fff" : colors.textMuted }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 10V2M2 6l4-4 4 4"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-3.5 pt-3 border-t flex items-center justify-between" style={{ borderColor: colors.border }}>
        <button onClick={toggleHeart} className="bg-transparent border-0 cursor-pointer flex items-center gap-1.5 py-1 transition-transform"
          style={{ transform: heartAnim ? "scale(1.2)" : "scale(1)" }}>
          <HeartIcon filled={hearted} size={18} />
          <span className={`font-sans text-xs transition-colors ${hearted ? "font-semibold" : "font-normal"}`}
                style={{ color: hearted ? colors.redOrange : colors.textMuted }}>
            {heartCount}
          </span>
        </button>
        <span className="font-sans text-[10px] opacity-60 italic" style={{ color: colors.textMuted }}>
          {slogan}
        </span>
      </div>
    </div>
  );
}
