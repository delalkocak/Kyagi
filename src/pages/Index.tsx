import React, { useState, useRef, useEffect, useMemo } from "react";
import { colors } from "@/components/kyagi/data";
import { FeedScreen } from "@/components/kyagi/FeedScreen";
import { ComposeScreen } from "@/components/kyagi/ComposeScreen";
import { ScheduleScreen } from "@/components/kyagi/ScheduleScreen";
import { ProfileScreen } from "@/components/kyagi/ProfileScreen";
import { NotificationsPanel } from "@/components/kyagi/NotificationsPanel";
import { FlareController } from "@/components/kyagi/FlareComponents";
import { useAuth } from "@/contexts/AuthContext";
import { useFeedPosts, useProfile } from "@/hooks/use-posts";
import { useNotifications } from "@/hooks/use-notifications";
import { avatarColor } from "@/components/kyagi/FeedScreen";
import { useIsMobile } from "@/hooks/use-mobile";
import { getTimeTheme } from "@/components/kyagi/timeOfDay";
import { WeeklyFlowModal } from "@/components/kyagi/WeeklyFlowModal";
import { useWeeklyFlow } from "@/hooks/use-weekly-flow";
import { OnboardingFlow } from "@/components/kyagi/OnboardingFlow";
import { useOnboardingStep } from "@/hooks/use-onboarding";
import { ContactMatchScreen } from "@/components/kyagi/ContactMatchScreen";


type Screen = "feed" | "compose" | "schedule" | "profile";
interface NavContext {
  type: string;
  referenceId: string | null;
}

const navItems: { id: Screen; label: string; icon: (active: boolean) => React.ReactNode }[] = [
  {
    id: "feed",
    label: "feed",
    icon: (active) => (
      <svg
        width="22"
        height="22"
        viewBox="0 0 20 20"
        fill="none"
        stroke={active ? colors.accent : colors.textMuted}
        strokeWidth="1.6"
      >
        <circle cx="10" cy="10" r="7" />
        <circle cx="10" cy="10" r="2.5" />
      </svg>
    ),
  },
  {
    id: "schedule",
    label: "meet offline",
    icon: (active) => (
      <svg
        width="22"
        height="22"
        viewBox="0 0 20 20"
        fill="none"
        stroke={active ? colors.accent : colors.textMuted}
        strokeWidth="1.6"
        strokeLinecap="round"
      >
        <rect x="3" y="4" width="14" height="13" rx="2" />
        <path d="M3 8h14" />
        <path d="M7 2v4" />
        <path d="M13 2v4" />
      </svg>
    ),
  },
  {
    id: "profile",
    label: "profile",
    icon: (active) => (
      <svg
        width="22"
        height="22"
        viewBox="0 0 20 20"
        fill="none"
        stroke={active ? colors.accent : colors.textMuted}
        strokeWidth="1.6"
      >
        <circle cx="10" cy="8" r="3" />
        <path d="M4 17c0-3 2.5-5 6-5s6 2 6 5" />
      </svg>
    ),
  },
];

