import React, { useState, useEffect } from "react";
import { colors } from "@/components/kyagi/data";
import { promptIcons } from "@/components/kyagi/icons";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallPage = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true) {
      setIsInstalled(true);
    }
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua));
    setIsAndroid(/Android/.test(ua));
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  const stepBadge = "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0";

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 font-sans"
         style={{ background: colors.bg }}>
      <div className="w-full max-w-sm">
        {/* Logo & tagline */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-[22px] mx-auto mb-5 flex items-center justify-center shadow-lg"
               style={{ background: colors.softRose }}>
            <div className="scale-[2.2]">
              {promptIcons.flower(colors.accent)}
            </div>
          </div>
          <h1 className="font-serif text-3xl font-semibold mb-1.5" style={{ color: colors.text }}>
            kyagi
          </h1>
          <p className="font-sans text-sm" style={{ color: colors.textMuted }}>
            a personal newsletter to your real friends
          </p>
        </div>

        {isInstalled ? (
          <div className="rounded-2xl p-5 text-center" style={{ background: colors.palePeriwinkle }}>
            <p className="font-sans text-sm font-semibold mb-1" style={{ color: colors.text }}>
              kyagi is installed ✓
            </p>
            <p className="font-sans text-xs mb-3" style={{ color: colors.textMuted }}>
              you can find it on your home screen
            </p>
            <a href="/" className="inline-block font-sans text-sm font-semibold"
               style={{ color: colors.accent }}>
              open kyagi →
            </a>
          </div>
        ) : (
          <>
            {/* Beta banner */}
            <div className="rounded-xl px-4 py-3 mb-5 text-center"
                 style={{ background: colors.palePeriwinkle }}>
              <p className="font-sans text-xs font-medium" style={{ color: colors.accent }}>
                🌸 you're invited to the beta — thanks for testing!
              </p>
            </div>

            {/* Install card */}
            <div className="rounded-2xl p-5" style={{ background: colors.card, border: `1px solid ${colors.border}` }}>
              
              {isIOS ? (
                <>
                  <p className="font-sans text-sm font-semibold mb-1" style={{ color: colors.text }}>
                    install on iphone
                  </p>
                  <p className="font-sans text-xs mb-4" style={{ color: colors.textMuted }}>
                    make sure you're in <strong>safari</strong> (not chrome or in-app browsers)
                  </p>
                  <ol className="space-y-4">
                    <li className="flex items-start gap-3">
                      <span className={stepBadge} style={{ background: colors.palePeriwinkle, color: colors.accent }}>1</span>
                      <div>
                        <span className="font-sans text-sm" style={{ color: colors.text }}>
                          tap the <strong>share</strong> button
                        </span>
                        <p className="font-sans text-[11px] mt-0.5" style={{ color: colors.textMuted }}>
                          the square with an arrow at the bottom of safari
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className={stepBadge} style={{ background: colors.palePeriwinkle, color: colors.accent }}>2</span>
                      <div>
                        <span className="font-sans text-sm" style={{ color: colors.text }}>
                          scroll down and tap <strong>"add to home screen"</strong>
                        </span>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className={stepBadge} style={{ background: colors.palePeriwinkle, color: colors.accent }}>3</span>
                      <div>
                        <span className="font-sans text-sm" style={{ color: colors.text }}>
                          tap <strong>add</strong> in the top right
                        </span>
                        <p className="font-sans text-[11px] mt-0.5" style={{ color: colors.textMuted }}>
                          kyagi will appear on your home screen like a regular app
                        </p>
                      </div>
                    </li>
                  </ol>
                </>
              ) : deferredPrompt ? (
                <>
                  <p className="font-sans text-sm font-semibold mb-4 text-center" style={{ color: colors.text }}>
                    ready to install
                  </p>
                  <button onClick={handleInstall}
                    className="w-full py-3.5 rounded-xl border-0 font-sans text-sm font-semibold cursor-pointer transition-transform active:scale-[0.98]"
                    style={{ background: colors.accent, color: "#fff" }}>
                    install kyagi
                  </button>
                </>
              ) : (
                <>
                  <p className="font-sans text-sm font-semibold mb-1" style={{ color: colors.text }}>
                    install on android
                  </p>
                  <p className="font-sans text-xs mb-4" style={{ color: colors.textMuted }}>
                    use <strong>chrome</strong> for the best experience
                  </p>
                  <ol className="space-y-4">
                    <li className="flex items-start gap-3">
                      <span className={stepBadge} style={{ background: colors.palePeriwinkle, color: colors.accent }}>1</span>
                      <div>
                        <span className="font-sans text-sm" style={{ color: colors.text }}>
                          tap the <strong>⋮ menu</strong> (three dots)
                        </span>
                        <p className="font-sans text-[11px] mt-0.5" style={{ color: colors.textMuted }}>
                          top-right corner of chrome
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className={stepBadge} style={{ background: colors.palePeriwinkle, color: colors.accent }}>2</span>
                      <div>
                        <span className="font-sans text-sm" style={{ color: colors.text }}>
                          tap <strong>"install app"</strong> or <strong>"add to home screen"</strong>
                        </span>
                        <p className="font-sans text-[11px] mt-0.5" style={{ color: colors.textMuted }}>
                          kyagi will install like a regular app
                        </p>
                      </div>
                    </li>
                  </ol>
                </>
              )}
            </div>
          </>
        )}

        <a href="/" className="block text-center mt-5 font-sans text-xs" style={{ color: colors.textMuted }}>
          or continue in browser →
        </a>
      </div>
    </div>
  );
};

export default InstallPage;
