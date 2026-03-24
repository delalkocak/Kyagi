import React, { useMemo, useEffect, useState } from "react";
import { colors, PROMPTS, SAMPLE_POSTS } from "./data";
import { TimeTheme } from "./timeOfDay";
import { promptIcons } from "./icons";
import { DayCard } from "./DayCard";
import { DbPost } from "@/hooks/use-posts";
import { useAuth } from "@/contexts/AuthContext";
import { useMonthlyBanner, formatEditionMonth } from "@/hooks/use-village-monthly";
import { FlareBanner } from "./FlareDisplay";
import { OnboardingNudgeCard } from "./OnboardingNudgeCard";
import { ShareInviteSheet } from "./ShareInviteSheet";


// Activity suggestions
const ACTIVITY_SUGGESTIONS = [
  "go for a walk together",
  "go to yoga together",
  "go grocery shopping together",
  "facetime while doing laundry",
  "co-work this weekend",
  "cook dinner together",
  "tea time",
  "reading party",
  "book swap",
  "go to pilates together",
];

// Color palette for avatars based on user_id hash
const AVATAR_COLORS = ["#8B1A2B", "#2B5BA8", "#1A7A6D", "#C48A1A", "#1E4D8C", "#A5212A", "#3A6DB5"];
export function avatarColor(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

interface FeedScreenProps {
  dbPosts: DbPost[];
  isLoading: boolean;
  onNavigateCompose?: () => void;
  onNavigateSchedule?: () => void;
  highlightPostId?: string | null;
  onHighlightDone?: () => void;
  onViewFriendProfile?: (userId: string) => void;
  timeTheme?: TimeTheme;
  onNavigateVillage?: () => void;
  onboardingStep?: string;
  onNavigateSearch?: () => void;
}

// Group posts by session_id
function groupBySession(posts: DbPost[]) {
  const groups = new Map<string, DbPost[]>();
  for (const post of posts) {
    const key = post.session_id || post.id;
    const arr = groups.get(key) || [];
    arr.push(post);
    groups.set(key, arr);
  }
  for (const arr of groups.values()) {
    arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }
  return Array.from(groups.values()).sort(
    (a, b) => new Date(b[b.length - 1].created_at).getTime() - new Date(a[a.length - 1].created_at).getTime()
  );
}

export function FeedScreen({ dbPosts, isLoading, onNavigateCompose, onNavigateSchedule, highlightPostId, onHighlightDone, onViewFriendProfile, timeTheme, onNavigateVillage, onboardingStep, onNavigateSearch }: FeedScreenProps) {
  const { user } = useAuth();
  const hasPosts = dbPosts.length > 0;
  const [showInviteSheet, setShowInviteSheet] = useState(false);

  // 24-hour banner for new village monthly
  const { data: bannerEdition } = useMonthlyBanner();

  const activitySuggestion = useMemo(() => {
    return ACTIVITY_SUGGESTIONS[Math.floor(Math.random() * ACTIVITY_SUGGESTIONS.length)];
  }, []);

  // Group all posts by session
  const allSessionGroups = useMemo(() => groupBySession(dbPosts), [dbPosts]);

  // Separate: pin only the user's most recent session, mix the rest chronologically
  const pinnedSession = useMemo(() => {
    if (!user) return null;
    return allSessionGroups.find(group => group[0].user_id === user.id) || null;
  }, [allSessionGroups, user]);

  const pinnedSessionKey = pinnedSession ? (pinnedSession[0].session_id || pinnedSession[0].id) : null;

  const chronologicalFeed = useMemo(() => {
    return allSessionGroups.filter(group => {
      const key = group[0].session_id || group[0].id;
      return key !== pinnedSessionKey;
    });
  }, [allSessionGroups, pinnedSessionKey]);

  return (
    <div className="relative">
      {/* Gradient zone — covers Village Monthly + WhatsUp card */}
      <div
        className="-mx-4 px-4"
        style={{
          background: timeTheme?.gradient || colors.bg,
          transition: "background 500ms ease",
        }}
      >
        {/* 48-hour Village Monthly banner */}
        {bannerEdition && (
          <div
            className="rounded-2xl mb-3 overflow-hidden cursor-pointer"
            style={{
              background: "#8B2332",
              border: "0.5px solid transparent",
            }}
            onClick={() => onNavigateVillage?.()}
          >
            <div
              className="flex items-center justify-between"
              style={{ padding: "0 20px", height: 52 }}
            >
              <span className="font-serif text-[16px] lowercase" style={{ color: "#FFFFFF" }}>
                the village monthly
              </span>
              <div className="flex items-center gap-3">
                <span
                  className="font-sans text-[12px] uppercase tracking-wider"
                  style={{ color: "rgba(255,255,255,0.7)" }}
                >
                  {formatEditionMonth(bannerEdition.edition_month)}
                </span>
                <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.6)" }}>→</span>
              </div>
            </div>
          </div>
        )}
        {isLoading && (
          <div className="text-center py-12">
            <div className="w-6 h-6 rounded-full border-2 animate-spin-loader mx-auto mb-3"
                 style={{ borderColor: colors.border, borderTopColor: colors.accent }} />
            <div className="font-sans text-xs" style={{ color: colors.textMuted }}>loading your feed...</div>
          </div>
        )}

        {/* "What's up?" prompt — always visible */}
        {!isLoading && user && (
          <button
            onClick={onNavigateCompose}
            className="w-full rounded-2xl p-5 mb-0 cursor-pointer text-center"
            style={{
              background: timeTheme?.cardBackground || `${colors.card}80`,
              borderWidth: "1.5px",
              borderStyle: "dashed",
              borderColor: timeTheme?.cardBorder || `${colors.accent}40`,
            }}
          >
            <div className="font-serif text-base italic mb-1" style={{ color: timeTheme?.cardTextPrimary || colors.text }}>
              what's up?
            </div>
            <div className="font-sans text-[11px]" style={{ color: timeTheme?.cardTextSecondary || colors.textMuted }}>
              tap to share with my village
            </div>
          </button>
        )}

        {/* Spacer so gradient ends cleanly after WhatsUp */}
        <div style={{ height: 14 }} />
      </div>

      {/* Flare banner */}
      {!isLoading && <FlareBanner onTap={() => onNavigateSchedule?.()} />}

      {/* Pinned: user's most recent session only */}
      {!isLoading && user && pinnedSession && (
        <DayCard key={`own-${pinnedSessionKey}`} posts={pinnedSession} isPinned
          highlightPostId={highlightPostId} onHighlightDone={onHighlightDone} onViewFriendProfile={onViewFriendProfile} />
      )}

      {/* Chronological feed: all other sessions (own + friends) */}
      {!isLoading && chronologicalFeed.map((posts, i) => (
        <React.Fragment key={`${posts[0].user_id}-${posts[0].session_id || posts[0].created_at}`}>
          <DayCard posts={posts} index={i}
            highlightPostId={highlightPostId} onHighlightDone={onHighlightDone} onViewFriendProfile={onViewFriendProfile} />
          {/* Nudge card after 2nd post for exploring users */}
          {i === 1 && onboardingStep === "exploring" && (
            <OnboardingNudgeCard
              onFindFriends={() => onNavigateSearch?.()}
              onInviteSomeone={() => setShowInviteSheet(true)}
            />
          )}
        </React.Fragment>
      ))}

      {/* Show nudge at end if fewer than 2 chronological posts */}
      {!isLoading && chronologicalFeed.length < 2 && onboardingStep === "exploring" && (
        <OnboardingNudgeCard
          onFindFriends={() => onNavigateSearch?.()}
          onInviteSomeone={() => setShowInviteSheet(true)}
        />
      )}

      {/* End-of-feed CTA */}
      {!isLoading && user && chronologicalFeed.length === 0 && !pinnedSession && (
        <div className="flex flex-col items-center justify-center pt-12 pb-20 px-6">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
               className="mb-3" style={{ color: colors.textMuted }}>
            <path d="M8 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0Z" />
            <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
          </svg>
          <p className="font-serif text-base font-medium m-0 mb-1" style={{ color: colors.textMuted }}>
            nothing here yet.
          </p>
          <p className="font-sans text-sm m-0" style={{ color: colors.textMuted, opacity: 0.7 }}>
            invite some friends to get started.
          </p>
        </div>
      )}

      {!isLoading && user && chronologicalFeed.length > 0 && (
        <div className="flex flex-col items-center justify-center pt-12 pb-20 px-6">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
               className="mb-3" style={{ color: colors.textMuted }}>
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          <p className="font-serif text-base font-medium m-0 mb-1" style={{ color: colors.textMuted }}>
            that's everything.
          </p>
          <p className="font-sans text-sm m-0 mb-4" style={{ color: colors.textMuted, opacity: 0.7 }}>
            now go hang out with someone.
          </p>
          <button
            onClick={() => onNavigateSchedule?.()}
            className="font-sans text-sm font-medium px-5 py-2.5 rounded-full border-0 cursor-pointer"
            style={{ background: `${colors.accent}cc`, color: "#FAF8F2" }}
          >
            make plans
          </button>
        </div>
      )}

      {/* Share invite sheet */}
      {showInviteSheet && <ShareInviteSheet onClose={() => setShowInviteSheet(false)} />}
    </div>
  );
}
