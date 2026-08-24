"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  IndianRupee,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/providers/LanguageProvider";

interface BottomNavProps {
  onOpenMenu: () => void;
  isMenuOpen?: boolean;
}

export function BottomNav({ onOpenMenu, isMenuOpen }: BottomNavProps) {
  const pathname = usePathname();
  const { t } = useLanguage();

  const NAV_TABS = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Students",
      href: "/students",
      icon: Users,
    },
    {
      label: "Attendance",
      href: "/attendance",
      icon: CheckSquare,
    },
    {
      label: "Fees",
      href: "/fees",
      icon: IndianRupee,
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation Bar"
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 lg:hidden",
        "bg-white/95 dark:bg-zinc-900/95 backdrop-blur-lg",
        "border-t border-border/80 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)]",
        "px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom),0.5rem)]"
      )}
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {NAV_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            pathname === tab.href || pathname.startsWith(tab.href + "/");

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 py-1 px-1.5 rounded-xl transition-all duration-150 active:scale-95 touch-manipulation",
                isActive
                  ? "text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-7 rounded-full transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "bg-transparent text-muted-foreground"
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[58px]">
                {t(tab.label)}
              </span>
              {isActive && (
                <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}

        {/* Menu Drawer Trigger */}
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open Full Navigation Menu"
          className={cn(
            "relative flex flex-col items-center justify-center flex-1 py-1 px-1.5 rounded-xl transition-all duration-150 active:scale-95 touch-manipulation",
            isMenuOpen
              ? "text-primary font-semibold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <div
            className={cn(
              "flex items-center justify-center w-10 h-7 rounded-full transition-all duration-200",
              isMenuOpen
                ? "bg-primary/10 text-primary"
                : "bg-transparent text-muted-foreground"
            )}
          >
            <Menu className="w-5 h-5 shrink-0" />
          </div>
          <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[58px]">
            {t("Menu")}
          </span>
        </button>
      </div>
    </nav>
  );
}
