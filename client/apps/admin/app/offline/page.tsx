"use client";

import { WifiOff, RefreshCw, Home } from "lucide-react";
import Image from "next/image";

export default function OfflinePage() {
  const handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-8 flex flex-col items-center">
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-full bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <WifiOff className="w-10 h-10 animate-pulse" />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white rounded-full p-1.5 shadow-sm">
            <RefreshCw className="w-3.5 h-3.5" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          No Internet Connection
        </h1>

        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          CoachGenie cannot connect to the server right now. Previously loaded data
          is cached, but new changes require an active internet connection.
        </p>

        <div className="w-full space-y-3">
          <button
            onClick={handleReload}
            className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors shadow-sm active:scale-[0.99]"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Connection
          </button>

          <button
            onClick={() => {
              if (typeof window !== "undefined") window.history.back();
            }}
            className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-sm transition-colors"
          >
            <Home className="w-4 h-4" />
            Go to Previous Screen
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-xs text-slate-400">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          <span>CoachGenie PWA Offline Mode</span>
        </div>
      </div>
    </div>
  );
}
