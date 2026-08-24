"use client";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { LanguageProvider } from "@/components/providers/LanguageProvider";
import { PWAInstallBanner } from "@/components/common/PWAInstallBanner";

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 1000 * 60 * 5, retry: 2, refetchOnWindowFocus: false },
        },
      })
  );

  return (
    <QueryClientProvider client={qc}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <LanguageProvider>
          {children}
          <PWAInstallBanner />
          <Toaster richColors position="top-right" />
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
