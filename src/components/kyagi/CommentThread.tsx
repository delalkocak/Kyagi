import React, { useState, useRef, useEffect } from "react";
import { colors, Comment } from "./data";
import { useMyCircle } from "@/hooks/use-circle";
import { avatarColor } from "./FeedScreen";
import { MentionText } from "./MentionText";

interface CommentThreadProps {
  comments: Comment[];
  postId: number;
  itemIndex: number;
  onAddComment: (postId: number, itemIndex: number, text: string) => void;
}

interface CircleMember {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
}

export function CommentThread({ comments, postId, itemIndex, onAddComment }: CommentThreadProps) {
  const [showInput, setShowInput] = useState(false);
  const [draft, setDraft] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStartIdx, setMentionStartIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: circleData } = useMyCircle();
  const members: CircleMember[] = [...(circleData?.active || []), ...(circleData?.inactive || [])];

  const relevant = comments.filter(c => c.itemIndex === itemIndex);
  const charLimit = 120;

  const filteredMembers = members.filter(m =>
    m.display_name.toLowerCase().includes(mentionQuery.toLowerCase())
  ).slice(0, 5);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.slice(0, charLimit);
    setDraft(val);

    const cursorPos = e.target.selectionStart || 0;
    // Find the last @ before cursor
    const textBeforeCursor = val.slice(0, cursorPos);
    const lastAtIdx = textBeforeCursor.lastIndexOf("@");

    if (lastAtIdx >= 0) {
      const textAfterAt = textBeforeCursor.slice(lastAtIdx + 1);
      // Only show if no space before @ (or @ is at start) and no completed mention
      if ((lastAtIdx === 0 || val[lastAtIdx - 1] === " ") && !/\s/.test(textAfterAt.slice(-1)) || textAfterAt === "") {
        setShowMentions(true);
        setMentionQuery(textAfterAt);
        setMentionStartIdx(lastAtIdx);
        return;
      }
    }
    setShowMentions(false);
  };

  const selectMention = (member: CircleMember) => {
    const before = draft.slice(0, mentionStartIdx);
    const after = draft.slice((inputRef.current?.selectionStart || draft.length));
    const newDraft = `${before}@${member.display_name} ${after}`.slice(0, charLimit);
    setDraft(newDraft);
    setShowMentions(false);
    setMentionQuery("");
    // Refocus input
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const submit = () => {
    if (draft.trim() && draft.length <= charLimit) {
      onAddComment(postId, itemIndex, draft);
      setDraft("");
      setShowInput(false);
      setShowMentions(false);
    }
  };

  return (
    <div>
      {relevant.length > 0 && (
        <div className="mt-2.5 pl-0.5">
          {relevant.map((c, i) => (
            <div key={i} className={`flex items-start gap-2 ${i > 0 ? "mt-1.5" : ""} ${c.isReply ? "ml-7" : ""}`}>
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-white font-sans text-[9px] font-semibold flex-shrink-0 mt-0.5"
                   style={{ background: c.color }}>
                {c.avatar}
              </div>
              <div className="rounded-xl px-2.5 py-1.5 max-w-[80%]"
                   style={{ background: c.isReply ? colors.palePeriwinkle : colors.warmGray }}>
                <span className="font-sans text-[11px] font-semibold" style={{ color: colors.text }}>{c.from}</span>
                <MentionText text={c.text} className="font-sans text-[11px] ml-1.5" style={{ color: colors.text }} />
              </div>
            </div>
          ))}
        </div>
      )}
      {!showInput ? (
        <button onClick={() => setShowInput(true)} 
                className="mt-2 bg-transparent border-0 p-0 font-sans text-[11px] cursor-pointer opacity-60"
                style={{ color: colors.textMuted }}>
          reply...
        </button>
      ) : (
        <div className="mt-2 relative">
          {/* Mention dropdown */}
          {showMentions && filteredMembers.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 mb-1 rounded-xl border overflow-hidden z-20 shadow-lg"
                 style={{ background: colors.card, borderColor: colors.border }}>
              {filteredMembers.map(m => (
                <button
                  key={m.user_id}
                  onClick={() => selectMention(m)}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 border-0 cursor-pointer transition-colors hover:opacity-80"
                  style={{ background: "transparent" }}
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white font-sans text-[8px] font-semibold flex-shrink-0 overflow-hidden"
                    style={{ background: avatarColor(m.user_id) }}
                  >
                    {m.avatar_url ? (
                      <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      m.display_name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="font-sans text-[12px] font-medium" style={{ color: colors.text }}>
                    {m.display_name}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1.5 animate-fade-slide-in">
            <div className="flex-1 relative">
              <input 
                ref={inputRef}
                value={draft} 
                onChange={handleInputChange} 
                placeholder="keep it brief, or grab coffee instead..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !showMentions) submit();
                  if (e.key === "Escape") setShowMentions(false);
                }} 
                autoFocus
                className="w-full py-2 px-3 pr-12 rounded-2xl border font-sans text-[11px] outline-none box-border"
                style={{ borderColor: colors.border, background: colors.warmGray, color: colors.text }}
              />
              <span className={`absolute right-3 top-1/2 -translate-y-1/2 font-sans text-[9px] ${draft.length > 100 ? "font-semibold" : "font-normal"}`}
                    style={{ color: draft.length > 100 ? colors.accent : colors.textMuted }}>
                {draft.length}/{charLimit}
              </span>
            </div>
            <button 
              onClick={submit} 
              disabled={!draft.trim()} 
              className="rounded-full w-7 h-7 flex-shrink-0 transition-all flex items-center justify-center border-0 cursor-pointer"
              style={{ 
                background: draft.trim() ? colors.accent : colors.warmGray, 
                color: draft.trim() ? "#fff" : colors.textMuted,
                cursor: draft.trim() ? "pointer" : "default"
              }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 10V2M2 6l4-4 4 4"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
