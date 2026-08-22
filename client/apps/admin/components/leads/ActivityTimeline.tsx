"use client";
import { useState } from "react";
import { Phone, MessageSquare, StickyNote, Mail, ArrowRight, Loader2, Plus, Calendar, CheckCircle2 } from "lucide-react";
import { format, isValid } from "date-fns";
import { cn } from "@/lib/utils";
import type { Activity, ActivityType } from "@/lib/types/lead";

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  CALL:                 { icon: Phone,          color: "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300",    label: "Call" },
  MESSAGE:              { icon: MessageSquare,  color: "bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-300", label: "Message" },
  NOTE:                 { icon: StickyNote,     color: "bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-300", label: "Note" },
  EMAIL:                { icon: Mail,           color: "bg-violet-100 text-violet-600 dark:bg-violet-900/50 dark:text-violet-300", label: "Email" },
  STAGE_CHANGE:         { icon: ArrowRight,     color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200", label: "Stage Change" },
  STATUS_CHANGE:        { icon: ArrowRight,     color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200", label: "Status Change" },
  FOLLOW_UP_SCHEDULED:  { icon: Calendar,       color: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300", label: "Follow-up" },
  WHATSAPP:             { icon: MessageSquare,  color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-300", label: "WhatsApp" },
  VISIT:                { icon: CheckCircle2,   color: "bg-teal-100 text-teal-600 dark:bg-teal-900/50 dark:text-teal-300", label: "Visit" },
};

interface ActivityTimelineProps {
  activities?: Activity[];
  onAdd: (type: ActivityType, content: string) => Promise<void>;
}

function formatDateSafe(dateStr?: string): string {
  if (!dateStr) return "Just now";
  try {
    const d = new Date(dateStr);
    if (!isValid(d)) return "Just now";
    return format(d, "dd MMM yyyy, hh:mm a");
  } catch {
    return "Just now";
  }
}

export function ActivityTimeline({ activities = [], onAdd }: ActivityTimelineProps) {
  const [type, setType] = useState<ActivityType>("NOTE");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!content.trim()) return;
    setSaving(true);
    try {
      await onAdd(type, content.trim());
      setContent("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Add activity form */}
      <div className="rounded-2xl border bg-card p-4 space-y-3 shadow-2xs">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Log New Interaction</p>
        <div className="flex gap-2 flex-wrap">
          {(["NOTE", "CALL", "MESSAGE", "EMAIL"] as ActivityType[]).map((t) => {
            const cfg = TYPE_CONFIG[t] ?? TYPE_CONFIG.NOTE;
            const isSelected = type === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold border transition-all cursor-pointer",
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "hover:bg-accent text-muted-foreground"
                )}
              >
                <cfg.icon className="h-3.5 w-3.5" />
                {cfg.label}
              </button>
            );
          })}
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={2}
          placeholder={`Add details for this ${TYPE_CONFIG[type]?.label.toLowerCase() || "note"}...`}
          className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
        />
        <div className="flex justify-end">
          <button
            onClick={handleAdd}
            disabled={saving || !content.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Log Activity
          </button>
        </div>
      </div>

      {/* Activity Timeline List */}
      {activities.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-6 text-center text-muted-foreground">
          <p className="text-xs font-medium">No activities recorded yet.</p>
          <p className="text-[11px] text-muted-foreground/80 mt-0.5">
            Log phone calls, WhatsApp messages, emails, or internal counselor notes above.
          </p>
        </div>
      ) : (
        <div className="relative space-y-4 pl-6 before:absolute before:left-[0.6rem] before:top-2 before:bottom-2 before:w-px before:bg-border">
          {activities.map((act) => {
            const rawType = String(act.type || "NOTE").toUpperCase();
            const cfg = TYPE_CONFIG[rawType] ?? TYPE_CONFIG.NOTE;
            const author = act.createdBy || (act as any).created_by || "Staff Counselor";
            const textContent = act.content || (act as any).description || "";

            return (
              <div key={act.id} className="relative group">
                <div
                  className={cn(
                    "absolute -left-6 flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-card",
                    cfg.color
                  )}
                >
                  <cfg.icon className="h-2.5 w-2.5" />
                </div>
                <div className="rounded-xl border bg-card p-3.5 shadow-2xs hover:border-primary/30 transition-colors">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <span className={cn("inline-block rounded-md px-1.5 py-0.5 text-[10px] font-extrabold uppercase", cfg.color)}>
                        {cfg.label}
                      </span>
                      <span className="text-muted-foreground font-medium text-[11px]">• {author}</span>
                    </span>
                    <span className="text-[11px] text-muted-foreground font-medium">
                      {formatDateSafe(act.createdAt || (act as any).created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap mt-1">
                    {textContent}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
