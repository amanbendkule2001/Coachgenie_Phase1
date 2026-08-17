

"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { useAuthStore, type UserRole } from "@/lib/stores/auth.store";
import { DevAutoFill } from "@/components/dev/DevAutoFill";

const MODULE_ROLES: Record<string, UserRole[]> = {
  "/dashboard": ["owner", "counselor", "tutor"],
  "/leads": ["owner", "counselor"],
  "/admissions": ["owner", "counselor"],
  "/students": ["owner", "counselor", "tutor"],
  "/batches": ["owner", "counselor", "tutor"],
  "/exams": ["owner", "tutor"],
  "/sessions": ["owner", "tutor"],
  "/attendance": ["owner", "tutor"],
  "/billing": ["owner"],
  "/settings": ["owner"],
  "/fees": ["owner", "counselor"],
  "/growth-cards": ["owner", "counselor", "tutor"],
  "/notifications": ["owner", "counselor", "tutor"],
  "/ai": ["owner", "counselor", "tutor"],
};

function getAllowedRoles(pathname: string): UserRole[] {
  const match = Object.keys(MODULE_ROLES)
    .sort((a, b) => b.length - a.length)
    .find(
      (path) => pathname === path || pathname.startsWith(`${path}/`)
    );

  return match ? MODULE_ROLES[match] : ["owner"];
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, role, hydrated } = useAuthStore();

  const router = useRouter();
  const pathname = usePathname();

  /**
   * Wait until Zustand Persist has restored localStorage.
   * Otherwise user/role are temporarily null during hydration,
   * causing incorrect redirects.
   */
  useEffect(() => {
    if (!hydrated) return;

    if (!user) {
      router.replace("/login");
    }
  }, [hydrated, user, router]);

  /**
   * Role guard.
   */
  useEffect(() => {
    if (!hydrated) return;
    if (!user || !role) return;

    const allowed = getAllowedRoles(pathname);

    if (!allowed.includes(role)) {
      router.replace("/dashboard");
    }
  }, [hydrated, user, role, pathname, router]);

  /**
   * Show loader while auth state is restoring.
   */
  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  /**
   * Hydrated but unauthenticated.
   * Redirect effect above will run.
   */
  if (!user || !role) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const allowed = getAllowedRoles(pathname);

  if (!allowed.includes(role)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <AppShell>
      {children}
      <DevAutoFill />
    </AppShell>
  );
}