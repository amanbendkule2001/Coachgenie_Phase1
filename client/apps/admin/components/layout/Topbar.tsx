"use client";
import { useRouter, usePathname } from "next/navigation";
import {
  Bell, Search, LogOut, User, X,
  GraduationCap, BookOpen, ArrowRight, Loader2,
  UserPlus, FileCheck, ClipboardList, IndianRupee, Sparkles,
  Compass, ExternalLink, Settings, ArrowUpRight
} from "lucide-react";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/stores/auth.store";
import { api } from "@/lib/api";

const API = "/api/proxy";

function authHeaders(): HeadersInit {
  return { "Content-Type": "application/json" };
}

function safelyExtractArray(json: unknown): any[] {
  if (!json) return [];
  if (Array.isArray(json)) return json;
  if (typeof json === "object" && json !== null) {
    const obj = json as Record<string, any>;
    if (Array.isArray(obj.data)) return obj.data;
    if (obj.data && typeof obj.data === "object" && Array.isArray(obj.data.items)) return obj.data.items;
    if (Array.isArray(obj.items)) return obj.items;
  }
  return [];
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface InboxNotification {
  id:         string;
  title:      string;
  body?:      string | null;
  icon?:      string | null;
  link?:      string | null;
  is_read:    boolean;
  created_at: string | null;
}

export type SearchCategory = "all" | "page" | "student" | "lead" | "admission" | "batch" | "exam" | "fee";

export interface SearchResult {
  id:        string;
  type:      "page" | "lead" | "student" | "admission" | "batch" | "exam" | "fee";
  title:     string;
  subtitle:  string;
  link:      string;
  badge?:    string;
  external?: boolean;
}

export const TYPE_CONFIG: Record<
  SearchResult["type"],
  { label: string; icon: React.ElementType; color: string; bg: string; border: string }
> = {
  page:      { label: "Page",       icon: Compass,        color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/60", border: "border-indigo-200 dark:border-indigo-800" },
  student:   { label: "Student",    icon: GraduationCap,  color: "text-blue-600 dark:text-blue-400",    bg: "bg-blue-50 dark:bg-blue-950/60",    border: "border-blue-200 dark:border-blue-800"    },
  lead:      { label: "Lead",       icon: UserPlus,       color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/60", border: "border-violet-200 dark:border-violet-800"  },
  admission: { label: "Admission",  icon: FileCheck,      color: "text-emerald-600 dark:text-emerald-400",bg: "bg-emerald-50 dark:bg-emerald-950/60",border: "border-emerald-200 dark:border-emerald-800"},
  batch:     { label: "Batch",      icon: BookOpen,       color: "text-amber-600 dark:text-amber-400",   bg: "bg-amber-50 dark:bg-amber-950/60",   border: "border-amber-200 dark:border-amber-800"   },
  exam:      { label: "Exam",       icon: ClipboardList,  color: "text-fuchsia-600 dark:text-fuchsia-400",bg: "bg-fuchsia-50 dark:bg-fuchsia-950/60",border: "border-fuchsia-200 dark:border-fuchsia-800"},
  fee:       { label: "Invoice",    icon: IndianRupee,    color: "text-rose-600 dark:text-rose-400",    bg: "bg-rose-50 dark:bg-rose-950/60",    border: "border-rose-200 dark:border-rose-800"    },
};

export const DASHBOARD_PAGES: Array<{
  title: string;
  subtitle: string;
  link: string;
  keywords: string[];
  external?: boolean;
}> = [
  { title: "Dashboard Overview", subtitle: "Key performance metrics, KPIs & quick action panels", link: "/dashboard", keywords: ["home", "main", "overview", "kpi", "summary", "stats"] },
  { title: "Leads & Enquiries Pipeline", subtitle: "Inquiry CRM funnel, demo bookings & conversions", link: "/leads", keywords: ["leads", "inquiries", "crm", "funnel", "prospects", "admissions pipeline", "conversion"] },
  { title: "Admissions & Enrollments", subtitle: "Student applications, admission numbers & status", link: "/admissions", keywords: ["admissions", "enrollments", "applications", "enrolled", "admit"] },
  { title: "Students Directory", subtitle: "Student profiles, contact info, batch assignments", link: "/students", keywords: ["students", "pupils", "directory", "profiles", "members", "enrollment"] },
  { title: "Batches & Courses", subtitle: "Batch schedules, subjects & syllabus tracking", link: "/batches", keywords: ["batches", "courses", "classes", "subjects", "syllabus", "timings"] },
  { title: "Exams & Results", subtitle: "Exam schedules, marks entry & student performance", link: "/exams", keywords: ["exams", "tests", "results", "marks", "scores", "grades", "evaluation"] },
  { title: "Live & Class Sessions", subtitle: "Daily schedule, upcoming lectures & online links", link: "/sessions", keywords: ["sessions", "timetable", "classes", "schedule", "calendar", "lectures"] },
  { title: "Attendance Tracker", subtitle: "Daily attendance marking & session records", link: "/attendance", keywords: ["attendance", "present", "absent", "checkin", "marking", "rollcall"] },
  { title: "Attendance Reports", subtitle: "Monthly attendance trends, defaulters & metrics", link: "/attendance/reports", keywords: ["attendance reports", "trends", "defaulters", "absence", "analytics"] },
  { title: "Fee Management & Invoices", subtitle: "Fee collection, pending dues & payment receipts", link: "/fees", keywords: ["fees", "invoices", "payments", "receipts", "billing", "revenue", "money", "dues"] },
  { title: "Fee Structures", subtitle: "Configured fee schemes & batch pricing templates", link: "/fees/structures", keywords: ["fee structures", "pricing", "plans", "installments", "tuition"] },
  { title: "Growth Cards", subtitle: "AI student scorecards & performance analysis", link: "/growth-cards", keywords: ["growth cards", "progress", "scorecard", "ai performance", "report card"] },
  { title: "AI Analytics & Insights", subtitle: "AI-powered batch performance & retention analytics", link: "/ai/analytics", keywords: ["ai", "analytics", "insights", "retention", "charts", "predictions"] },
  { title: "System Notifications", subtitle: "Announcements, activity logs & alerts", link: "/notifications", keywords: ["notifications", "alerts", "inbox", "updates", "announcements"] },
  { title: "Billing & Subscriptions", subtitle: "CoachGenie plan, invoices & subscription info", link: "/settings/billing", keywords: ["billing", "subscription", "plan", "upgrade", "license", "tier"] },
  { title: "Institution Settings", subtitle: "General settings, tenant profile & configuration", link: "/settings", keywords: ["settings", "preferences", "config", "tenant", "institution", "organization"] },
  { title: "Documentation & Guides", subtitle: "User manuals, workflows & documentation", link: "/docs", keywords: ["docs", "help", "documentation", "guide", "manual", "support", "faq"] },
  { title: "My User Profile", subtitle: "Personal details, security & account settings", link: "/profile", keywords: ["profile", "account", "user", "me", "password", "email"] },
  { title: "Career Guidance Portal", subtitle: "AI-driven student career counselling & assessment", link: "https://career-guidence-topaz.vercel.app/", keywords: ["career", "guidance", "counselling", "future", "assessment"], external: true },
];

interface TopbarProps {
  sidebarCollapsed: boolean;
}

export function Topbar({ sidebarCollapsed: _ }: TopbarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [menuOpen,        setMenuOpen]        = useState(false);
  const [notifOpen,       setNotifOpen]       = useState(false);
  const [searchVal,       setSearchVal]       = useState("");
  const [searchResults,   setSearchResults]   = useState<SearchResult[]>([]);
  const [searchLoading,   setSearchLoading]   = useState(false);
  const [searchOpen,      setSearchOpen]      = useState(false);
  const [activeCategory,  setActiveCategory]  = useState<SearchCategory>("all");
  const [selectedIndex,   setSelectedIndex]   = useState<number>(-1);
  const [notifications,   setNotifications]   = useState<InboxNotification[]>([]);
  const [notifLoading,    setNotifLoading]    = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const listContainerRef = useRef<HTMLDivElement | null>(null);

  const user      = useAuthStore((s) => s.user);
  const userName  = user?.first_name  ?? user?.email ?? "User";
  const userEmail = user?.email ?? "";
  const initials  = userName
    .split(" ")
    .map((w: string) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // ── Auto-clear search on navigation / route changes ──────────────────────
  useEffect(() => {
    setSearchOpen(false);
    setSearchVal("");
    setSearchResults([]);
    setSelectedIndex(-1);
  }, [pathname]);

  // ── Auto-clear search when clicking ANY other side of the website ─────────
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setSearchOpen(false);
        setSearchVal("");
        setSearchResults([]);
        setSelectedIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // ── Global Keyboard Shortcut (⌘K or Ctrl+K) ──────────────────────────────
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // ── Fetch notifications ──────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    setNotifLoading(true);
    try {
      const res = await fetch(`${API}/notifications/inbox`, { headers: authHeaders() });
      if (!res.ok) return;
      const json = await res.json();
      setNotifications(safelyExtractArray(json));
    } catch (_e) {
      // silent
    } finally {
      setNotifLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // ── Mark one as read ─────────────────────────────────────────────────────
  async function markRead(id: string) {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
    try {
      await fetch(`${API}/notifications/inbox/${id}/read`, {
        method:  "PATCH",
        headers: authHeaders(),
      });
    } catch (_e) {
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: false } : n)
      );
    }
  }

  // ── Mark all as read ─────────────────────────────────────────────────────
  async function markAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    try {
      await fetch(`${API}/notifications/inbox/read-all`, {
        method:  "POST",
        headers: authHeaders(),
      });
    } catch (_e) {
      fetchNotifications();
    }
  }

  // ── Logout ───────────────────────────────────────────────────────────────
  async function handleLogout() {
    const { refreshToken, clear } = useAuthStore.getState();
    try {
      if (refreshToken) {
        await api.post("/auth/logout", { refresh_token: refreshToken });
      }
    } catch (err) {
      console.error("Logout API failed:", err);
    }
    // Clear auth store state immediately
    clear();
    // Remove persisted user data from localStorage so the login page
    // never briefly shows the previous user's name/email on rehydration
    if (typeof window !== "undefined") {
      localStorage.removeItem("coachgenie-ui");
    }
    await fetch("/api/auth/session", { method: "DELETE" });
    window.location.href = "/login";
  }

  // ── Search Algorithm Across Dashboard ────────────────────────────────────
  const runSearch = useCallback(async (q: string) => {
    const query = q.trim();
    if (!query) {
      setSearchResults([]);
      setSearchOpen(false);
      setSelectedIndex(-1);
      return;
    }

    setSearchLoading(true);
    setSearchOpen(true);
    setSelectedIndex(0);

    const q_lower = query.toLowerCase();
    const collected: SearchResult[] = [];

    // 1. Match Navigation Pages & Actions instantly
    DASHBOARD_PAGES.forEach((page, idx) => {
      const matchTitle = page.title.toLowerCase().includes(q_lower);
      const matchSubtitle = page.subtitle.toLowerCase().includes(q_lower);
      const matchKeywords = page.keywords.some((k) => k.includes(q_lower) || q_lower.includes(k));
      if (matchTitle || matchSubtitle || matchKeywords) {
        collected.push({
          id: `page-${idx}`,
          type: "page",
          title: page.title,
          subtitle: page.subtitle,
          link: page.link,
          external: page.external,
          badge: page.external ? "External" : "Page",
        });
      }
    });

    // 2. Fetch Data from Backend endpoints with error isolation
    const endpointPromises = [
      // Leads
      fetch(`${API}/leads?search=${encodeURIComponent(query)}&limit=6`, { headers: authHeaders() })
        .then(r => r.ok ? r.json() : null)
        .then(json => {
          const items = safelyExtractArray(json);
          items.slice(0, 5).forEach((l: any) => {
            const name = l.full_name ?? l.name ?? "Lead";
            const sub = [l.phone, l.email, l.applied_course].filter(Boolean).join(" · ") || "Lead Enquiry";
            collected.push({
              id: l.id ?? `lead-${Math.random()}`,
              type: "lead",
              title: name,
              subtitle: sub,
              link: `/leads/${l.id}`,
              badge: (l.status ?? "Lead").toUpperCase().replace(/_/g, " "),
            });
          });
        })
        .catch(() => {}),

      // Students
      fetch(`${API}/students?search=${encodeURIComponent(query)}&limit=6`, { headers: authHeaders() })
        .then(r => r.ok ? r.json() : null)
        .then(json => {
          const items = safelyExtractArray(json);
          items.slice(0, 5).forEach((s: any) => {
            const name = s.full_name ?? (`${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || "Student");
            const sub = [s.enrollment_no, s.current_class ? `Class ${s.current_class}` : null, s.phone].filter(Boolean).join(" · ") || "Student Profile";
            collected.push({
              id: s.id ?? `student-${Math.random()}`,
              type: "student",
              title: name,
              subtitle: sub,
              link: `/students/${s.id}`,
              badge: s.enrollment_no ?? "Student",
            });
          });
        })
        .catch(() => {}),

      // Admissions
      fetch(`${API}/admissions?limit=40`, { headers: authHeaders() })
        .then(r => r.ok ? r.json() : null)
        .then(json => {
          const items = safelyExtractArray(json);
          items
            .filter((a: any) => {
              const name = (a.student_name ?? a.studentName ?? "").toLowerCase();
              const admNo = (a.admission_number ?? "").toLowerCase();
              const course = (a.applied_course ?? "").toLowerCase();
              return name.includes(q_lower) || admNo.includes(q_lower) || course.includes(q_lower);
            })
            .slice(0, 4)
            .forEach((a: any) => {
              collected.push({
                id: a.id ?? `admission-${Math.random()}`,
                type: "admission",
                title: a.student_name ?? a.studentName ?? "Admission",
                subtitle: [a.admission_number, a.applied_course, a.status].filter(Boolean).join(" · ") || "Admission Record",
                link: `/admissions/${a.id}`,
                badge: a.admission_number ?? a.status ?? "Admission",
              });
            });
        })
        .catch(() => {}),

      // Batches
      fetch(`${API}/batches?limit=40`, { headers: authHeaders() })
        .then(r => r.ok ? r.json() : null)
        .then(json => {
          const items = safelyExtractArray(json);
          items
            .filter((b: any) => {
              const name = (b.name ?? "").toLowerCase();
              const subj = (b.subject ?? "").toLowerCase();
              const exam = (b.target_exam ?? "").toLowerCase();
              return name.includes(q_lower) || subj.includes(q_lower) || exam.includes(q_lower);
            })
            .slice(0, 4)
            .forEach((b: any) => {
              collected.push({
                id: b.id ?? `batch-${Math.random()}`,
                type: "batch",
                title: b.name ?? "Batch",
                subtitle: [b.subject, b.target_exam, `${b.student_count ?? 0} students`].filter(Boolean).join(" · ") || "Course Batch",
                link: `/batches/${b.id}`,
                badge: b.subject ?? "Batch",
              });
            });
        })
        .catch(() => {}),

      // Exams
      fetch(`${API}/exams?limit=40`, { headers: authHeaders() })
        .then(r => r.ok ? r.json() : null)
        .then(json => {
          const items = safelyExtractArray(json);
          items
            .filter((e: any) => {
              const title = (e.title ?? e.name ?? "").toLowerCase();
              const subj = (e.subject_name ?? "").toLowerCase();
              return title.includes(q_lower) || subj.includes(q_lower);
            })
            .slice(0, 3)
            .forEach((e: any) => {
              collected.push({
                id: e.id ?? `exam-${Math.random()}`,
                type: "exam",
                title: e.title ?? e.name ?? "Exam",
                subtitle: [e.subject_name, e.total_marks ? `Max Marks: ${e.total_marks}` : null, e.date].filter(Boolean).join(" · ") || "Exam Details",
                link: `/exams`,
                badge: "Exam",
              });
            });
        })
        .catch(() => {}),

      // Fees / Invoices
      fetch(`${API}/fees/invoices`, { headers: authHeaders() })
        .then(r => r.ok ? r.json() : null)
        .then(json => {
          const items = safelyExtractArray(json);
          items
            .filter((f: any) => {
              const name = (f.student_name ?? "").toLowerCase();
              const invNo = (f.invoice_no ?? "").toLowerCase();
              const status = (f.status ?? "").toLowerCase();
              return name.includes(q_lower) || invNo.includes(q_lower) || status.includes(q_lower);
            })
            .slice(0, 3)
            .forEach((f: any) => {
              const formattedAmt = f.amount_due ? `₹${parseFloat(f.amount_due).toLocaleString("en-IN")}` : "";
              collected.push({
                id: f.id ?? `fee-${Math.random()}`,
                type: "fee",
                title: f.invoice_no ? `Invoice ${f.invoice_no}` : "Fee Invoice",
                subtitle: [f.student_name, f.status, formattedAmt].filter(Boolean).join(" · ") || "Fee Record",
                link: `/fees/${f.id}`,
                badge: (f.status ?? "Invoice").toUpperCase(),
              });
            });
        })
        .catch(() => {}),
    ];

    await Promise.allSettled(endpointPromises);

    setSearchResults(collected);
    setSearchLoading(false);
  }, []);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setSearchVal(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(val), 250);
  }

  const filteredResults = useMemo(() => {
    if (activeCategory === "all") return searchResults;
    return searchResults.filter((r) => r.type === activeCategory);
  }, [searchResults, activeCategory]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: searchResults.length };
    searchResults.forEach((r) => {
      counts[r.type] = (counts[r.type] || 0) + 1;
    });
    return counts;
  }, [searchResults]);

  function handleResultClick(result: SearchResult) {
    setSearchOpen(false);
    setSearchVal("");
    setSearchResults([]);
    setSelectedIndex(-1);

    if (result.external) {
      window.open(result.link, "_blank", "noopener,noreferrer");
    } else {
      router.push(result.link);
    }
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (filteredResults.length === 0) return;
      setSelectedIndex((prev) => (prev + 1) % filteredResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (filteredResults.length === 0) return;
      setSelectedIndex((prev) => (prev - 1 + filteredResults.length) % filteredResults.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < filteredResults.length) {
        handleResultClick(filteredResults[selectedIndex]);
      } else if (searchVal.trim()) {
        const query = searchVal.trim();
        setSearchOpen(false);
        setSearchVal("");
        setSearchResults([]);
        setSelectedIndex(-1);
        router.push(`/search?q=${encodeURIComponent(query)}`);
      }
    } else if (e.key === "Escape") {
      setSearchOpen(false);
      setSearchVal("");
      setSearchResults([]);
      setSelectedIndex(-1);
      searchInputRef.current?.blur();
    }
  }

  function clearSearch() {
    setSearchVal("");
    setSearchResults([]);
    setSearchOpen(false);
    setSelectedIndex(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    searchInputRef.current?.focus();
  }

  // ── Time formatter ───────────────────────────────────────────────────────
  function timeAgo(dateStr: string | null): string {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins  = Math.floor(diff / 60_000);
    const hours = Math.floor(diff / 3_600_000);
    const days  = Math.floor(diff / 86_400_000);
    if (mins  < 1)  return "just now";
    if (mins  < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  return (
    <div data-testid="topbar" className="flex w-full items-center gap-3">

      {/* Global Search Bar Container */}
      <div ref={searchContainerRef} className="relative flex-1 max-w-md lg:max-w-lg">
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-xl border px-3.5 py-2 shadow-xs transition-all duration-200 bg-card text-card-foreground",
            searchOpen
              ? "border-primary ring-2 ring-primary/20 shadow-md"
              : "border-border hover:border-border/80 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20"
          )}
        >
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={searchInputRef}
            value={searchVal}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyDown}
            onFocus={() => {
              if (searchVal.trim()) {
                setSearchOpen(true);
              }
            }}
            placeholder="Search students, leads, batches... (⌘K)"
            className="flex-1 bg-transparent text-xs sm:text-sm outline-none placeholder:text-muted-foreground/80 min-w-0 text-foreground"
          />

          {searchLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
          )}

          {!searchLoading && searchVal && (
            <button
              onClick={clearSearch}
              className="rounded-md p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground shrink-0 transition-colors"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}

          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground shadow-none">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>

        {/* Search Results Command Palette Dropdown */}
        {searchOpen && (
          <>
            {/* Backdrop Overlay to dim background content and clear search on outside click */}
            <div
              className="fixed inset-0 z-[90] bg-black/30 dark:bg-black/60 transition-opacity"
              onClick={() => {
                setSearchOpen(false);
                setSearchVal("");
                setSearchResults([]);
                setSelectedIndex(-1);
              }}
            />

            {/* Solid, Fully Opaque Search Modal / Dropdown */}
            <div
              className="fixed left-3 right-3 top-16 sm:absolute sm:left-0 sm:right-auto sm:top-12 z-[100] sm:w-full sm:min-w-[460px] md:min-w-[560px] max-w-[calc(100vw-1.5rem)] sm:max-w-[620px] rounded-2xl border border-border bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150 ring-1 ring-black/10 dark:ring-white/10"
              style={{ backgroundColor: "var(--card, #ffffff)", opacity: 1 }}
            >
              {/* Category Filter Tabs Header */}
              {searchResults.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto px-3 pt-3 pb-2.5 border-b border-border bg-zinc-50 dark:bg-zinc-800 scrollbar-none">
                  {(
                    [
                      { id: "all", label: "All" },
                      { id: "page", label: "Pages" },
                      { id: "student", label: "Students" },
                      { id: "lead", label: "Leads" },
                      { id: "admission", label: "Admissions" },
                      { id: "batch", label: "Batches" },
                      { id: "exam", label: "Exams" },
                      { id: "fee", label: "Invoices" },
                    ] as const
                  ).map((cat) => {
                    const count = categoryCounts[cat.id] || 0;
                    if (cat.id !== "all" && count === 0) return null;
                    const isActive = activeCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveCategory(cat.id);
                          setSelectedIndex(0);
                        }}
                        className={cn(
                          "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all whitespace-nowrap",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "bg-white dark:bg-zinc-900 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/70"
                        )}
                      >
                        <span>{cat.label}</span>
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                            isActive
                              ? "bg-primary-foreground/20 text-primary-foreground"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Body Content with 100% Solid Background */}
              <div
                ref={listContainerRef}
                className="max-h-[380px] overflow-y-auto divide-y divide-border bg-white dark:bg-zinc-900"
              >
                {searchLoading ? (
                  <div className="space-y-3 p-4">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 rounded-xl p-3 bg-muted/60 animate-pulse"
                      >
                        <div className="h-9 w-9 rounded-xl bg-muted shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-1/3 bg-muted rounded" />
                          <div className="h-3 w-1/2 bg-muted rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredResults.length === 0 ? (
                  <div className="px-6 py-10 text-center bg-white dark:bg-zinc-900">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 mb-3 text-muted-foreground">
                      <Search className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      No results found for &ldquo;{searchVal}&rdquo;
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                      Try searching for student names, leads, batches, exam names, invoice numbers, or page names like &quot;fees&quot; or &quot;settings&quot;.
                    </p>
                  </div>
                ) : (
                  <div className="p-1.5 space-y-1 bg-white dark:bg-zinc-900">
                    {filteredResults.map((result, idx) => {
                      const cfg = TYPE_CONFIG[result.type];
                      const Icon = cfg.icon;
                      const isSelected = selectedIndex === idx;

                      return (
                        <button
                          key={`${result.type}-${result.id}`}
                          onClick={() => handleResultClick(result)}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all group bg-white dark:bg-zinc-900",
                            isSelected
                              ? "bg-primary/10 dark:bg-primary/15 border-l-4 border-primary pl-2.5 shadow-xs"
                              : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          )}
                        >
                          <div
                            className={cn(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-150 group-hover:scale-105",
                              cfg.bg
                            )}
                          >
                            <Icon className={cn("h-4.5 w-4.5", cfg.color)} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-foreground truncate">
                                {result.title}
                              </p>
                              {result.external && (
                                <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {result.subtitle}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {result.badge && (
                              <span
                                className={cn(
                                  "rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
                                  cfg.color,
                                  cfg.bg,
                                  cfg.border
                                )}
                              >
                                {result.badge}
                              </span>
                            )}
                            <ArrowRight
                              className={cn(
                                "h-4 w-4 transition-transform duration-150",
                                isSelected
                                  ? "text-primary translate-x-0.5"
                                  : "text-muted-foreground/40 group-hover:text-muted-foreground"
                              )}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Dropdown Footer with 100% Solid Background */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border-t border-border text-xs text-muted-foreground">
                <div className="hidden sm:flex items-center gap-3 text-[11px]">
                  <span className="inline-flex items-center gap-1">
                    <kbd className="rounded border bg-white dark:bg-zinc-900 px-1 py-0.5 font-mono text-[9px] shadow-2xs">↑</kbd>
                    <kbd className="rounded border bg-white dark:bg-zinc-900 px-1 py-0.5 font-mono text-[9px] shadow-2xs">↓</kbd>
                    <span>navigate</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <kbd className="rounded border bg-white dark:bg-zinc-900 px-1.5 py-0.5 font-mono text-[9px] shadow-2xs">↵</kbd>
                    <span>select</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <kbd className="rounded border bg-white dark:bg-zinc-900 px-1 py-0.5 font-mono text-[9px] shadow-2xs">esc</kbd>
                    <span>close</span>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const query = searchVal.trim();
                    setSearchOpen(false);
                    setSearchVal("");
                    setSearchResults([]);
                    setSelectedIndex(-1);
                    router.push(`/search?q=${encodeURIComponent(query)}`);
                  }}
                  className="ml-auto flex items-center gap-1 text-xs font-semibold text-primary hover:underline hover:text-primary/90 transition-colors"
                >
                  <span>View all results</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Right Actions (Notifications & User Avatar) */}
      <div className="ml-auto flex items-center gap-1.5">

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => { setNotifOpen(v => !v); setMenuOpen(false); }}
            aria-label="View notifications"
            className="relative rounded-xl p-2.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Bell className="h-4.5 w-4.5" />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white shadow-xs">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <>
              <div className="fixed inset-0 z-[90] bg-black/20 dark:bg-black/40" onClick={() => setNotifOpen(false)} />
              <div
                className="absolute right-0 top-12 z-[100] w-[calc(100vw-2rem)] sm:w-84 max-w-[360px] rounded-2xl border border-border bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden ring-1 ring-black/10 dark:ring-white/10"
                onClick={e => e.stopPropagation()}
                style={{ backgroundColor: "var(--card, #ffffff)", opacity: 1 }}
              >
                <div className="flex items-center justify-between px-4 py-3.5 border-b border-border bg-zinc-50 dark:bg-zinc-800">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold">Notifications</p>
                  </div>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      {unreadCount} unread
                    </span>
                  )}
                </div>

                <div className="divide-y divide-border max-h-80 overflow-y-auto bg-white dark:bg-zinc-900">
                  {notifLoading ? (
                    <div className="space-y-2.5 p-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-12 rounded-xl bg-muted/60 animate-pulse" />
                      ))}
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="px-4 py-10 text-center text-muted-foreground bg-white dark:bg-zinc-900">
                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm font-medium">No notifications yet</p>
                      <p className="text-xs mt-0.5">We will notify you about important updates here</p>
                    </div>
                  ) : notifications.map(n => (
                    <button
                      key={n.id}
                      onClick={() => {
                        markRead(n.id);
                        if (n.link) { setNotifOpen(false); router.push(n.link); }
                      }}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800",
                        !n.is_read && "bg-primary/5 font-medium"
                      )}
                    >
                      <span className={cn(
                        "mt-1.5 h-2 w-2 shrink-0 rounded-full transition-colors",
                        !n.is_read ? "bg-primary" : "bg-transparent"
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm truncate", !n.is_read ? "font-semibold text-foreground" : "text-foreground/90")}>
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground/80 mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {unreadCount > 0 && (
                  <div className="border-t border-border bg-zinc-50 dark:bg-zinc-800 px-4 py-2.5 text-center">
                    <button
                      onClick={markAllRead}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Mark all notifications as read
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* User Account Menu */}
        <div className="relative">
          <button
            onClick={() => { setMenuOpen(v => !v); setNotifOpen(false); }}
            aria-label="User account and profile menu"
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white text-xs font-extrabold shadow-sm hover:opacity-95 hover:scale-105 active:scale-95 transition-all cursor-pointer ring-2 ring-primary/20",
              menuOpen && "ring-primary"
            )}
            title={userName}
          >
            {initials}
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-[90] bg-black/30 backdrop-blur-[2px]" onClick={() => setMenuOpen(false)} />
              <div
                className="absolute right-0 top-12 z-[100] w-60 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden p-2 ring-1 ring-black/5 dark:ring-white/10 animate-in fade-in zoom-in-95 duration-150"
                onClick={e => e.stopPropagation()}
              >
                <div className="px-3.5 py-3 border-b border-border/60 bg-muted/30 rounded-xl mb-1.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-foreground truncate">{userName}</p>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {user?.role || "Admin"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                </div>

                <div className="space-y-0.5">
                  <button
                    onClick={() => { setMenuOpen(false); router.push("/profile"); }}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all cursor-pointer",
                      pathname === "/profile"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-foreground hover:bg-accent"
                    )}
                  >
                    <User className="h-4 w-4 shrink-0" />
                    <span>My Profile</span>
                  </button>

                  <button
                    onClick={() => { setMenuOpen(false); router.push("/settings"); }}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all cursor-pointer",
                      pathname === "/settings"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-foreground hover:bg-accent"
                    )}
                  >
                    <Settings className="h-4 w-4 shrink-0" />
                    <span>Institute Settings</span>
                  </button>
                </div>

                <div className="my-1.5 border-t border-border/60" />

                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span>Sign out</span>
                </button>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
