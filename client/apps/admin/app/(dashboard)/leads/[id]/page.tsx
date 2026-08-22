"use client";

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, UserCheck, Trash2, Sparkles, Building2, BookOpen, Calendar, Phone, Mail, User } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useLeadStore } from "@/lib/stores/leads.store";
import { StageBadge } from "@/components/leads/StageBadge";
import { ActivityTimeline } from "@/components/leads/ActivityTimeline";
import { STAGE_CONFIG, STAGES, SOURCE_LABELS } from "@/lib/constants/leads";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/stores/auth.store";
import type { ActivityType } from "@/lib/types/lead";
import { ConvertLeadModal } from "@/components/leads/ConvertLeadModal";
import { authHeaders } from "@/lib/auth-headers";

const API = "/api/proxy";

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const store = useLeadStore();
  const currentUser = useAuthStore((s) => s.user);

  const [lead, setLead] = useState(store.leads.find((l) => l.id === id) ?? null);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [loading, setLoading] = useState(!lead);

  // Sync lead details and activities from API
  useEffect(() => {
    let isMounted = true;
    async function loadLeadDetail() {
      try {
        const [leadRes, actRes] = await Promise.all([
          fetch(`${API}/leads/${id}`, { headers: authHeaders() }).catch(() => null),
          fetch(`${API}/leads/${id}/activities`, { headers: authHeaders() }).catch(() => null),
        ]);

        if (leadRes && leadRes.ok) {
          const json = await leadRes.json();
          const raw = json.data ?? json;

          let rawActivities = raw.activities ?? [];
          if (actRes && actRes.ok) {
            const actJson = await actRes.json();
            const fetchedActs = actJson.data ?? actJson;
            if (Array.isArray(fetchedActs) && fetchedActs.length > 0) {
              rawActivities = fetchedActs;
            }
          }

          if (isMounted && raw && raw.id) {
            const mappedActivities = rawActivities.map((a: any) => ({
              id: String(a.id || `a-${Date.now()}`),
              type: String(a.type || "NOTE").toUpperCase(),
              content: a.content || a.description || "",
              createdAt: a.created_at || a.createdAt || new Date().toISOString(),
              createdBy: a.created_by || a.createdBy || "Staff Counselor",
            }));

            setLead({
              id: String(raw.id),
              name: raw.full_name ?? raw.name ?? "",
              email: raw.email ?? "",
              phone: raw.phone ?? "",
              parentContactNumber: raw.parent_contact_number ?? "",
              schoolName: raw.school_name ?? "",
              source: (raw.source?.toUpperCase() as any) ?? "WEBSITE",
              stage: (raw.status?.toUpperCase() as any) ?? "NEW",
              subject: raw.interested_course ?? raw.subject ?? "",
              grade: raw.grade ?? "",
              parentName: raw.parent_name ?? "",
              notes: raw.notes ?? "",
              createdAt: raw.created_at ?? new Date().toISOString(),
              updatedAt: raw.updated_at ?? new Date().toISOString(),
              activities: mappedActivities,
              tags: raw.tags ?? [],
              boardName: raw.board_name ?? "",
              batchId: raw.batch_id ?? "",
              batchName: raw.batch_name ?? raw.batch?.name ?? "",
              assignedTo: raw.assigned_to ?? "",
            });
          }
        }
      } catch {
        // quiet fallback
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadLeadDetail();
    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading && !lead) {
    return (
      <div className="space-y-4 max-w-4xl">
        <div className="h-8 w-48 bg-muted rounded-xl animate-pulse" />
        <div className="h-64 bg-card border rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 rounded-2xl border bg-card p-8 text-center">
        <p className="text-base font-bold">Lead record not found.</p>
        <button
          onClick={() => router.push("/leads")}
          className="text-xs font-semibold text-primary hover:underline"
        >
          ← Return to Leads Pipeline
        </button>
      </div>
    );
  }

  async function handleAddActivity(type: ActivityType, content: string) {
    const createdBy = currentUser?.first_name
      ? `${currentUser.first_name} ${currentUser.last_name || ""}`.trim()
      : currentUser?.email ?? "Staff Counselor";

    try {
      const res = await fetch(`${API}/leads/${lead!.id}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          type: type.toUpperCase(),
          description: content,
          content: content,
          created_by: createdBy,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const rawAct = json.data ?? json;
        const newAct = {
          id: String(rawAct.id || `a-${Date.now()}`),
          type: (rawAct.type || type).toUpperCase(),
          content: rawAct.content || rawAct.description || content,
          createdAt: rawAct.created_at || rawAct.createdAt || new Date().toISOString(),
          createdBy: rawAct.created_by || rawAct.createdBy || createdBy,
        };

        setLead((prev) => (prev ? { ...prev, activities: [newAct, ...(prev.activities || [])] } : prev));
        store.addActivity(lead!.id, {
          type: newAct.type,
          content: newAct.content,
          createdBy: newAct.createdBy,
        });
        toast.success("Activity logged successfully");
      } else {
        throw new Error("Failed to save on server");
      }
    } catch {
      const localAct = {
        id: `a-${Date.now()}`,
        type,
        content,
        createdAt: new Date().toISOString(),
        createdBy,
      };
      setLead((prev) => (prev ? { ...prev, activities: [localAct, ...(prev.activities || [])] } : prev));
      store.addActivity(lead!.id, { type, content, createdBy });
      toast.success("Activity logged locally");
    }
  }

  async function handleDelete() {
    if (!lead) return;
    try {
      await fetch(`${API}/leads/${lead.id}`, { method: "DELETE", headers: authHeaders() }).catch(() => null);
    } catch {
      // quiet fallback
    }
    store.deleteLead(lead.id);
    toast.success("Lead record deleted");
    router.push("/leads");
  }

  const alreadyAdmitted =
    lead.stage === "ENROLLED" ||
    store.admissions.some((a) => a.leadId === lead.id || (a as any).lead_id === lead.id);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* 🚀 Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => router.push("/leads")}
            className="mt-1 rounded-xl p-2 hover:bg-accent text-muted-foreground transition-colors border shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              {lead.name}
              <StageBadge stage={lead.stage} />
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">
              {[lead.grade ? `${lead.grade} Grade` : null, lead.subject, lead.schoolName].filter(Boolean).join(" • ")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!alreadyAdmitted && (
            <button
              onClick={() => setShowConvertModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-all shadow-sm"
            >
              <UserCheck className="h-4 w-4" /> Convert to Admission
            </button>
          )}

          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 rounded-xl border border-destructive/20 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Left Column: Lead Info ────────────────────────────────── */}
        <div className="space-y-4 lg:col-span-1">
          {/* Contact Details */}
          <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 border-b pb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Phone className="h-3.5 w-3.5 text-violet-600" />
              <span>Contact &amp; Source Info</span>
            </div>

            {[
              { label: "Email", value: lead.email },
              { label: "Student Phone", value: lead.phone },
              { label: "Parent Name", value: lead.parentName },
              { label: "Parent Phone", value: lead.parentContactNumber },
              { label: "Lead Source", value: SOURCE_LABELS[lead.source] || lead.source },
              { label: "Assigned Counselor", value: lead.assignedTo || "Staff Counselor" },
              { label: "Logged Date", value: format(new Date(lead.createdAt), "dd MMM yyyy") },
            ].map(({ label, value }) =>
              value ? (
                <div key={label} className="flex justify-between text-xs">
                  <span className="text-muted-foreground font-medium">{label}</span>
                  <span className="font-semibold text-foreground text-right max-w-[55%] truncate">{value}</span>
                </div>
              ) : null
            )}
          </div>

          {/* Academic Details */}
          <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 border-b pb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5 text-blue-600" />
              <span>Academic Details</span>
            </div>

            {[
              { label: "School", value: lead.schoolName },
              { label: "Grade", value: lead.grade },
              { label: "Board", value: lead.boardName },
              { label: "Interested Course", value: lead.subject },
              { label: "Target Batch", value: lead.batchName },
            ].map(({ label, value }) =>
              value ? (
                <div key={label} className="flex justify-between text-xs">
                  <span className="text-muted-foreground font-medium">{label}</span>
                  <span className="font-semibold text-foreground text-right max-w-[55%] truncate">
                    {label === "Target Batch" ? (
                      <span className="rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-[11px] font-bold">
                        {value}
                      </span>
                    ) : (
                      value
                    )}
                  </span>
                </div>
              ) : null
            )}
          </div>

          {/* Pipeline Stage Selector */}
          <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Update Pipeline Stage</h3>
            <div className="space-y-1.5">
              {STAGES.map((s) => {
                const cfg = STAGE_CONFIG[s];
                const active = lead.stage === s;
                return (
                  <button
                    key={s}
                    onClick={async () => {
                      const stageAct = {
                        id: `a-${Date.now()}`,
                        type: "STAGE_CHANGE",
                        content: `Stage updated to ${cfg.label}`,
                        createdAt: new Date().toISOString(),
                        createdBy: currentUser?.first_name
                          ? `${currentUser.first_name} ${currentUser.last_name || ""}`.trim()
                          : "Staff Counselor",
                      };
                      setLead({
                        ...lead,
                        stage: s,
                        activities: [stageAct, ...(lead.activities || [])],
                      });
                      store.updateStage(lead.id, s);
                      try {
                        await fetch(`${API}/leads/${lead.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json", ...authHeaders() },
                          body: JSON.stringify({ status: s.toLowerCase() }),
                        }).catch(() => null);
                        toast.success(`Stage updated to ${cfg.label}`);
                      } catch {
                        toast.success(`Stage updated to ${cfg.label}`);
                      }
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold border transition-all",
                      active ? `${cfg.color} ${cfg.bg} ${cfg.border} shadow-xs` : "hover:bg-accent text-muted-foreground"
                    )}
                  >
                    <span className={cn("h-2 w-2 rounded-full", active ? cfg.color.replace("text-", "bg-") : "bg-muted-foreground/40")} />
                    {cfg.label}
                    {active && <span className="ml-auto text-[10px] font-extrabold uppercase opacity-80">Current</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Right Column: Activity Log ────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold tracking-tight">Lead Activity &amp; Interaction Timeline</h3>
            <ActivityTimeline activities={lead.activities} onAdd={handleAddActivity} />
          </div>
        </div>
      </div>

      {/* Convert Lead Modal */}
      {showConvertModal && (
        <ConvertLeadModal
          lead={lead}
          onClose={() => setShowConvertModal(false)}
          onSuccess={(admission) => {
            store.updateStage(lead.id, "ENROLLED");
            setShowConvertModal(false);
            router.push(`/admissions/${admission.id}`);
          }}
        />
      )}
    </div>
  );
}
