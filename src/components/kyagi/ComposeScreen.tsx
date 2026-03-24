import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Camera, Video, Mic, Check } from "lucide-react";
import { colors, PROMPTS, Prompt, RECOMMENDATION_CATEGORIES, RecommendationCategory } from "./data";
import { promptIcons, PlusIcon, CameraIcon, XIcon } from "./icons";
import { useCreatePost, useFeedPosts } from "@/hooks/use-posts";
import { getDailyPrompts } from "./dailyPrompts";
import { AudioRecordButton } from "./AudioRecordButton";
import { useMyCircle } from "@/hooks/use-circle";
import { avatarColor } from "./FeedScreen";
import { useAuth } from "@/contexts/AuthContext";
import { useLinkPreview, removeUrlFromText } from "@/hooks/use-link-preview";
import { LinkPreviewCard, LinkPreviewSkeleton, type LinkPreviewData } from "./LinkPreviewCard";

const MAX_FILE_SIZE = 200 * 1024 * 1024;
const MAX_DIMENSION = 1080;

interface Entry {
  prompt: Prompt | null;
  text: string;
  mediaFile: File | null;
  mediaPreview: string | null;
  mediaType: string | null;
  isRecommendation: boolean;
  recommendationCategory: RecommendationCategory | null;
  linkPreview: LinkPreviewData | null;
}

const EMPTY_ENTRY: Entry = { prompt: null, text: "", mediaFile: null, mediaPreview: null, mediaType: null, isRecommendation: false, recommendationCategory: null, linkPreview: null };

async function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const { width, height } = img;
      let newW = width; let newH = height;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) { newW = MAX_DIMENSION; newH = Math.round(height * (MAX_DIMENSION / width)); }
        else { newH = MAX_DIMENSION; newW = Math.round(width * (MAX_DIMENSION / height)); }
      }
      const canvas = document.createElement("canvas");
      canvas.width = newW; canvas.height = newH;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, newW, newH);
      canvas.toBlob(
        (blob) => resolve(blob ? new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }) : file),
        "image/jpeg", 0.85
      );
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
}

