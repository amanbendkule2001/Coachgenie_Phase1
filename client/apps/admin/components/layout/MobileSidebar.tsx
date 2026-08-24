"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Menu, X, GraduationCap, LayoutDashboard, Users, CalendarDays, CheckSquare,
  CreditCard, Settings, UserPlus, FileCheck, BookOpen, ClipboardList,
  IndianRupee, Bell, Sparkles, ExternalLink, Brain, LogOut,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore, type UserRole } from "@/lib/stores/auth.store";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { CoachGenieLogo } from "@/components/common/CoachGenieLogo";
import { api } from "@/lib/api";

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, Users, CalendarDays, CheckSquare,
  CreditCard, Settings, GraduationCap, Brain,
  UserPlus, FileCheck, BookOpen, ClipboardList, IndianRupee, Bell, Sparkles, ExternalLink,
};

interface NavSection {
  title?: string;
  items: Array<{
    label: string;
    href: string;
    icon: string;
    external?: boolean;
  }>;
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview & Enrollment",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
      { label: "Leads", href: "/leads", icon: "UserPlus" },
      { label: "Admissions", href: "/admissions", icon: "FileCheck" },
      { label: "Students", href: "/students", icon: "Users" },
    ],
  },
  {
    title: "Academic & Operations",
    items: [
      { label: "Batches", href: "/batches", icon: "BookOpen" },
      { label: "Exams", href: "/exams", icon: "ClipboardList" },
      { label: "Sessions", href: "/sessions", icon: "CalendarDays" },
      { label: "Attendance", href: "/attendance", icon: "CheckSquare" },
      { label: "Attendance Reports", href: "/attendance/reports", icon: "ClipboardList" },
    ],
  },
  {
    title: "Finance & Intelligence",
    items: [
      { label: "Fees", href: "/fees", icon: "IndianRupee" },
      { label: "Growth Cards", href: "/growth-cards", icon: "Sparkles" },
      { label: "AI Analytics", href: "/ai/analytics", icon: "Brain" },
      { label: "Career Guidance", href: "https://career-guidence-topaz.vercel.app/", icon: "GraduationCap", external: true },
    ],
  },
  {
    title: "Preferences",
    items: [
      { label: "Notifications", href: "/notifications", icon: "Bell" },
      { label: "Billing", href: "/settings/billing", icon: "CreditCard" },
      { label: "Settings", href: "/settings", icon: "Settings" },
    ],
  },
];

const MODULE_ROLES: Record<string, UserRole[]> = {
  "/dashboard": ["owner", "counselor", "tutor"],
  "/leads": ["owner", "counselor"],
  "/admissions": ["owner", "counselor"],
  "/students": ["owner", "counselor", "tutor"],
  "/batches": ["owner", "counselor", "tutor"],
  "/exams": ["owner", "tutor"],
  "/sessions": ["owner", "tutor"],
  "/attendance": ["owner", "tutor"],
  "/attendance/reports": ["owner", "tutor"],
  "/fees": ["owner", "counselor"],
  "/growth-cards": ["owner", "counselor", "tutor"],
  "/notifications": ["owner", "counselor"],
  "/settings/billing": ["owner"],
  "/settings": ["owner"],
  "/ai/analytics": ["owner", "counselor", "tutor"],
};

export function MobileSidebarDrawer({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { role, user, clear } = useAuthStore();
  const currentRole = role ?? "owner";

  const userName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.email || "Admin";
  const userInitial = user?.first_name?.charAt(0) || user?.email?.charAt(0) || "A";

  // Lock body scroll while the drawer is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handleLogout = async () => {
    onClose();
    const { refreshToken } = useAuthStore.getState();
    try {
      if (refreshToken) {
        await api.post("/auth/logout", { refresh_token: refreshToken });
      }
    } catch (err) {
      console.error("Logout failed:", err);
    }
    clear();
    if (typeof window !== "undefined") {
      localStorage.removeItem("coachgenie-ui");
    }
    await fetch("/api/auth/session", { method: "DELETE" });
    window.location.href = "/login";
  };

  return (
    <div className="fixed inset-0 z-[100] lg:hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <nav
        className={cn(
          "absolute left-0 top-0 h-full w-80 max-w-[85vw]",
          "bg-white dark:bg-zinc-900 shadow-2xl flex flex-col",
          "border-r border-border animate-in slide-in-from-left duration-200"
        )}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between border-b border-border px-4 h-[3.75rem] shrink-0 bg-zinc-50/70 dark:bg-zinc-800/50"
          data-no-translate="true"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <CoachGenieLogo size="md" plain />
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-sm truncate bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                CoachGenie
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                ERP Mobile
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-xl p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-4 overscroll-contain">
          {NAV_SECTIONS.map((section, sIdx) => {
            const visibleItems = section.items.filter(
              (item) =>
                item.external ||
                (MODULE_ROLES[item.href]?.includes(currentRole) ?? true)
            );

            if (visibleItems.length === 0) return null;

            return (
              <div key={sIdx} className="space-y-1">
                {section.title && (
                  <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 mb-1">
                    {t(section.title)}
                  </p>
                )}
                {visibleItems.map((item) => {
                  const Icon = ICON_MAP[item.icon] ?? LayoutDashboard;
                  const active =
                    !item.external &&
                    (pathname === item.href ||
                      (item.href !== "/dashboard" && pathname.startsWith(item.href + "/")));
                  const labelTranslated = t(item.label);

                  const commonClass = cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all active:scale-[0.98]",
                    active
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  );

                  if (item.external) {
                    return (
                      <a
                        key={item.href}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={onClose}
                        className={commonClass}
                      >
                        <Icon className="h-4.5 w-4.5 shrink-0" />
                        <span className="truncate flex-1 flex items-center justify-between">
                          {labelTranslated}
                          <ExternalLink className="h-3.5 w-3.5 opacity-50" />
                        </span>
                      </a>
                    );
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={commonClass}
                    >
                      <Icon
                        className={cn(
                          "h-4.5 w-4.5 shrink-0",
                          active ? "text-primary-foreground" : "text-muted-foreground"
                        )}
                      />
                      <span className="truncate">{labelTranslated}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* User Footer Profile & Quick Logout */}
        <div className="border-t border-border p-3 bg-zinc-50/80 dark:bg-zinc-800/60 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white dark:bg-zinc-900 border border-border shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                {userInitial}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-foreground truncate">
                  {userName}
                </span>
                <span className="text-[10px] text-muted-foreground capitalize truncate">
                  {currentRole}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}

interface MobileSidebarProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function MobileSidebar({ open: controlledOpen, onOpenChange }: MobileSidebarProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const setOpen = (val: boolean) => {
    if (isControlled && onOpenChange) {
      onOpenChange(val);
    } else {
      setInternalOpen(val);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden rounded-xl p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {isOpen &&
        mounted &&
        createPortal(
          <MobileSidebarDrawer onClose={() => setOpen(false)} />,
          document.body
        )}
    </>
  );
}