const Index = () => {
  const [screen, setScreen] = useState<Screen>("feed");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [navContext, setNavContext] = useState<NavContext | null>(null);
  const [viewFriendId, setViewFriendId] = useState<string | null>(null);
  const [profileInitialTab, setProfileInitialTab] = useState<"me" | "village" | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { unreadCount } = useNotifications();
  const { data: dbPosts, isLoading: postsLoading } = useFeedPosts();
  const { shouldShowFlow } = useWeeklyFlow();
  const [showWeeklyFlow, setShowWeeklyFlow] = useState(false);
  const { step: onboardingStep, isLoading: onboardingLoading } = useOnboardingStep();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showContactMatch, setShowContactMatch] = useState(false);

  useEffect(() => {
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true);
  }, []);

  // Show onboarding for new users
  useEffect(() => {
    if (!onboardingLoading && onboardingStep === "welcome" && user) {
      setShowOnboarding(true);
    }
  }, [onboardingStep, onboardingLoading, user]);

  // Show weekly flow after a short delay (only for activated/complete users)
  useEffect(() => {
    if (shouldShowFlow && user && (onboardingStep === "activated" || onboardingStep === "complete")) {
      const timer = setTimeout(() => setShowWeeklyFlow(true), 500);
      return () => clearTimeout(timer);
    }
  }, [shouldShowFlow, user, onboardingStep]);

  const [timeTheme, setTimeTheme] = useState(getTimeTheme);
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeTheme(getTimeTheme());
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    if (screen !== "profile") {
      setViewFriendId(null);
      setProfileInitialTab(undefined);
    }
  }, [screen]);

  const displayName = profile?.display_name || "friend";
  const avatarInitial = displayName.charAt(0).toUpperCase();
  const userColor = user ? avatarColor(user.id) : colors.cobalt;
  const isNativeShell = isStandalone || isMobile;

  const titles: Record<Screen, string> = {
    feed: `${timeTheme.greeting}, ${displayName}`,
    compose: "share",
    schedule: "meet offline",
    profile: "profile",
  };

  const isFeed = screen === "feed";

  const shell = (
    <>
      {/* Status bar / safe area top — matches header color */}
      <div
        className="flex-shrink-0"
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
          background: isFeed ? timeTheme.headerColor : colors.bg,
          transition: "background-color 500ms ease",
        }}
      />

      {/* Title */}
      <div
        className="px-4 pt-3 pb-6 flex-shrink-0 flex items-center justify-between relative z-10"
        style={{ background: isFeed ? timeTheme.headerColor : colors.bg, transition: "background-color 500ms ease" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="font-serif text-[20px] font-semibold tracking-tight"
            style={{ color: isFeed ? timeTheme.textColor : colors.text }}
          >
            {titles[screen]}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {screen === "profile" && (
            <button
              onClick={() => setShowSettings((prev) => !prev)}
              className="relative bg-transparent border-0 cursor-pointer p-1"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke={colors.text}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          )}
          <button
            onClick={() => setShowNotifications(true)}
            className="relative bg-transparent border-0 cursor-pointer p-1"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke={isFeed ? timeTheme.bellStroke : colors.text}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && (
              <div
                className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center font-sans text-[9px] font-bold"
                style={{ background: colors.electricIndigo, color: "#fff" }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Notifications overlay */}
      {showNotifications && (
        <NotificationsPanel
          onClose={() => setShowNotifications(false)}
          onNavigate={(s, ctx) => {
            setScreen(s as Screen);
            setNavContext(ctx || null);
          }}
        />
      )}

      {/* Content */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 relative z-10"
        style={{ WebkitOverflowScrolling: "touch", background: colors.bg }}
      >
        {isFeed && (
          <FeedScreen
            dbPosts={dbPosts || []}
            isLoading={postsLoading}
            onNavigateCompose={() => setScreen("compose")}
            onNavigateSchedule={() => setScreen("schedule")}
            highlightPostId={navContext?.type === "comment" ? navContext.referenceId : null}
            onHighlightDone={() => setNavContext(null)}
            onViewFriendProfile={(userId) => {
              setViewFriendId(userId);
              setScreen("profile");
            }}
            timeTheme={timeTheme}
            onNavigateVillage={() => {
              setProfileInitialTab("village");
              setScreen("profile");
            }}
            onboardingStep={onboardingStep}
            onNavigateSearch={() => {
              setShowContactMatch(true);
            }}
          />
        )}
        {screen === "compose" && <ComposeScreen onPosted={() => setScreen("feed")} />}
        {screen === "schedule" && (
          <ScheduleScreen
            highlightRequestId={
              navContext?.type === "schedule_request" || navContext?.type === "schedule_accepted" || navContext?.type === "schedule_declined"
                ? navContext.referenceId
                : null
            }
            onHighlightDone={() => setNavContext(null)}
          />
        )}
        {screen === "profile" && (
          <ProfileScreen
            editingFromSettings={showSettings}
            onSettingsDone={() => setShowSettings(false)}
            initialFriendId={viewFriendId}
            onFriendViewClosed={() => setViewFriendId(null)}
            initialTab={profileInitialTab}
            onOpenContactMatch={() => setShowContactMatch(true)}
          />
        )}
      </div>

      {/* Flare FAB — visible on feed and schedule tabs */}
      <FlareController visible={screen === "feed" || screen === "schedule"} />

      {/* Contact match overlay */}
      {showContactMatch && (
        <ContactMatchScreen onClose={() => setShowContactMatch(false)} />
      )}

      {/* Onboarding flow for new users */}
      {showOnboarding && (
        <OnboardingFlow onComplete={(navigateTo) => {
          setShowOnboarding(false);
          if (navigateTo === "village") {
            setProfileInitialTab("village");
            setScreen("profile");
          }
        }} />
      )}

      {/* Weekly flow modal */}
      {showWeeklyFlow && !showOnboarding && (
        <WeeklyFlowModal
          onComplete={() => setShowWeeklyFlow(false)}
          onSkip={() => setShowWeeklyFlow(false)}
        />
      )}

      {/* Bottom nav */}
      <div
        className="tab-bar-container flex-shrink-0 flex items-center justify-around border-t"
        style={{
          background: colors.card,
          borderColor: colors.border,
          minHeight: 49,
          zIndex: 50,
        }}
      >
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setScreen(item.id)}
            className="bg-transparent border-0 cursor-pointer flex flex-col items-center relative"
            style={{ padding: '4px 0 2px', gap: '1px' }}
          >
            {item.icon(screen === item.id)}
            <span
              className={`font-sans transition-colors ${screen === item.id ? "font-semibold" : "font-normal"}`}
              style={{ color: screen === item.id ? colors.accent : colors.textMuted, fontSize: '10px', lineHeight: 1 }}
            >
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </>
  );

  if (isNativeShell) {
    return (
      <div
        className="pwa-shell flex flex-col font-sans relative"
        style={{
          background: colors.card,
        }}
      >
        {shell}
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center py-5 font-sans"
      style={{ background: "linear-gradient(160deg, #F4EDD8 0%, #E8DFC0 50%, #DDD5B0 100%)" }}
    >
      <div
        className="flex flex-col overflow-hidden relative"
        style={{
          width: 375,
          height: 740,
          borderRadius: 40,
          background: colors.card,
          boxShadow: "0 25px 60px rgba(44,46,58,0.22), 0 8px 20px rgba(44,46,58,0.10)",
          border: "8px solid #2C2E3A",
          transform: "translateZ(0)",
        }}
      >
        <div
          className="h-12 flex items-center justify-center flex-shrink-0"
          style={{ background: isFeed ? timeTheme.headerColor : colors.bg, transition: "background-color 500ms ease" }}
        >
          <div className="w-[120px] h-7 rounded-full" style={{ background: "#2C2E3A" }} />
        </div>
        {shell}
      </div>
    </div>
  );
};

export default Index;
