"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, CalendarDays, CheckSquare,
  CreditCard, Settings, GraduationCap, ChevronLeft,
  UserPlus, FileCheck, BookOpen, ClipboardList, IndianRupee, Bell, Sparkles, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Brain } from "lucide-react";
import { useAuthStore, type UserRole } from "@/lib/stores/auth.store";
import { CoachGenieLogo } from "@/components/common/CoachGenieLogo";

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard, Users, CalendarDays, CheckSquare,
  CreditCard, Settings, GraduationCap, Brain,
  UserPlus, FileCheck, BookOpen, ClipboardList, IndianRupee, Bell, Sparkles, ExternalLink,
};

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard", external: false },
  { label: "Leads", href: "/leads", icon: "UserPlus", external: false },
  { label: "Admissions", href: "/admissions", icon: "FileCheck", external: false },
  { label: "Students", href: "/students", icon: "Users", external: false },
  { label: "Batches", href: "/batches", icon: "BookOpen", external: false },
  { label: "Exams", href: "/exams", icon: "ClipboardList", external: false },
  { label: "Sessions", href: "/sessions", icon: "CalendarDays", external: false },
  { label: "Attendance", href: "/attendance", icon: "CheckSquare", external: false },
  { label: "Attendance Reports", href: "/attendance/reports", icon: "ClipboardList", external: false },
  { label: "Fees", href: "/fees", icon: "IndianRupee", external: false },
  { label: "Growth Cards", href: "/growth-cards", icon: "Sparkles", external: false },
  { label: "Notifications", href: "/notifications", icon: "Bell", external: false },
  { label: "Billing", href: "/settings/billing", icon: "CreditCard", external: false },
  { label: "Settings", href: "/settings", icon: "Settings", external: false },
  { label: "AI Analytics", href: "/ai/analytics", icon: "Brain", external: false },
  { label: "Documentation", href: "/docs", icon: "BookOpen", external: false },
  { label: "Career Guidance", href: "https://career-guidence-topaz.vercel.app/", icon: "GraduationCap", external: true },
];

const MODULE_ROLES: Record<string, string[]> = {
  "/dashboard": ["owner", "super_admin", "admin", "counselor", "tutor", "coach"],
  "/leads": ["owner", "super_admin", "admin", "counselor"],
  "/admissions": ["owner", "super_admin", "admin", "counselor"],
  "/students": ["owner", "super_admin", "admin", "counselor", "tutor", "coach"],
  "/batches": ["owner", "super_admin", "admin", "counselor", "tutor", "coach"],
  "/exams": ["owner", "super_admin", "admin", "tutor", "coach"],
  "/sessions": ["owner", "super_admin", "admin", "tutor", "coach"],
  "/attendance": ["owner", "super_admin", "admin", "tutor", "coach"],
  "/attendance/reports": ["owner", "super_admin", "admin", "tutor", "coach"],
  "/fees": ["owner", "super_admin", "admin", "counselor"],
  "/growth-cards": ["owner", "super_admin", "admin", "counselor", "tutor", "coach"],
  "/notifications": ["owner", "super_admin", "admin", "counselor"],
  "/settings/billing": ["owner", "super_admin"],
  "/settings": ["owner", "super_admin", "admin"],
  "/ai/analytics": ["owner", "super_admin", "admin", "counselor", "tutor", "coach"],
  "/docs": ["owner", "super_admin", "admin", "counselor", "tutor", "coach"],
};

interface SidebarProps {
  collapsed: boolean;
  onCollapse: () => void;
}

export function Sidebar({ collapsed, onCollapse }: SidebarProps) {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const storeRole = useAuthStore((state) => state.role);

  // Normalize role (handle uppercase or lowercase)
  const rawRole = (user?.role || storeRole || "owner").toLowerCase();
  const normalizedRole = rawRole === "super_admin" ? "owner" : rawRole;

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.external) return true;
    const allowed = MODULE_ROLES[item.href];
    if (!allowed) return true;
    return allowed.includes(normalizedRole) || allowed.includes(rawRole);
  });

  // Find the single active item that has the longest matching href prefix
  const activeItemHref = visibleItems
    .filter((item) => !item.external && (pathname === item.href || pathname.startsWith(item.href + "/")))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <aside
      data-testid="sidebar"
      className={cn(
        "flex h-screen flex-col border-r bg-card transition-all duration-200 ease-in-out",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className="flex h-[3.75rem] items-center gap-2.5 border-b px-4">
        <CoachGenieLogo size="md" plain />
        {!collapsed && (
          <span className="font-bold tracking-tight text-sm truncate bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">CoachGenie</span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {visibleItems.map((item) => {
          const Icon = ICON_MAP[item.icon] ?? LayoutDashboard;
          const active = !item.external && item.href === activeItemHref;

          const commonClass = cn(
            "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            active
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          );

          if (item.external) {
            return (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                title={collapsed ? item.label : undefined}
                className={commonClass}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && (
                  <span className="truncate flex items-center gap-1">
                    {item.label}
                    <ExternalLink className="h-3 w-3 opacity-50" />
                  </span>
                )}
              </a>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={commonClass}
            >
              <Icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-2">
        <button data-testid="sidebar-collapse"
          onClick={onCollapse}
          className="flex w-full items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform duration-200", collapsed && "rotate-180")} />
        </button>
      </div>
    </aside>
  );
}
