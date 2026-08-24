"use client";

import { useState, useRef, useEffect } from "react";
import { Globe, Check } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { SUPPORTED_LANGUAGES, type SupportedLanguage, type LanguageInfo } from "@coachgenie/i18n";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = SUPPORTED_LANGUAGES.find((l: LanguageInfo) => l.code === language) || SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      ref={dropdownRef}
      className="relative inline-block text-left"
      data-testid="language-switcher-container"
      data-no-translate="true"
    >
      <button
        type="button"
        data-testid="language-switcher"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Change Language"
        className={cn(
          "flex items-center gap-1.5 rounded-xl border border-border/80 px-2.5 py-1.5 text-xs font-semibold shadow-xs transition-all duration-150 cursor-pointer bg-card text-foreground hover:bg-muted/80 hover:border-primary/40",
          open && "border-primary ring-2 ring-primary/20 bg-muted/60"
        )}
        title={`Language: ${currentLang.nativeName}`}
      >
        <span className="text-sm">{currentLang.flag}</span>
        <span className="hidden sm:inline-block font-medium text-xs text-foreground/90">
          {currentLang.nativeName}
        </span>
        <span className="inline-block sm:hidden font-medium text-xs text-foreground/90">
          {currentLang.code.toUpperCase()}
        </span>
        <Globe className="h-3.5 w-3.5 text-muted-foreground ml-0.5" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-11 z-[100] w-48 rounded-xl border border-border/80 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden p-1.5 animate-in fade-in zoom-in-95 duration-150 ring-1 ring-black/10 dark:ring-white/10"
        >
          <div className="px-2.5 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/50 mb-1">
            Language / भाषा / भाषा निवडा
          </div>

          <div className="space-y-0.5">
            {SUPPORTED_LANGUAGES.map((item: LanguageInfo) => {
              const active = item.code === language;
              return (
                <button
                  key={item.code}
                  type="button"
                  data-testid={`lang-opt-${item.code}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setLanguage(item.code);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-colors cursor-pointer text-left",
                    active
                      ? "bg-primary/10 text-primary font-bold"
                      : "text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{item.flag}</span>
                    <div className="flex flex-col">
                      <span className="leading-tight text-xs font-semibold">{item.nativeName}</span>
                      <span className="text-[10px] text-muted-foreground leading-tight">{item.name}</span>
                    </div>
                  </div>
                  {active && <Check className="h-3.5 w-3.5 text-primary shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
