"use client";
import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search, User, Users, GraduationCap, BookOpen, Receipt, ArrowRight,
  Loader2, UserPlus, FileCheck, ClipboardList, IndianRupee, Sparkles,
  Compass, ExternalLink, Filter, ArrowUpRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DASHBOARD_PAGES,
  TYPE_CONFIG,
  type SearchResult,
  type SearchCategory
} from "@/components/layout/Topbar";

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

const CATEGORY_TABS: Array<{ id: SearchCategory; label: string }> = [
  { id: "all", label: "All Results" },
  { id: "page", label: "Pages & Navigation" },
  { id: "student", label: "Students" },
  { id: "lead", label: "Leads" },
  { id: "admission", label: "Admissions" },
  { id: "batch", label: "Batches" },
  { id: "exam", label: "Exams" },
  { id: "fee", label: "Invoices" },
];

function SearchContent() {
  const searchParams  = useSearchParams();
  const router        = useRouter();
  const initialQuery  = searchParams.get("q") ?? "";

  const [query,    setQuery]    = useState(initialQuery);
  const [results,  setResults]  = useState<SearchResult[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [searched, setSearched] = useState(false);
  const [filter,   setFilter]   = useState<SearchCategory>("all");

  const search = useCallback(async (q: string) => {
    const term = q.trim();
    if (!term) return;
    setLoading(true);
    setSearched(true);

    const q_lower = term.toLowerCase();
    const collected: SearchResult[] = [];

    // 1. Pages & Navigation shortcuts
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

    // 2. Fetch all entity records in parallel with isolated error handling
    await Promise.allSettled([
      // Leads
      fetch(`${API}/leads?search=${encodeURIComponent(term)}&limit=15`, { headers: authHeaders() })
        .then(r => r.ok ? r.json() : null)
        .then(json => {
          const items = safelyExtractArray(json);
          items.forEach((l: any) => {
            collected.push({
              id: l.id ?? `lead-${Math.random()}`,
              type: "lead",
              title: l.full_name ?? l.name ?? "Lead",
              subtitle: [l.phone, l.email, l.applied_course, l.source].filter(Boolean).join(" · ") || "Lead Enquiry",
              link: `/leads/${l.id}`,
              badge: (l.status ?? "Lead").toUpperCase().replace(/_/g, " "),
            });
          });
        })
        .catch(() => {}),

      // Students
      fetch(`${API}/students?search=${encodeURIComponent(term)}&limit=15`, { headers: authHeaders() })
        .then(r => r.ok ? r.json() : null)
        .then(json => {
          const items = safelyExtractArray(json);
          items.forEach((s: any) => {
            const name = s.full_name ?? (`${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || "Student");
            collected.push({
              id: s.id ?? `student-${Math.random()}`,
              type: "student",
              title: name,
              subtitle: [s.enrollment_no, s.current_class ? `Class ${s.current_class}` : null, s.email, s.phone].filter(Boolean).join(" · ") || "Student Profile",
              link: `/students/${s.id}`,
              badge: s.enrollment_no ?? "Student",
            });
          });
        })
        .catch(() => {}),

      // Admissions
      fetch(`${API}/admissions?limit=60`, { headers: authHeaders() })
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
            .slice(0, 15)
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
      fetch(`${API}/batches?limit=60`, { headers: authHeaders() })
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
            .slice(0, 15)
            .forEach((b: any) => {
              collected.push({
                id: b.id ?? `batch-${Math.random()}`,
                type: "batch",
                title: b.name ?? "Batch",
                subtitle: [b.subject, b.target_exam, b.schedule, `${b.student_count ?? 0} students`].filter(Boolean).join(" · ") || "Course Batch",
                link: `/batches/${b.id}`,
                badge: b.subject ?? "Batch",
              });
            });
        })
        .catch(() => {}),

      // Exams
      fetch(`${API}/exams?limit=60`, { headers: authHeaders() })
        .then(r => r.ok ? r.json() : null)
        .then(json => {
          const items = safelyExtractArray(json);
          items
            .filter((e: any) => {
              const title = (e.title ?? e.name ?? "").toLowerCase();
              const subj = (e.subject_name ?? "").toLowerCase();
              return title.includes(q_lower) || subj.includes(q_lower);
            })
            .slice(0, 15)
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

      // Fees
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
            .slice(0, 15)
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
    ]);

    setResults(collected);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      search(initialQuery);
    }
  }, [initialQuery, search]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      search(query);
    }
  }

  function handleCardClick(result: SearchResult) {
    if (result.external) {
      window.open(result.link, "_blank", "noopener,noreferrer");
    } else {
      router.push(result.link);
    }
  }

  const filtered = useMemo(() => {
    if (filter === "all") return results;
    return results.filter(r => r.type === filter);
  }, [results, filter]);

  const countByType = (type: SearchCategory) => {
    if (type === "all") return results.length;
    return results.filter(r => r.type === type).length;
  };

  const SUGGESTED_QUERIES = [
    "Students", "Leads", "Batches", "Exams", "Invoices", "Attendance", "Billing", "Settings"
  ];

  return (
    <div className="space-y-6 max-w-5xl">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Search Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Find students, leads, admissions, batches, exams, invoices, or jump directly to any page.
        </p>
      </div>

      {/* Search Input Bar */}
      <div className="flex items-center gap-3 rounded-2xl border bg-background px-4 py-3.5 shadow-sm focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-all">
        <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search by student name, phone, lead, batch, invoice number, or feature..."
          className="flex-1 bg-transparent text-sm md:text-base outline-none placeholder:text-muted-foreground"
        />
        {loading && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
        {!loading && query && (
          <button
            onClick={() => {
              if (query.trim()) {
                router.push(`/search?q=${encodeURIComponent(query.trim())}`);
                search(query);
              }
            }}
            className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
          >
            Search
          </button>
        )}
      </div>

      {/* Filter Category Tabs */}
      {searched && results.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {CATEGORY_TABS.map(tab => {
            const count = countByType(tab.id);
            if (tab.id !== "all" && count === 0) return null;
            const isActive = filter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all border",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-background text-muted-foreground hover:bg-accent hover:text-foreground border-border"
                )}
              >
                <span>{tab.label}</span>
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

      {/* Loading State */}
      {loading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-muted/60 animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty State / Initial Suggestions */}
      {!loading && !searched && (
        <div className="rounded-3xl border border-dashed p-8 md:p-12 text-center bg-muted/10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
            <Compass className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">What would you like to find?</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Search across your entire coaching institution database or click a quick category shortcut below:
          </p>

          <div className="flex flex-wrap justify-center gap-2 mt-6 max-w-xl mx-auto">
            {SUGGESTED_QUERIES.map((q) => (
              <button
                key={q}
                onClick={() => {
                  setQuery(q);
                  router.push(`/search?q=${encodeURIComponent(q)}`);
                  search(q);
                }}
                className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary/50 hover:text-foreground hover:bg-accent transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No Results Found */}
      {!loading && searched && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed py-16 text-center bg-muted/10">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Search className="h-7 w-7 opacity-40" />
          </div>
          <h2 className="text-base font-semibold text-foreground">No matches found for &ldquo;{query}&rdquo;</h2>
          <p className="text-xs text-muted-foreground max-w-sm">
            Check the spelling or try searching for a broader term like a student&apos;s first name, batch title, or invoice number.
          </p>
        </div>
      )}

      {/* Results List */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground px-1 font-medium">
            Showing {filtered.length} result{filtered.length === 1 ? "" : "s"}
          </div>

          {filtered.map(result => {
            const cfg  = TYPE_CONFIG[result.type];
            const Icon = cfg.icon;
            return (
              <button
                key={`${result.type}-${result.id}`}
                onClick={() => handleCardClick(result)}
                className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left shadow-xs hover:shadow-md hover:border-primary/30 transition-all group"
              >
                <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:scale-105", cfg.bg)}>
                  <Icon className={cn("h-6 w-6", cfg.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm md:text-base font-bold text-foreground truncate">{result.title}</p>
                    {result.external && (
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                  </div>
                  <p className="text-xs md:text-sm text-muted-foreground truncate mt-0.5">{result.subtitle}</p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  {result.badge && (
                    <span className={cn(
                      "hidden sm:inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold tracking-wide uppercase",
                      cfg.color, cfg.bg, cfg.border
                    )}>
                      {result.badge}
                    </span>
                  )}
                  <span className={cn(
                    "text-xs font-semibold rounded-lg px-2.5 py-1 border",
                    cfg.color, cfg.bg, cfg.border
                  )}>
                    {cfg.label}
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-muted/40 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 max-w-5xl">
          <div className="h-10 w-48 bg-muted rounded-xl animate-pulse" />
          <div className="h-14 w-full bg-muted rounded-2xl animate-pulse" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
