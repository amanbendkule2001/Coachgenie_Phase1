

"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

type Role = "owner" | "counselor" | "tutor" | "parent" | "student";

interface RbacGuardProps {
  allowed:  Role[];
  role?:    Role;
  children: React.ReactNode;
}

export function RbacGuard({ allowed, role, children }: RbacGuardProps) {
  const router = useRouter();

  useEffect(() => {
    if (!role || !allowed.includes(role)) {
      router.replace("/unauthorized");
    }
  }, [allowed, role, router]);

  if (!role || !allowed.includes(role)) return null;
  return <>{children}</>;
}
