"use client";

import { useState, useEffect } from "react";
import { WifiOff, Wifi } from "lucide-react";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    // Initial check
    if (typeof window !== "undefined" && !navigator.onLine) {
      setIsOffline(true);
    }

    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowReconnected(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline && !showReconnected) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-16 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
    >
      <div
        className={`pointer-events-auto flex items-center gap-2.5 px-4 py-2.5 rounded-full shadow-xl text-xs sm:text-sm font-semibold backdrop-blur-md transition-all ${
          isOffline
            ? "bg-rose-600/95 text-white border border-rose-500/50 shadow-rose-950/20"
            : "bg-emerald-600/95 text-white border border-emerald-500/50 shadow-emerald-950/20"
        }`}
      >
        {isOffline ? (
          <>
            <WifiOff className="h-4 w-4 shrink-0 animate-pulse text-rose-200" />
            <span>You are offline. Working in offline cache mode.</span>
          </>
        ) : (
          <>
            <Wifi className="h-4 w-4 shrink-0 text-emerald-200" />
            <span>Connection restored. Back online!</span>
          </>
        )}
      </div>
    </div>
  );
}
