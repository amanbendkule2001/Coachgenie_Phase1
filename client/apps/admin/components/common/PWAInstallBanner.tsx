"use client";

import { useState, useEffect } from "react";
import { usePWA } from "@/hooks/use-pwa";
import { Download, X, Share, PlusSquare, RefreshCw, Smartphone } from "lucide-react";
import Image from "next/image";

export function PWAInstallBanner() {
  const { isInstallable, isInstalled, isIOS, updateAvailable, installApp, applyUpdate } =
    usePWA();
  const [isDismissed, setIsDismissed] = useState(true);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissedUntil = localStorage.getItem("coachgenie_pwa_dismissed");
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) {
      setIsDismissed(true);
    } else {
      setIsDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== "undefined") {
      // Dismiss for 3 days
      localStorage.setItem(
        "coachgenie_pwa_dismissed",
        (Date.now() + 3 * 24 * 60 * 60 * 1000).toString()
      );
    }
  };

  // 1. Update Notification Banner
  if (updateAvailable) {
    return (
      <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-indigo-900 text-white p-4 rounded-2xl shadow-2xl border border-indigo-700/60 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl">
            <RefreshCw className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <p className="text-sm font-semibold">Update Available</p>
            <p className="text-xs text-indigo-200">A new version of CoachGenie is ready.</p>
          </div>
        </div>
        <button
          onClick={applyUpdate}
          className="px-3 py-1.5 bg-white text-indigo-900 hover:bg-indigo-50 font-medium text-xs rounded-lg transition-colors shadow-sm"
        >
          Update
        </button>
      </div>
    );
  }

  // If already installed or dismissed, do not render install banner
  if (isInstalled || isDismissed) {
    return null;
  }

  // Show if installable OR on iOS Safari (not installed)
  const shouldShow = isInstallable || (isIOS && !isInstalled);
  if (!shouldShow) return null;

  return (
    <>
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 p-4 animate-in fade-in slide-in-from-bottom-5 transition-all">
        <div className="flex items-start gap-3.5">
          <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-md shrink-0 overflow-hidden">
            <img
              src="/icons/icon-192x192.png"
              alt="CoachGenie"
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback if icon fails to render
                e.currentTarget.style.display = "none";
              }}
            />
            <Smartphone className="w-6 h-6 text-white absolute" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                Install CoachGenie
              </h4>
              <button
                onClick={handleDismiss}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                aria-label="Dismiss banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
              Install as a native app for faster access, offline mode & full screen view.
            </p>

            <div className="mt-3 flex items-center gap-2">
              {isInstallable ? (
                <button
                  onClick={installApp}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs transition-colors shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  Install App
                </button>
              ) : isIOS ? (
                <button
                  onClick={() => setShowIOSModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs transition-colors shadow-sm"
                >
                  <PlusSquare className="w-3.5 h-3.5" />
                  How to Install
                </button>
              ) : null}

              <button
                onClick={handleDismiss}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* iOS Safari Instruction Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                Install on iPhone / iPad
              </h3>
              <button
                onClick={() => setShowIOSModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <ol className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                  1
                </span>
                <span>
                  Tap the <strong>Share</strong> button{" "}
                  <Share className="w-4 h-4 inline text-indigo-600 align-text-bottom" /> at the
                  bottom of Safari.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                  2
                </span>
                <span>
                  Scroll down and tap <strong>Add to Home Screen</strong>{" "}
                  <PlusSquare className="w-4 h-4 inline text-indigo-600 align-text-bottom" />.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                  3
                </span>
                <span>
                  Tap <strong>Add</strong> in the top right corner. Done!
                </span>
              </li>
            </ol>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
