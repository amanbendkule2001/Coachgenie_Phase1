"use client";

import React, { createContext, useContext, useEffect, useState, useTransition, useRef } from "react";
import {
  type SupportedLanguage,
  TRANSLATIONS,
  translate as tHelper,
} from "@coachgenie/i18n";
import i18n from "@coachgenie/i18n";

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string) => string;
  isPending: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key: string) => key,
  isPending: false,
});

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>("en");
  const [isPending, startTransition] = useTransition();
  const originalTextMap = useRef<Map<Node, string>>(new Map());

  // Load language from localStorage on client mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("coachgenie_lang") as SupportedLanguage;
      if (saved && (saved === "en" || saved === "hi" || saved === "mr")) {
        setLanguageState(saved);
        i18n.changeLanguage(saved);
        document.documentElement.lang = saved;
      }
    } catch (_) {}
  }, []);

  // Comprehensive dynamic text & attribute translation observer
  useEffect(() => {
    if (typeof window === "undefined") return;

    const dict: Record<string, string> = TRANSLATIONS[language] || TRANSLATIONS.en;
    
    // Sort keys by descending length so multi-word expressions match before individual words
    const sortedKeys = Object.keys(dict).sort((a, b) => b.length - a.length);

    // Helper to translate single text content
    const translateText = (text: string): string => {
      if (!text) return text;
      const trimmed = text.trim();
      if (!trimmed) return text;

      // 1. Exact match
      if (dict[trimmed]) {
        return text.replace(trimmed, String(dict[trimmed]));
      }

      // 2. Multi-word phrase replacements
      let result = text;
      for (const enKey of sortedKeys) {
        if (enKey.length > 2 && result.includes(enKey)) {
          const localized = dict[enKey];
          if (localized) {
            result = result.split(enKey).join(localized);
          }
        }
      }

      return result;
    };

    const processElementAttributes = (el: HTMLElement) => {
      if (el.closest('[data-no-translate]')) return;

      // Translate placeholders
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        const origPlaceholder = el.getAttribute("data-orig-placeholder") ?? el.placeholder;
        if (origPlaceholder) {
          if (!el.hasAttribute("data-orig-placeholder")) {
            el.setAttribute("data-orig-placeholder", origPlaceholder);
          }
          if (language === "en") {
            el.placeholder = origPlaceholder;
          } else {
            el.placeholder = translateText(origPlaceholder);
          }
        }
      }

      // Translate titles
      const origTitle = el.getAttribute("data-orig-title") ?? el.getAttribute("title");
      if (origTitle && !el.closest('[data-testid="language-switcher-container"]')) {
        if (!el.hasAttribute("data-orig-title")) {
          el.setAttribute("data-orig-title", origTitle);
        }
        if (language === "en") {
          el.setAttribute("title", origTitle);
        } else {
          el.setAttribute("title", translateText(origTitle));
        }
      }
    };

    const processNode = (node: Node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        processElementAttributes(node as HTMLElement);
      }

      // Ignore script, style, code, pre, textarea, and data-no-translate elements
      if (
        node.parentElement &&
        (node.parentElement.closest('[data-no-translate]') ||
          ["SCRIPT", "STYLE", "CODE", "PRE", "TEXTAREA"].includes(
            node.parentElement.tagName
          ))
      ) {
        return;
      }

      if (node.nodeType === Node.TEXT_NODE && node.nodeValue) {
        // Skip purely numeric/currency text
        const trimmed = node.nodeValue.trim();
        if (/^[\d,.\s₹$%+\-–/:]+$/.test(trimmed) && trimmed.length < 15) {
          return;
        }

        const original = originalTextMap.current.get(node) ?? node.nodeValue;
        if (!originalTextMap.current.has(node)) {
          originalTextMap.current.set(node, original);
        }

        if (language === "en") {
          if (node.nodeValue !== original) {
            node.nodeValue = original;
          }
        } else {
          const translated = translateText(original);
          if (translated !== node.nodeValue) {
            node.nodeValue = translated;
          }
        }
      } else {
        node.childNodes.forEach(processNode);
      }
    };

    // Run initial pass on full document
    processNode(document.body);

    // Observe dynamic mutations (e.g. modals opening, async table data, tabs switching)
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach(processNode);
        } else if (mutation.type === "characterData" && mutation.target) {
          processNode(mutation.target);
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
    };
  }, [language]);

  const setLanguage = (lang: SupportedLanguage) => {
    startTransition(() => {
      setLanguageState(lang);
      try {
        localStorage.setItem("coachgenie_lang", lang);
        i18n.changeLanguage(lang);
        document.documentElement.lang = lang;
      } catch (_) {}
    });
  };

  const t = (key: string): string => {
    return tHelper(key, language);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isPending }}>
      {children}
    </LanguageContext.Provider>
  );
}