// Mention autocomplete component
function MentionTextarea({
  value,
  onChange,
  onFocus,
  friends,
}: {
  value: string;
  onChange: (text: string) => void;
  onFocus: () => void;
  friends: { user_id: string; display_name: string; avatar_url: string | null }[];
}) {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [cursorPos, setCursorPos] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const filteredFriends = useMemo(() => {
    if (!mentionQuery) return friends;
    const q = mentionQuery.toLowerCase();
    return friends.filter(f => f.display_name.toLowerCase().includes(q));
  }, [friends, mentionQuery]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const cursor = e.target.selectionStart || 0;
    setCursorPos(cursor);
    onChange(text);

    const textBeforeCursor = text.slice(0, cursor);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);
    if (atMatch) {
      setShowMentions(true);
      setMentionQuery(atMatch[1]);
    } else {
      setShowMentions(false);
      setMentionQuery("");
    }
  };

  const insertMention = (friend: { display_name: string }) => {
    const textBeforeCursor = value.slice(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf("@");
    const before = value.slice(0, atIndex);
    const after = value.slice(cursorPos);
    const newText = `${before}@${friend.display_name} ${after}`;
    onChange(newText);
    setShowMentions(false);
    setMentionQuery("");
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onFocus={onFocus}
        placeholder="write something... use @ to tag friends"
        className="w-full border-0 outline-none resize-none font-serif text-[15px] leading-relaxed bg-transparent min-h-[48px] box-border"
        style={{ color: colors.text }}
      />
      {showMentions && filteredFriends.length > 0 && (
        <div className="absolute left-0 right-0 bottom-full mb-1 rounded-xl border shadow-lg z-20 max-h-[140px] overflow-y-auto"
             style={{ background: colors.card, borderColor: colors.border }}>
          {filteredFriends.map(f => (
            <button
              key={f.user_id}
              onClick={() => insertMention(f)}
              className="w-full flex items-center gap-2.5 px-3 py-2 border-0 bg-transparent cursor-pointer text-left"
              style={{ borderBottom: `1px solid ${colors.border}` }}
            >
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white font-sans text-[10px] font-semibold flex-shrink-0 overflow-hidden"
                   style={{ background: avatarColor(f.user_id) }}>
                {f.avatar_url ? (
                  <img src={f.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  f.display_name.charAt(0).toUpperCase()
                )}
              </div>
              <span className="font-sans text-[12px] font-semibold" style={{ color: colors.text }}>
                {f.display_name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface ComposeScreenProps { onPosted?: () => void; }

export function ComposeScreen({ onPosted }: ComposeScreenProps) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([{ ...EMPTY_ENTRY }, { ...EMPTY_ENTRY }, { ...EMPTY_ENTRY }]);
  const [showPrompts, setShowPrompts] = useState(-1);
  const [showAllPrompts, setShowAllPrompts] = useState(-1); // which entry is showing full list
  const [activeEntry, setActiveEntry] = useState(0);
  const [showMediaMenu, setShowMediaMenu] = useState(-1);
  const [posted, setPosted] = useState(false);
  const [postError, setPostError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [cameraTarget, setCameraTarget] = useState(0);
  const [customPromptIndex, setCustomPromptIndex] = useState(-1);
  const [customPromptText, setCustomPromptText] = useState("");
  const [recCategoryIndex, setRecCategoryIndex] = useState(-1);
  const [preMedia, setPreMedia] = useState<{ file: File; type: string; preview: string } | null>(null);
  const [recordingVoiceTop, setRecordingVoiceTop] = useState(false);
  const topPhotoRef = useRef<HTMLInputElement>(null);
  const topVideoRef = useRef<HTMLInputElement>(null);
  const createPost = useCreatePost();
  const { data: circleData } = useMyCircle();
  const friends = [...(circleData?.active || []), ...(circleData?.inactive || [])];
  const { data: feedPosts } = useFeedPosts();
  const { linkData: activeLinkData, loading: linkLoading, detectAndFetch, clearLink, resetCache } = useLinkPreview();
  // Track which entry index has the active link preview
  const [linkEntryIndex, setLinkEntryIndex] = useState<number>(-1);

  const hasPostedToday = useMemo(() => {
    if (!user || !feedPosts) return false;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return feedPosts.some(p => p.user_id === user.id && new Date(p.created_at) >= todayStart);
  }, [user, feedPosts]);

  // Apply pre-attached media to entry
  const applyPreMedia = (u: Entry[], i: number) => {
    if (preMedia) {
      u[i] = { ...u[i], mediaFile: preMedia.file, mediaType: preMedia.type, mediaPreview: preMedia.preview };
      setPreMedia(null);
    }
  };

  const selectPrompt = (i: number, p: Prompt) => {
    if (p.id === "recommend") {
      setRecCategoryIndex(i);
      return;
    }
    if (p.id === "custom") {
      setCustomPromptIndex(i);
      setCustomPromptText("");
      return;
    }
    const u = [...entries]; u[i] = { ...u[i], prompt: p }; applyPreMedia(u, i); setEntries(u); setShowPrompts(-1);
  };

  const selectRecCategory = (i: number, cat: typeof RECOMMENDATION_CATEGORIES[number]) => {
    const recPrompt: Prompt = { id: "recommend", icon: "arrow", label: "here's a rec...", color: "#D93D12" };
    const u = [...entries];
    u[i] = { ...u[i], prompt: recPrompt, isRecommendation: true, recommendationCategory: cat.key as RecommendationCategory };
    applyPreMedia(u, i);
    setEntries(u);
    setRecCategoryIndex(-1);
    setShowPrompts(-1);
  };

  const confirmCustomPrompt = (i: number) => {
    if (!customPromptText.trim()) return;
    const customP: Prompt = { id: "custom", icon: "sparkle", label: customPromptText.trim(), color: "#5A5A6A" };
    const u = [...entries]; u[i] = { ...u[i], prompt: customP }; applyPreMedia(u, i); setEntries(u);
    setShowPrompts(-1);
    setCustomPromptIndex(-1);
    setCustomPromptText("");
  };

  // Top-level media handlers (pre-attach to first empty slot or store as preMedia)
  const onTopMediaFile = async (e: React.ChangeEvent<HTMLInputElement>, mediaType: "photo" | "video") => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (file.size > MAX_FILE_SIZE) { setPostError("file too large (max 200mb)"); return; }
    let processedFile = file;
    if (mediaType === "photo" && file.type.startsWith("image/")) processedFile = await compressImage(file);
    const preview = URL.createObjectURL(processedFile);
    const type = mediaType === "video" ? "video" : "photo";

    // Find first empty entry and attach, or store as preMedia
    const emptyIdx = entries.findIndex(ent => !ent.mediaFile);
    if (emptyIdx >= 0 && entries[emptyIdx].prompt) {
      const u = [...entries];
      u[emptyIdx] = { ...u[emptyIdx], mediaFile: processedFile, mediaType: type, mediaPreview: preview };
      setEntries(u);
    } else {
      setPreMedia({ file: processedFile, type, preview });
    }
    setPostError("");
  };

  const onTopAudioRecorded = (blob: Blob) => {
    const file = new File([blob], `audio-${Date.now()}.webm`, { type: "audio/webm" });
    const emptyIdx = entries.findIndex(ent => !ent.mediaFile);
    if (emptyIdx >= 0 && entries[emptyIdx].prompt) {
      const u = [...entries];
      u[emptyIdx] = { ...u[emptyIdx], mediaFile: file, mediaType: "audio", mediaPreview: "audio" };
      setEntries(u);
    } else {
      setPreMedia({ file, type: "audio", preview: "audio" });
    }
    setRecordingVoiceTop(false);
    setPostError("");
  };
  const updateText = (i: number, t: string) => {
    const u = [...entries]; u[i] = { ...u[i], text: t }; setEntries(u);
    const hasMedia = !!(u[i].mediaFile);
    detectAndFetch(t, hasMedia);
    if (!hasMedia) setLinkEntryIndex(i);
  };
  
  // When link data arrives, strip URL from text and store on entry
  useEffect(() => {
    if (activeLinkData && linkEntryIndex >= 0 && !entries[linkEntryIndex]?.mediaFile) {
      const u = [...entries];
      const cleanText = removeUrlFromText(u[linkEntryIndex].text);
      u[linkEntryIndex] = { ...u[linkEntryIndex], text: cleanText, linkPreview: activeLinkData };
      setEntries(u);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLinkData]);
  const clearEntry = (i: number) => {
    const u = [...entries]; u[i] = { ...EMPTY_ENTRY }; setEntries(u);
    if (linkEntryIndex === i) clearLink();
  };

  const dismissLinkPreview = (i: number) => {
    const u = [...entries]; u[i] = { ...u[i], linkPreview: null }; setEntries(u);
    clearLink();
  };

  const handleFileSelect = (i: number) => { setCameraTarget(i); setShowMediaMenu(-1); fileInputRef.current?.click(); };
  const handleCameraCapture = (i: number) => { setCameraTarget(i); setShowMediaMenu(-1); cameraInputRef.current?.click(); };

  const processFile = async (file: File, targetIndex: number) => {
    if (file.size > MAX_FILE_SIZE) { setPostError("file too large (max 200mb)"); return; }
    let processedFile = file;
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (isImage) processedFile = await compressImage(file);
    const u = [...entries];
    u[targetIndex] = {
      ...u[targetIndex],
      mediaFile: processedFile,
      mediaType: isVideo ? "video" : "photo",
      mediaPreview: URL.createObjectURL(processedFile),
      linkPreview: null,
    };
    if (linkEntryIndex === targetIndex) clearLink();
    setEntries(u);
    setPostError("");
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file, cameraTarget);
    e.target.value = "";
  };

  const handleAudioRecorded = (i: number, blob: Blob) => {
    const file = new File([blob], `audio-${Date.now()}.webm`, { type: "audio/webm" });
    const u = [...entries];
    u[i] = { ...u[i], mediaFile: file, mediaType: "audio", mediaPreview: "audio", linkPreview: null };
    setEntries(u);
    setShowMediaMenu(-1);
    setPostError("");
    if (linkEntryIndex === i) clearLink();
  };

  const removeMedia = (i: number) => {
    const u = [...entries]; u[i] = { ...u[i], mediaFile: null, mediaPreview: null, mediaType: null }; setEntries(u);
  };

  const swapEntries = (a: number, b: number) => {
    if (b < 0 || b >= entries.length) return;
    const u = [...entries];
    [u[a], u[b]] = [u[b], u[a]];
    setEntries(u);
    setActiveEntry(b);
  };

  const filledEntries = entries.filter(e => e.prompt && (e.text.trim() || e.linkPreview));
  const canPost = filledEntries.length > 0;

  const handlePost = async () => {
    if (!canPost) return;
    try {
      for (const entry of filledEntries) {
        const mediaFiles = entry.mediaFile ? [{ file: entry.mediaFile, type: entry.mediaType || "photo" }] : undefined;
        await createPost.mutateAsync({
          promptType: entry.prompt!.id === "custom" ? entry.prompt!.label : entry.prompt!.id,
          content: entry.text,
          mediaFiles,
          isRecommendation: entry.isRecommendation,
          recommendationCategory: entry.recommendationCategory,
          linkUrl: entry.linkPreview?.url || null,
          linkTitle: entry.linkPreview?.title || null,
          linkDescription: entry.linkPreview?.description || null,
          linkImageUrl: entry.linkPreview?.image_url || null,
          linkSiteName: entry.linkPreview?.site_name || null,
        });
      }
      setPosted(true); setPostError(""); resetCache();
      setEntries([{ ...EMPTY_ENTRY }, { ...EMPTY_ENTRY }, { ...EMPTY_ENTRY }]);
      setTimeout(() => { setPosted(false); onPosted?.(); }, 1500);
    } catch (err: any) {
      console.error("Failed to post:", err);
      setPostError(err?.message || "something went wrong. try again.");
    }
  };

  return (
    <div className="relative">
      <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={onFileChange} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFileChange} />
      <input ref={topPhotoRef} type="file" accept="image/*" className="hidden" onChange={(e) => onTopMediaFile(e, "photo")} />
      <input ref={topVideoRef} type="file" accept="video/*" className="hidden" onChange={(e) => onTopMediaFile(e, "video")} />

      <div className="text-center mb-4">
        <div className="flex items-center justify-center gap-2">
          <h2 className="font-serif text-[22px] font-medium italic m-0" style={{ color: colors.text }}>what's up?</h2>
          {hasPostedToday && (
            <div className="flex items-center gap-1 rounded-full px-2 py-0.5" style={{ background: `${colors.cobalt}15` }}>
              <Check size={12} style={{ color: colors.cobalt }} />
              <span className="font-sans text-[10px] font-semibold" style={{ color: colors.cobalt }}>shared today</span>
            </div>
          )}
        </div>
        <p className="font-sans text-xs m-0 mt-1.5" style={{ color: colors.textMuted }}>pick a prompt and write something to share</p>
      </div>

      {entries.map((entry, i) => (
        <React.Fragment key={i}>
          {/* Drag handle between entries (shown between filled entries) */}
          {i > 0 && (entries[i - 1].prompt || entry.prompt) && (
            <div className="flex items-center justify-center gap-2 -my-1 py-1">
              <button
                onClick={() => swapEntries(i, i - 1)}
                className="flex items-center gap-1 bg-transparent border-0 cursor-pointer py-1 px-2 rounded-lg transition-all"
                style={{ color: colors.textMuted }}
                title="swap with above"
              >
                <svg width="16" height="10" viewBox="0 0 16 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M4 6l4-4 4 4" />
                  <path d="M4 9h8" />
                </svg>
                <span className="font-sans text-[9px] font-semibold">swap</span>
                <svg width="16" height="10" viewBox="0 0 16 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M4 1h8" />
                  <path d="M4 4l4 4 4-4" />
                </svg>
              </button>
            </div>
          )}

          <div className="rounded-xl p-4 mb-3 border transition-colors animate-fade-slide-in relative"
               style={{
                 background: colors.card,
                 borderColor: activeEntry === i ? `${colors.accent}40` : colors.border,
                 animationDelay: `${i * 0.1}s`
               }}>
            {!entry.prompt ? (
              <div>
                {showPrompts === i ? (
                  <div>
                    <div className="font-sans text-[10px] font-bold uppercase tracking-wider mb-2.5" style={{ color: colors.textMuted }}>
                      choose a prompt
                    </div>
                    {recCategoryIndex === i ? (
                      <div className="animate-fade-slide-in">
                        <button
                          onClick={() => setRecCategoryIndex(-1)}
                          className="flex items-center gap-1 bg-transparent border-0 font-sans text-[11px] cursor-pointer p-0 mb-2"
                          style={{ color: colors.textMuted }}
                        >
                          <span>‹</span> back
                        </button>
                        <div className="font-sans text-[13px] font-medium mb-2.5" style={{ color: colors.textMuted }}>
                          what kind of rec?
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {RECOMMENDATION_CATEGORIES.map(cat => (
                            <button
                              key={cat.key}
                              onClick={() => selectRecCategory(i, cat)}
                              className="border rounded-full py-1 px-2.5 pl-2 font-sans text-[10px] cursor-pointer flex items-center gap-1.5 transition-all"
                              style={{
                                background: `${colors.accent}0D`,
                                borderColor: `${colors.accent}25`,
                                borderWidth: 1,
                                color: colors.accent,
                                fontWeight: 400,
                              }}
                            >
                              <span className="text-[11px]">{cat.emoji}</span>
                              <span>{cat.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : customPromptIndex === i ? (
                      <div className="animate-fade-slide-in">
                        <div className="flex items-center gap-2">
                          <input
                            value={customPromptText}
                            onChange={e => setCustomPromptText(e.target.value.slice(0, 60))}
                            onKeyDown={e => e.key === "Enter" && confirmCustomPrompt(i)}
                            placeholder="type your own prompt..."
                            autoFocus
                            className="flex-1 py-2 px-3 rounded-xl border font-sans text-[11px] outline-none"
                            style={{ borderColor: colors.border, background: colors.warmGray, color: colors.text }}
                          />
                          <button
                            onClick={() => confirmCustomPrompt(i)}
                            disabled={!customPromptText.trim()}
                            className="py-2 px-3 rounded-xl border-0 font-sans text-[11px] font-semibold cursor-pointer"
                            style={{ background: customPromptText.trim() ? colors.accent : colors.warmGray, color: customPromptText.trim() ? "#fff" : colors.textMuted }}
                          >
                            done
                          </button>
                        </div>
                        <button
                          onClick={() => { setCustomPromptIndex(-1); setCustomPromptText(""); }}
                          className="mt-1.5 bg-transparent border-0 font-sans text-[10px] cursor-pointer p-0"
                          style={{ color: colors.textMuted }}
                        >
                          ← back to prompts
                        </button>
                      </div>
                    ) : showAllPrompts === i ? (
                      <div className="animate-fade-slide-in">
                        <button
                          onClick={() => setShowAllPrompts(-1)}
                          className="flex items-center gap-1 bg-transparent border-0 font-sans text-[11px] cursor-pointer p-0 mb-2"
                          style={{ color: colors.textMuted }}
                        >
                          <span>‹</span> back
                        </button>
                        <div className="flex flex-wrap gap-1.5 max-h-[220px] overflow-y-auto">
                          {PROMPTS.filter(p => p.id !== "custom").map(p => (
                            <button key={p.id} onClick={() => { selectPrompt(i, p); setShowAllPrompts(-1); }}
                              className="border rounded-full py-1.5 px-3 pl-2 font-sans text-[11px] cursor-pointer flex items-center gap-1.5 transition-all"
                              style={{
                                background: `${p.color}0D`,
                                borderColor: `${p.color}25`,
                                borderWidth: 1,
                                color: p.color,
                                fontWeight: 400,
                              }}>
                              {promptIcons[p.icon](p.color)}
                              <span>{p.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 animate-fade-slide-in">
                        {getDailyPrompts(PROMPTS, i).map(p => {
                          const isRec = p.id === "recommend";
                          return (
                            <button key={p.id} onClick={() => selectPrompt(i, p)}
                              className="border rounded-full py-1.5 px-3 pl-2 font-sans text-[11px] cursor-pointer flex items-center gap-1.5 transition-all"
                               style={{
                                background: `${p.color}0D`,
                                borderColor: `${p.color}25`,
                                borderWidth: 1,
                                color: p.color,
                                fontWeight: 400,
                              }}>
                              {promptIcons[p.icon](isRec ? "#8B2332" : p.color)}
                              <span>{p.label}</span>
                              {isRec && <span className="ml-0.5 text-[11px]">›</span>}
                            </button>
                          );
                        })}
                        <button
                          onClick={() => setShowAllPrompts(i)}
                          className="border rounded-full py-1.5 px-3 font-sans text-[11px] cursor-pointer flex items-center gap-1.5 transition-all"
                          style={{
                            background: `${colors.blueGray}0D`,
                            borderColor: `${colors.blueGray}25`,
                            borderWidth: 1,
                            color: colors.blueGray,
                            fontWeight: 400,
                          }}>
                          <span>more options ›</span>
                        </button>

                        {/* Media format buttons */}
                        <div className="flex items-center gap-2 mt-2.5 pt-2.5" style={{ borderTop: `1px solid ${colors.border}` }}>
                          
                          {[
                            { label: "photo", icon: Camera, action: () => topPhotoRef.current?.click(), active: preMedia?.type === "photo" },
                            { label: "video", icon: Video, action: () => topVideoRef.current?.click(), active: preMedia?.type === "video" },
                            { label: "voice", icon: Mic, action: () => setRecordingVoiceTop(true), active: preMedia?.type === "audio" },
                          ].map(btn => {
                            const BtnIcon = btn.icon;
                            return (
                              <button key={btn.label} onClick={btn.action}
                                className="flex items-center gap-1 border rounded-full py-1 px-2.5 cursor-pointer transition-all"
                                style={{
                                  background: btn.active ? `${colors.accent}10` : colors.card,
                                  borderColor: btn.active ? colors.accent : colors.border,
                                }}>
                                <BtnIcon size={14} style={{ color: btn.active ? colors.accent : colors.textMuted }} />
                                <span className="font-sans text-[10px]" style={{ color: btn.active ? colors.accent : colors.textMuted }}>
                                  {btn.label}
                                </span>
                                {btn.active && <Check size={10} style={{ color: colors.accent }} />}
                              </button>
                            );
                          })}
                          {preMedia && (
                            <button onClick={() => setPreMedia(null)} className="bg-transparent border-0 cursor-pointer p-0.5">
                              <XIcon size={12} color={colors.textMuted} />
                            </button>
                          )}
                        </div>

                        {/* Voice recording inline */}
                        {recordingVoiceTop && (
                          <div className="mt-2 rounded-lg p-3 animate-fade-slide-in" style={{ background: `${colors.accent}08` }}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-sans text-[11px] font-semibold" style={{ color: colors.accent }}>recording...</span>
                              <button onClick={() => setRecordingVoiceTop(false)} className="bg-transparent border-0 cursor-pointer p-0.5">
                                <XIcon size={12} color={colors.textMuted} />
                              </button>
                            </div>
                            <AudioRecordButton size={24} onRecorded={onTopAudioRecorded} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <button onClick={() => { setShowPrompts(i); setActiveEntry(i); }}
                    className="w-full py-4 rounded-lg border border-dashed font-sans text-xs cursor-pointer flex items-center justify-center gap-1.5"
                    style={{ background: colors.warmGray, borderColor: colors.border, color: colors.textMuted }}>
                    <PlusIcon size={14} color={colors.textMuted} /> share
                  </button>
                )}
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                    <div className="inline-flex items-center gap-1.5 rounded-full py-1 pl-2 pr-2.5"
                         style={{ background: `${entry.prompt.color}12` }}>
                      {promptIcons[entry.prompt.icon](entry.prompt.color)}
                      <span className="font-sans text-[11px] font-semibold" style={{ color: entry.prompt.color }}>{entry.prompt.label}</span>
                    </div>
                    {/* Rec category pill */}
                    {entry.isRecommendation && entry.recommendationCategory && (
                      <div className="inline-flex items-center gap-1 rounded-full py-[5px] px-3"
                           style={{ background: "#FAF0E8" }}>
                        <span className="text-[12px]">
                          {RECOMMENDATION_CATEGORIES.find(c => c.key === entry.recommendationCategory)?.emoji}
                        </span>
                        <span className="font-sans text-[12px] font-medium" style={{ color: "#8B5E3C" }}>
                          {entry.recommendationCategory} rec
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {/* Grip handle for reorder */}
                    <div className="flex flex-col items-center gap-0.5 px-1 cursor-grab" style={{ color: colors.textMuted, opacity: 0.4 }}
                         title="drag to reorder">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                        <rect x="3" y="2" width="8" height="1.2" rx="0.6"/>
                        <rect x="3" y="5.4" width="8" height="1.2" rx="0.6"/>
                        <rect x="3" y="8.8" width="8" height="1.2" rx="0.6"/>
                      </svg>
                    </div>
                    <button onClick={() => clearEntry(i)} className="bg-transparent border-0 cursor-pointer p-0.5 flex">
                      <XIcon size={14} />
                    </button>
                  </div>
                </div>

                {/* Textarea with @mention support */}
                <MentionTextarea
                  value={entry.text}
                  onChange={(t) => updateText(i, t)}
                  onFocus={() => setActiveEntry(i)}
                  friends={friends}
                />

                {/* Link preview (only when no media) */}
                {!entry.mediaPreview && (linkEntryIndex === i) && linkLoading && !entry.linkPreview && (
                  <div className="mt-2">
                    <LinkPreviewSkeleton />
                  </div>
                )}
                {!entry.mediaPreview && entry.linkPreview && (
                  <LinkPreviewCard data={entry.linkPreview} onDismiss={() => dismissLinkPreview(i)} />
                )}

                {/* Media preview */}
                {entry.mediaPreview && (
                  <div className="mt-2 rounded-lg overflow-hidden relative">
                    {entry.mediaType === "video" ? (
                      <video src={entry.mediaPreview} className="w-full h-28 object-cover block" />
                    ) : entry.mediaType === "audio" ? (
                      <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: `${colors.cobalt}15` }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.cobalt} strokeWidth="2" strokeLinecap="round">
                          <rect x="9" y="1" width="6" height="11" rx="3"/>
                          <path d="M5 10a7 7 0 0 0 14 0"/>
                          <path d="M12 17v4"/>
                        </svg>
                        <span className="font-sans text-[11px] font-semibold" style={{ color: colors.cobalt }}>voice note attached</span>
                      </div>
                    ) : (
                      <img src={entry.mediaPreview} alt="" className="w-full h-28 object-cover block" />
                    )}
                    <button onClick={() => removeMedia(i)}
                      className="absolute top-1.5 right-1.5 bg-black/50 border-0 rounded-full w-6 h-6 cursor-pointer flex items-center justify-center">
                      <XIcon size={12} color="#fff" />
                    </button>
                  </div>
                )}

                {/* Media buttons */}
                {!entry.mediaPreview && (
                  <div className="mt-2 relative">
                    <button onClick={() => setShowMediaMenu(showMediaMenu === i ? -1 : i)}
                      className="w-8 h-8 rounded-full border-[1.5px] cursor-pointer flex items-center justify-center transition-all"
                      style={{
                        background: showMediaMenu === i ? colors.accent : colors.warmGray,
                        borderColor: showMediaMenu === i ? colors.accent : colors.border,
                        transform: showMediaMenu === i ? "rotate(45deg)" : "rotate(0deg)"
                      }}>
                      <PlusIcon size={16} color={showMediaMenu === i ? "#fff" : colors.textMuted} />
                    </button>
                    {showMediaMenu === i && (
                      <div className="absolute bottom-10 left-0 flex gap-2 animate-fade-slide-in z-10">
                        {[
                          { label: "gallery", icon: <CameraIcon size={16} color="#fff" />, action: () => handleFileSelect(i), bg: colors.cobalt },
                          { label: "camera", icon: <CameraIcon size={16} color="#fff" />, action: () => handleCameraCapture(i), bg: colors.amberGold },
                        ].map(opt => (
                          <button key={opt.label} onClick={opt.action}
                            className="flex flex-col items-center gap-1 bg-transparent border-0 cursor-pointer">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
                                 style={{ background: opt.bg }}>
                              {opt.icon}
                            </div>
                            <span className="font-sans text-[9px] font-semibold" style={{ color: colors.text }}>{opt.label}</span>
                          </button>
                        ))}
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg" style={{ background: colors.accent }}>
                            <AudioRecordButton size={24} onRecorded={(blob) => handleAudioRecorded(i, blob)} />
                          </div>
                          <span className="font-sans text-[9px] font-semibold" style={{ color: colors.text }}>voice</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </React.Fragment>
      ))}

      {postError && (
        <div className="rounded-lg p-3 mb-3 font-sans text-xs" style={{ background: "#A5212A15", color: "#A5212A" }}>
          {postError}
        </div>
      )}

      <button onClick={handlePost} disabled={!canPost || createPost.isPending || posted}
        className="w-full py-3.5 rounded-xl border-0 font-sans text-sm font-semibold transition-all"
        style={{
          background: posted ? colors.cobalt : colors.accent,
          color: "#fff",
          cursor: !canPost || createPost.isPending ? "default" : "pointer",
          opacity: !canPost ? 0.5 : createPost.isPending ? 0.7 : 1
        }}>
        {posted ? "shared with my village ✓" : createPost.isPending ? "sharing..." : "share with my village"}
      </button>
    </div>
  );
}
