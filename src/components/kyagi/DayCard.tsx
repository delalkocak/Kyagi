import React, { useState, useRef, useCallback, useEffect } from "react";
import { colors, PROMPTS, CATEGORY_DISPLAY } from "./data";
import { promptIcons, HeartIcon, XIcon } from "./icons";
import { PhotoMedia, AudioMedia } from "./MediaBlock";
import { useAddComment, useEditPost, useDeletePost, useEditComment, useDeleteComment } from "@/hooks/use-posts";
import { avatarColor } from "./FeedScreen";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AudioRecordButton } from "./AudioRecordButton";
import { MentionText } from "./MentionText";
import { useMyCircle } from "@/hooks/use-circle";
import { useLikes, useToggleLike } from "@/hooks/use-likes";
import { LinkPreviewCard } from "./LinkPreviewCard";

const CHAR_LIMIT = 120;
// No limit on posts per day
const EDIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function isSameLocalDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatPostDate(createdAt: string) {
  const d = new Date(createdAt);
  const now = new Date();
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  if (isSameLocalDay(d, now)) return { date: "today", time };

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameLocalDay(d, yesterday)) return { date: "yesterday", time };

  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.round(diffMs / 86400000);
  return { date: `${diffDays} days ago`, time };
}

function isEditable(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() < EDIT_WINDOW_MS;
}

function editTimeRemaining(createdAt: string) {
  const remaining = EDIT_WINDOW_MS - (Date.now() - new Date(createdAt).getTime());
  if (remaining <= 0) return null;
  const mins = Math.ceil(remaining / 60000);
  return mins >= 60 ? "< 1 hr left to edit" : `${mins} min left to edit`;
}

interface DayCardProps {
  posts: import("@/hooks/use-posts").DbPost[];
  isPinned?: boolean;
  index?: number;
  highlightPostId?: string | null;
  onHighlightDone?: () => void;
  onViewFriendProfile?: (userId: string) => void;
}

