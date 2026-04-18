import React, { useState } from "react";
import { colors, PROMPTS } from "./data";
import { promptIcons, HeartIcon } from "./icons";
import { PhotoMedia, AudioMedia } from "./MediaBlock";
import { MentionText } from "./MentionText";
import { useAddComment, useEditComment, useDeleteComment } from "@/hooks/use-posts";
import { useLikes, useToggleLike } from "@/hooks/use-likes";
import { useAuth } from "@/contexts/AuthContext";
import { avatarColor } from "./FeedScreen";
import type { ArchivePost, ArchiveComment } from "@/hooks/use-archive";

const CHAR_LIMIT = 120;

interface ArchivePostCardProps {
  post: ArchivePost;
}

export function ArchivePostCard({ post }: ArchivePostCardProps) {
  const { user } = useAuth();
  const [heartAnim, setHeartAnim] = useState(false);
  const [showReply, setShowReply] = useState(false);
  const [draft, setDraft] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [commentMenuId, setCommentMenuId] = useState<string | null>(null);
  const [confirmDeleteCommentId, setConfirmDeleteCommentId] = useState<string | null>(null);

  const addComment = useAddComment();
  const editComment = useEditComment();
  const deleteComment = useDeleteComment();
  const { data: likesData } = useLikes([post.id]);
  const toggleLike = useToggleLike();

  const prompt = PROMPTS.find(p => p.id === post.prompt_type) || PROMPTS[0];

  const currentLike = likesData?.[post.id];
  const hearted = currentLike?.likedByMe ?? false;
  const heartCount = currentLike?.count ?? 0;

  const toggleHeart = () => {
    toggleLike.mutate({ postId: post.id, liked: hearted });
    if (!hearted) { setHeartAnim(true); setTimeout(() => setHeartAnim(false), 400); }
  };

  const submitComment = () => {
    if (!draft.trim() || draft.length > CHAR_LIMIT) return;
    addComment.mutate({ postId: post.id, itemIndex: 0, text: draft });
    setDraft("");
    setShowReply(false);
  };

  const displayNameFor = (c: ArchiveComment) =>
    c.profile?.nickname || c.profile?.display_name || "friend";

  const avatarLetterFor = (c: ArchiveComment) =>
    (displayNameFor(c).charAt(0) || "?").toUpperCase();

  return (
    <div>
      {/* Prompt tag */}
      <div className="inline-flex items-center gap-1 rounded-2xl py-0.5 pl-1.5 pr-2 mb-1"
           style={{ background: `${prompt.color}12` }}>
        {promptIcons[prompt.icon](prompt.color)}
        <span className="font-sans text-[9px] font-semibold" style={{ color: prompt.color }}>{prompt.label}</span>
      </div>

      {/* Content */}
      <p className="font-serif text-[13px] leading-relaxed m-0" style={{ color: colors.text }}>
        <MentionText text={post.content} />
      </p>

      {/* Media */}
      {post.media.map((m, k) =>
        m.media_type === "audio" ? (
          <AudioMedia key={k} url={m.url} />
        ) : (
          <PhotoMedia key={k} url={m.url} />
        )
      )}

      {/* Comments */}
      {post.comments.length > 0 && (
        <div className="mt-2.5 pl-0.5">
          {post.comments.map((c) => {
            const isOwnComment = c.user_id === user?.id;
            const isEditingThis = editingCommentId === c.id;
            const showingMenu = commentMenuId === c.id;
            const name = displayNameFor(c);
            const avatar = avatarLetterFor(c);
            const color = avatarColor(c.user_id);

            return (
              <div key={c.id} className="flex items-start gap-2 mt-1.5 group">
                {c.profile?.avatar_url ? (
                  <img src={c.profile.avatar_url} alt={name} className="w-5 h-5 rounded-full object-cover flex-shrink-0 mt-0.5" />
                ) : (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-white font-sans text-[9px] font-semibold flex-shrink-0 mt-0.5"
                       style={{ background: color }}>
                    {avatar}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {isEditingThis ? (
                    <div className="animate-fade-slide-in">
                      <div className="relative">
                        <input
                          value={editCommentText}
                          onChange={e => setEditCommentText(e.target.value.slice(0, CHAR_LIMIT))}
                          onKeyDown={e => {
                            if (e.key === "Enter" && editCommentText.trim()) {
                              editComment.mutate({ commentId: c.id, text: editCommentText.trim() });
                              setEditingCommentId(null);
                            }
                            if (e.key === "Escape") setEditingCommentId(null);
                          }}
                          autoFocus
                          className="w-full py-1.5 px-2.5 pr-12 rounded-xl border font-sans text-[11px] outline-none box-border"
                          style={{ borderColor: colors.border, background: colors.warmGray, color: colors.text }}
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 font-sans text-[9px]"
                              style={{ color: colors.textMuted }}>
                          {editCommentText.length}/{CHAR_LIMIT}
                        </span>
                      </div>
                      <div className="flex gap-1.5 mt-1">
                        <button onClick={() => setEditingCommentId(null)}
                          className="font-sans text-[10px] bg-transparent border-0 cursor-pointer px-1"
                          style={{ color: colors.textMuted }}>
                          cancel
                        </button>
                        <button
                          onClick={() => {
                            if (editCommentText.trim()) {
                              editComment.mutate({ commentId: c.id, text: editCommentText.trim() });
                              setEditingCommentId(null);
                            }
                          }}
                          disabled={!editCommentText.trim() || editComment.isPending}
                          className="font-sans text-[10px] font-semibold bg-transparent border-0 cursor-pointer px-1"
                          style={{ color: colors.accent }}>
                          {editComment.isPending ? "..." : "save"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-1">
                      <div className="rounded-xl px-2.5 py-1.5 max-w-[80%]" style={{ background: colors.warmGray }}>
                        <span className="font-sans text-[11px] font-semibold" style={{ color: colors.text }}>{name}</span>
                        <MentionText text={c.text} className="font-sans text-[11px] ml-1.5" style={{ color: colors.text }} />
                      </div>
                      {isOwnComment && (
                        <div className="relative flex-shrink-0">
                          <button
                            onClick={() => { setCommentMenuId(showingMenu ? null : c.id); setConfirmDeleteCommentId(null); }}
                            className="bg-transparent border-0 cursor-pointer p-0.5 opacity-40 transition-opacity"
                            style={{ color: colors.textMuted }}>
                            <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                              <circle cx="3" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="13" cy="8" r="1.5"/>
                            </svg>
                          </button>
                          {showingMenu && (
                            <div className="absolute right-0 top-5 z-20 rounded-lg border shadow-lg py-1 min-w-[90px] animate-fade-slide-in"
                                 style={{ background: colors.card, borderColor: colors.border }}>
                              <button
                                onClick={() => {
                                  setEditCommentText(c.text);
                                  setEditingCommentId(c.id);
                                  setCommentMenuId(null);
                                }}
                                className="w-full text-left px-2.5 py-1.5 font-sans text-[10px] bg-transparent border-0 cursor-pointer"
                                style={{ color: colors.text }}>
                                edit
                              </button>
                              {confirmDeleteCommentId !== c.id ? (
                                <button
                                  onClick={() => setConfirmDeleteCommentId(c.id)}
                                  className="w-full text-left px-2.5 py-1.5 font-sans text-[10px] bg-transparent border-0 cursor-pointer"
                                  style={{ color: colors.accent }}>
                                  delete
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    deleteComment.mutate(c.id);
                                    setCommentMenuId(null);
                                    setConfirmDeleteCommentId(null);
                                  }}
                                  className="w-full text-left px-2.5 py-1.5 font-sans text-[10px] font-semibold bg-transparent border-0 cursor-pointer"
                                  style={{ color: colors.accent }}>
                                  {deleteComment.isPending ? "..." : "confirm?"}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
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
      <div className="mt-3 pt-2.5 border-t flex items-center" style={{ borderColor: colors.border }}>
        <button onClick={toggleHeart} className="bg-transparent border-0 cursor-pointer flex items-center gap-1.5 py-1 transition-transform"
          style={{ transform: heartAnim ? "scale(1.2)" : "scale(1)" }}>
          <HeartIcon filled={hearted} size={18} />
          <span className={`font-sans text-xs transition-colors ${hearted ? "font-semibold" : "font-normal"}`}
                style={{ color: hearted ? colors.redOrange : colors.textMuted }}>
            {heartCount}
          </span>
        </button>
      </div>
    </div>
  );
}
