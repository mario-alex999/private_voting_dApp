"use client";

import { useEffect, useState } from "react";

type InstallOutcome = "accepted" | "dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: InstallOutcome; platform: string }>;
};

export default function PwaBootstrap() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const standaloneMedia = window.matchMedia("(display-mode: standalone)");
    const standaloneNavigator = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsInstalled(standaloneMedia.matches || standaloneNavigator);

    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch(() => {
          // Non-blocking: app should still render even if SW registration fails.
        });
      });
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    const onStandaloneChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setIsInstalled(true);
        setDeferredPrompt(null);
      }
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    standaloneMedia.addEventListener("change", onStandaloneChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      standaloneMedia.removeEventListener("change", onStandaloneChange);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  if (isInstalled || !deferredPrompt) return null;

  return (
    <button
      type="button"
      onClick={installApp}
      className="fixed bottom-5 right-5 z-[220] rounded-full border border-cyan-300/40 bg-cyan-400 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-black shadow-lg hover:brightness-95"
      aria-label="Install VoteVault"
    >
      Install VoteVault
    </button>
  );
}