export function DayCard({ posts: allPosts, isPinned = false, index = 0, highlightPostId, onHighlightDone, onViewFriendProfile }: DayCardProps) {
  const posts = allPosts;
  const { user } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [heartAnim, setHeartAnim] = useState(false);
  const postIds = posts.map(p => p.id);
  const { data: likesData } = useLikes(postIds);
  const toggleLike = useToggleLike();
  const [showReply, setShowReply] = useState(false);
  const [showAvatar, setShowAvatar] = useState(false);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const addComment = useAddComment();
  const editComment = useEditComment();
  const deleteComment = useDeleteComment();
  const editPost = useEditPost();
  const deletePost = useDeletePost();
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [commentMenuId, setCommentMenuId] = useState<string | null>(null);
  const [confirmDeleteCommentId, setConfirmDeleteCommentId] = useState<string | null>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStartIdx, setMentionStartIdx] = useState(-1);
  const replyInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: circleData } = useMyCircle();
  const circleMembers = [...(circleData?.active || []), ...(circleData?.inactive || [])];
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isHighlighted = allPosts.some(p => p.id === highlightPostId);

  // Scroll into view and auto-open reply when navigated from notification
  useEffect(() => {
    if (isHighlighted && containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      setShowReply(true);
      // Clear highlight after animation
      const timer = setTimeout(() => onHighlightDone?.(), 3000);
      return () => clearTimeout(timer);
    }
  }, [isHighlighted]);

  const isOwnPost = posts[0]?.user_id === user?.id;

  const post = posts[currentSlide];
  const name = post.profile?.display_name || "anon";
  const color = avatarColor(post.user_id);
  const { date, time } = formatPostDate(post.created_at);
  const prompt = PROMPTS.find(p => p.id === post.prompt_type) || PROMPTS[0];
  const canEdit = isOwnPost;
  const editTimeLabel = null;

  const currentComments = post.comments.map(c => ({
    ...c,
    postId: post.id,
    userName: c.profile?.display_name || "anon",
    userAvatar: (c.profile?.display_name || "A").charAt(0).toUpperCase(),
    userColor: avatarColor(c.user_id),
  }));

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    const diffY = touchStartY.current - e.changedTouches[0].clientY;
    // Only swipe if horizontal movement exceeds vertical (not a scroll)
    if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
      if (diffX > 0 && currentSlide < posts.length - 1) setCurrentSlide(s => s + 1);
      if (diffX < 0 && currentSlide > 0) setCurrentSlide(s => s - 1);
    }
  }, [currentSlide, posts.length]);

  const currentLike = likesData?.[post.id];
  const hearted = currentLike?.likedByMe ?? false;
  const heartCount = currentLike?.count ?? 0;

  const toggleHeart = () => {
    toggleLike.mutate({ postId: post.id, liked: hearted });
    if (!hearted) { setHeartAnim(true); setTimeout(() => setHeartAnim(false), 400); }
  };

  const startEdit = () => {
    setEditText(post.content);
    setEditing(true);
    setShowMenu(false);
  };

  const saveEdit = async () => {
    if (!editText.trim()) return;
    try {
      await editPost.mutateAsync({ postId: post.id, content: editText.trim() });
      setEditing(false);
    } catch {}
  };

  const handleDelete = async () => {
    try {
      await deletePost.mutateAsync(post.id);
      setConfirmDelete(false);
      setShowMenu(false);
    } catch {}
  };

  const submitComment = async (audioUrl?: string) => {
    const text = audioUrl ? "🎤 voice note" : draft.trim();
    if (!text || (!audioUrl && draft.length > CHAR_LIMIT)) return;
    addComment.mutate({ postId: post.id, itemIndex: 0, text, audioUrl });
    setDraft("");
    setShowReply(false);
  };

  return (
    <div
      ref={containerRef}
      className={`rounded-2xl p-4 pb-3 mb-3 border animate-fade-slide-in transition-all duration-700 ${isHighlighted ? "ring-2" : ""}`}
      style={{
        background: isPinned ? `linear-gradient(135deg, ${colors.cobalt}12, ${colors.palePeriwinkle}30)` : colors.card,
        borderColor: isPinned ? colors.cobalt : colors.border,
        borderWidth: isPinned ? 1.5 : 1,
        animationDelay: `${index * 0.08}s`,
        ...(isHighlighted ? { ringColor: colors.accent, boxShadow: `0 0 0 2px ${colors.accent}` } : {}),
      }}
      onTouchStart={posts.length > 1 ? handleTouchStart : undefined}
      onTouchEnd={posts.length > 1 ? handleTouchEnd : undefined}
    >
      {/* Header */}
      <div className="flex items-center mb-2.5">
        {post.profile?.avatar_url ? (
          <img
            src={post.profile.avatar_url}
            alt={name}
            className="w-9 h-9 rounded-full object-cover flex-shrink-0 cursor-pointer"
            onClick={() => {
              if (!isOwnPost && onViewFriendProfile) {
                onViewFriendProfile(post.user_id);
              } else {
                setShowAvatar(true);
              }
            }}
          />
        ) : (
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-sans text-sm font-semibold flex-shrink-0 cursor-pointer"
            style={{ background: color }}
            onClick={() => {
              if (!isOwnPost && onViewFriendProfile) {
                onViewFriendProfile(post.user_id);
              }
            }}>
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="ml-3 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-sans text-sm font-semibold" style={{ color: colors.text }}>{name}</span>
            {isPinned && (
              <span className="font-sans text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ background: colors.periwinkle, color: "#fff" }}>
                you
              </span>
            )}
          </div>
          <div className="font-sans text-[11px] mt-0.5" style={{ color: colors.textMuted }}>{date} · {time}</div>
        </div>
        <div className="flex items-center gap-1.5">
          {posts.length > 1 && (
            <div className="font-sans text-[10px] font-semibold px-2 py-0.5 rounded-full"
                 style={{ background: colors.warmGray, color: colors.textMuted }}>
              {currentSlide + 1}/{posts.length}
            </div>
          )}
          {/* Edit menu for own posts */}
          {isOwnPost && (
            <div className="relative">
              <button
                onClick={() => { setShowMenu(!showMenu); setConfirmDelete(false); }}
                className="bg-transparent border-0 cursor-pointer p-1 flex items-center justify-center"
                style={{ color: colors.textMuted }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <circle cx="8" cy="3" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="8" cy="13" r="1.5"/>
                </svg>
              </button>
              {showMenu && (
                <div className="absolute right-0 top-7 z-20 rounded-xl border shadow-lg py-1 min-w-[130px] animate-fade-slide-in"
                     style={{ background: colors.card, borderColor: colors.border }}>
                  {canEdit && (
                    <button onClick={startEdit}
                      className="w-full text-left px-3 py-2 font-sans text-[11px] bg-transparent border-0 cursor-pointer flex items-center gap-2"
                      style={{ color: colors.text }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                      edit
                    </button>
                  )}
                  {!canEdit && isOwnPost && (
                    <div className="px-3 py-2 font-sans text-[10px]" style={{ color: colors.textMuted }}>
                      edit window expired
                    </div>
                  )}
                  {!confirmDelete ? (
                    <button onClick={() => setConfirmDelete(true)}
                      className="w-full text-left px-3 py-2 font-sans text-[11px] bg-transparent border-0 cursor-pointer flex items-center gap-2"
                      style={{ color: colors.accent }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                      delete
                    </button>
                  ) : (
                    <button onClick={handleDelete}
                      className="w-full text-left px-3 py-2 font-sans text-[11px] font-semibold bg-transparent border-0 cursor-pointer"
                      style={{ color: colors.accent }}>
                      {deletePost.isPending ? "deleting..." : "tap again to confirm"}
                    </button>
                  )}
                  <button onClick={() => setShowMenu(false)}
                    className="w-full text-left px-3 py-2 font-sans text-[11px] bg-transparent border-0 cursor-pointer"
                    style={{ color: colors.textMuted }}>
                    cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Prompt tag */}
      <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
        <div className="inline-flex items-center gap-1.5 rounded-full py-0.5 pl-1.5 pr-2.5"
             style={{ background: `${prompt.color}12` }}>
          {promptIcons[prompt.icon](prompt.color)}
          <span className="font-sans text-[10px] font-semibold tracking-wide" style={{ color: prompt.color }}>
            {prompt.label}
          </span>
        </div>
        {/* Recommendation category pill */}
        {(post as any).is_recommendation && (post as any).recommendation_category && CATEGORY_DISPLAY[(post as any).recommendation_category] && (
          <div className="inline-flex items-center gap-1 rounded-full py-[5px] px-3"
               style={{ background: "#FAF0E8" }}>
            <span className="text-[12px]">{CATEGORY_DISPLAY[(post as any).recommendation_category].emoji}</span>
            <span className="font-sans text-[12px] font-medium" style={{ color: "#8B5E3C" }}>
              {CATEGORY_DISPLAY[(post as any).recommendation_category].label}
            </span>
          </div>
        )}
      </div>

      {/* Content or Edit mode */}
      {editing ? (
        <div className="animate-fade-slide-in">
          <textarea
            value={editText}
            onChange={e => setEditText(e.target.value)}
            autoFocus
            className="w-full border rounded-xl p-3 font-serif text-[14.5px] leading-relaxed outline-none resize-none min-h-[60px] box-border"
            style={{ borderColor: colors.border, background: colors.warmGray, color: colors.text }}
          />
          {editTimeLabel && (
            <div className="font-sans text-[9px] mt-1 mb-1.5" style={{ color: colors.textMuted }}>
              {editTimeLabel}
            </div>
          )}
          <div className="flex gap-2 mt-1.5">
            <button onClick={() => setEditing(false)}
              className="flex-1 py-2 rounded-xl border font-sans text-[11px] cursor-pointer"
              style={{ background: "transparent", borderColor: colors.border, color: colors.textMuted }}>
              cancel
            </button>
            <button onClick={saveEdit}
              disabled={!editText.trim() || editPost.isPending}
              className="flex-1 py-2 rounded-xl border-0 font-sans text-[11px] font-semibold cursor-pointer"
              style={{ background: colors.accent, color: "#fff", opacity: editPost.isPending ? 0.7 : 1 }}>
              {editPost.isPending ? "saving..." : "save"}
            </button>
          </div>
        </div>
      ) : (
        <p className="font-serif text-sm leading-relaxed m-0" style={{ color: colors.text, fontSize: "14.5px" }}>
          <MentionText text={post.content} />
        </p>
      )}

      {/* Media or Link Preview */}
      {!editing && post.media.length > 0 ? (
        post.media.map((m, i) => (
          m.media_type === "audio" 
            ? <AudioMedia key={i} url={m.url} />
            : <PhotoMedia key={i} url={m.url} />
        ))
      ) : !editing && (post as any).link_url ? (
        <LinkPreviewCard
          data={{
            url: (post as any).link_url,
            title: (post as any).link_title || null,
            description: (post as any).link_description || null,
            image_url: (post as any).link_image_url || null,
            site_name: (post as any).link_site_name || null,
          }}
          isFeed
        />
      ) : null}

      {/* Dot indicators */}
      {posts.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {posts.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className="border-0 p-0 cursor-pointer rounded-full transition-all"
              style={{
                width: i === currentSlide ? 16 : 6,
                height: 6,
                background: i === currentSlide ? colors.accent : `${colors.textMuted}40`,
                borderRadius: 3,
              }}
            />
          ))}
        </div>
      )}

      {/* Comments */}
      {currentComments.length > 0 && (
        <div className="mt-2.5 pl-0.5">
          {currentComments.map(c => {
            const isOwnComment = c.user_id === user?.id;
            const isEditingThis = editingCommentId === c.id;
            const showingMenu = commentMenuId === c.id;

            return (
              <div key={c.id} className="flex items-start gap-2 mt-1.5 group">
                {c.profile?.avatar_url ? (
                  <img src={c.profile.avatar_url} alt={c.userName} className="w-5 h-5 rounded-full object-cover flex-shrink-0 mt-0.5" />
                ) : (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-white font-sans text-[9px] font-semibold flex-shrink-0 mt-0.5"
                       style={{ background: c.userColor }}>
                    {c.userAvatar}
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
                            if (e.key === "Enter") {
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
                        <span className="font-sans text-[11px] font-semibold" style={{ color: colors.text }}>{c.userName}</span>
                        {c.audio_url ? null : (
                          <MentionText text={c.text} className="font-sans text-[11px] ml-1.5" style={{ color: colors.text }} />
                        )}
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
                              {!c.audio_url && (
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
                              )}
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
                  {c.audio_url && !isEditingThis && (
                    <AudioMedia url={c.audio_url} />
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
        <div className="mt-2 animate-fade-slide-in relative">
          {/* Mention dropdown */}
          {showMentions && (() => {
            const filtered = circleMembers.filter(m =>
              m.display_name.toLowerCase().includes(mentionQuery.toLowerCase())
            ).slice(0, 5);
            if (filtered.length === 0) return null;
            return (
              <div className="absolute bottom-full left-0 right-0 mb-1 rounded-xl border overflow-hidden z-20 shadow-lg"
                   style={{ background: colors.card, borderColor: colors.border }}>
                {filtered.map(m => (
                  <button
                    key={m.user_id}
                    onClick={() => {
                      const before = draft.slice(0, mentionStartIdx);
                      const cursorPos = replyInputRef.current?.selectionStart || draft.length;
                      const after = draft.slice(cursorPos);
                      const newDraft = `${before}@${m.display_name} ${after}`.slice(0, CHAR_LIMIT);
                      setDraft(newDraft);
                      setShowMentions(false);
                      setMentionQuery("");
                      setTimeout(() => replyInputRef.current?.focus(), 0);
                    }}
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
            );
          })()}
          <div className="flex items-center gap-1.5">
            <div className="flex-1 relative">
              <input
                ref={replyInputRef}
                value={draft}
                onChange={e => {
                  const val = e.target.value.slice(0, CHAR_LIMIT);
                  setDraft(val);
                  
                  const cursorPos = e.target.selectionStart || 0;
                  const textBeforeCursor = val.slice(0, cursorPos);
                  const lastAtIdx = textBeforeCursor.lastIndexOf("@");
                  if (lastAtIdx >= 0 && (lastAtIdx === 0 || val[lastAtIdx - 1] === " ")) {
                    const query = textBeforeCursor.slice(lastAtIdx + 1);
                    if (!/\s/.test(query)) {
                      setShowMentions(true);
                      setMentionQuery(query);
                      setMentionStartIdx(lastAtIdx);
                      return;
                    }
                  }
                  setShowMentions(false);
                }}
                placeholder="keep it kind..."
                onKeyDown={e => {
                  if (e.key === "Enter" && !showMentions) submitComment();
                  if (e.key === "Escape") setShowMentions(false);
                }}
                autoFocus
                className="w-full py-2 px-3 pr-14 rounded-2xl border font-sans text-[11px] outline-none box-border"
                style={{ borderColor: colors.border, background: colors.warmGray, color: colors.text }}
              />
              <span className={`absolute right-3 top-1/2 -translate-y-1/2 font-sans text-[9px] ${draft.length > 100 ? "font-semibold" : "font-normal"}`}
                    style={{ color: draft.length > 100 ? colors.accent : colors.textMuted }}>
                {draft.length}/{CHAR_LIMIT}
              </span>
            </div>
            <AudioRecordButton
              onRecorded={async (blob) => {
                const file = new File([blob], `comment-${Date.now()}.webm`, { type: "audio/webm" });
                const path = `${user?.id}/comments/${Date.now()}.webm`;
                const { error: uploadError } = await supabase.storage.from("media").upload(path, file);
                if (uploadError) return;
                const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(path);
                submitComment(publicUrl);
              }}
            />
            <button
              onClick={() => submitComment()}
              disabled={!draft.trim()}
              className="rounded-full w-7 h-7 flex-shrink-0 flex items-center justify-center border-0 cursor-pointer"
              style={{ background: draft.trim() ? colors.accent : colors.warmGray, color: draft.trim() ? "#fff" : colors.textMuted }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 10V2M2 6l4-4 4 4" />
              </svg>
            </button>
          </div>
        </div>
      )}


      {/* Footer */}
      <div className="mt-2 pt-2 border-t flex items-center" style={{ borderColor: colors.border }}>
        <button onClick={toggleHeart} className="bg-transparent border-0 cursor-pointer flex items-center gap-1.5 py-0.5 transition-transform"
          style={{ transform: heartAnim ? "scale(1.2)" : "scale(1)" }}>
          <HeartIcon filled={hearted} size={16} />
          <span className="font-sans text-xs" style={{ color: hearted ? colors.redOrange : colors.textMuted }}>
            {heartCount}
          </span>
        </button>
      </div>

      {/* Avatar lightbox */}
      {showAvatar && post.profile?.avatar_url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-slide-in"
          onClick={() => setShowAvatar(false)}
        >
          <div className="relative" onClick={e => e.stopPropagation()}>
            <img
              src={post.profile.avatar_url}
              alt={name}
              className="w-56 h-56 rounded-full object-cover shadow-2xl border-4"
              style={{ borderColor: colors.card }}
            />
            <div className="text-center mt-3 font-sans text-sm font-semibold" style={{ color: "#fff" }}>
              {name}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
