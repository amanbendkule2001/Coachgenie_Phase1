"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Building2,
  Users,
  BookOpen,
  Receipt,
  Bell,
  Sparkles,
  ShieldCheck,
  Save,
  Loader2,
  Plus,
  X,
  UserMinus,
  CheckCircle2,
  Sliders,
  Palette,
  CreditCard,
  Globe,
  Mail,
  Phone,
  MapPin,
  Lock,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAcademicStore } from "@/lib/stores/academic.store";
import { useFinanceStore } from "@/lib/stores/finance.store";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useSettingsStore, InstituteSettings } from "@/lib/stores/settings.store";
import type { InstituteUser } from "@/lib/types/finance";

// Form Schema for Institute Settings
const instituteSchema = z.object({
  name: z.string().min(2, "Institute name must be at least 2 characters"),
  tagline: z.string().optional(),
  phone: z.string().min(10, "Phone must be at least 10 digits"),
  email: z.string().email("Valid email required"),
  address: z.string().min(3, "Address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  pincode: z.string().min(6, "Valid 6-digit pincode required"),
  website: z.string().url("Valid URL").optional().or(z.literal("")),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Valid hex color required"),
  // Module Integration Settings
  attendanceThreshold: z.number().min(50).max(100),
  autoNotifyAbsentees: z.boolean(),
  defaultPassingPct: z.number().min(30).max(90),
  lateFeePenaltyPerDay: z.number().min(0),
  aiCopilotModel: z.string(),
  whatsappNotifications: z.boolean(),
});

type SettingsFormValues = z.infer<typeof instituteSchema>;

const ROLE_CONFIG: Record<InstituteUser["role"], { label: string; color: string; bg: string }> = {
  SUPER_ADMIN: { label: "Super Admin (Owner)", color: "text-violet-700 dark:text-violet-300", bg: "bg-violet-500/15" },
  ADMIN: { label: "Admin", color: "text-blue-700 dark:text-blue-300", bg: "bg-blue-500/15" },
  COACH: { label: "Teacher / Tutor", color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-500/15" },
};

const inputCls =
  "flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-xs disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-muted/40";

const Field = ({
  label,
  error,
  children,
  help,
}: {
  label: string;
  error?: string;
  help?: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-1.5">
    <label className="text-xs font-semibold text-foreground">{label}</label>
    {children}
    {help && <p className="text-[11px] text-muted-foreground">{help}</p>}
    {error && <p className="text-xs font-medium text-destructive">{error}</p>}
  </div>
);

export default function SettingsPage() {
  const academicStore = useAcademicStore();
  const financeStore = useFinanceStore();
  const { user, role: userRole } = useAuthStore();
  const { settings, fetchSettings, updateSettings, isSaving, isLoading } = useSettingsStore();

  const [activeTab, setActiveTab] = useState<"profile" | "users" | "academic" | "fees" | "integrations">("profile");

  // Determine user permission
  const activeRole = (user?.role || userRole || "owner").toLowerCase();
  const isOwnerOrAdmin =
    activeRole === "owner" ||
    activeRole === "admin" ||
    activeRole === "super_admin" ||
    (user as any)?.role === "SUPER_ADMIN" ||
    (user as any)?.role === "ADMIN";

  // Users State (connected to User Management)
  const { users, inviteUser, updateUserRole, deactivateUser } = financeStore;
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<InstituteUser["role"]>("COACH");
  const [inviting, setInviting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(instituteSchema),
    defaultValues: settings,
  });

  // Fetch settings on mount & populate form
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Sync form values when settings store updates
  useEffect(() => {
    reset(settings);
  }, [settings, reset]);

  async function onSubmit(data: SettingsFormValues) {
    if (!isOwnerOrAdmin) {
      toast.error("Permission Denied: Only Administrators and Owners can save settings.");
      return;
    }

    const result = await updateSettings(data);
    if (result.success) {
      toast.success("Settings saved and synced across all modules!");
    } else {
      toast.error(result.error || "Failed to save settings. Please try again.");
    }
  }

  async function handleSendInvite() {
    if (!isOwnerOrAdmin) {
      toast.error("Only Administrators can invite new staff members.");
      return;
    }
    if (!inviteName.trim() || !inviteEmail.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setInviting(true);
    await new Promise((r) => setTimeout(r, 400));
    inviteUser({ name: inviteName.trim(), email: inviteEmail.trim(), role: inviteRole });
    toast.success(`User invitation sent to ${inviteEmail}`);
    setInviteName("");
    setInviteEmail("");
    setInviteRole("COACH");
    setInviting(false);
    setShowInviteModal(false);
  }

  const primaryColorValue = watch("primaryColor") || settings.primaryColor;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* 🚀 Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            System &amp; Module Settings
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600">
              <Sparkles className="h-3 w-3" /> Live Synced
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure institute profile, role permissions, attendance cutoffs, fee policies, and AI integrations
          </p>
        </div>

        {isOwnerOrAdmin ? (
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={isSaving || isLoading}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all shadow-sm cursor-pointer"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>{isSaving ? "Saving Live..." : "Save All Settings"}</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 rounded-xl border bg-muted/60 px-4 py-2 text-xs font-semibold text-muted-foreground">
            <Lock className="h-3.5 w-3.5" /> Read-Only Mode
          </div>
        )}
      </div>

      {/* 🛡️ Role-Based Access Banner if Non-Admin */}
      {!isOwnerOrAdmin && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-center gap-3 text-xs text-amber-800 dark:text-amber-300">
          <Info className="h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-bold">Read-Only Permission (Role: {activeRole.toUpperCase()})</p>
            <p className="text-[11px] opacity-90">
              You are currently viewing institute settings with read-only permissions. Only Institute Administrators and Owners can modify policies, thresholds, and integrations.
            </p>
          </div>
        </div>
      )}

      {/* 🧭 Tab Toolbar */}
      <div className="border-b flex items-center gap-4 sm:gap-6 text-sm font-semibold overflow-x-auto no-scrollbar whitespace-nowrap">
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={cn(
            "pb-3 border-b-2 transition-all flex items-center gap-2 cursor-pointer",
            activeTab === "profile" ? "border-violet-600 text-violet-600" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Building2 className="h-4 w-4" /> Institute Details &amp; Branding
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("users")}
          className={cn(
            "pb-3 border-b-2 transition-all flex items-center gap-2 cursor-pointer",
            activeTab === "users" ? "border-violet-600 text-violet-600" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Users className="h-4 w-4" /> Staff &amp; Roles ({users.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("academic")}
          className={cn(
            "pb-3 border-b-2 transition-all flex items-center gap-2 cursor-pointer",
            activeTab === "academic" ? "border-violet-600 text-violet-600" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <BookOpen className="h-4 w-4" /> Attendance &amp; Exam Rules
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("fees")}
          className={cn(
            "pb-3 border-b-2 transition-all flex items-center gap-2 cursor-pointer",
            activeTab === "fees" ? "border-violet-600 text-violet-600" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Receipt className="h-4 w-4" /> Fee &amp; Payment Policies
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("integrations")}
          className={cn(
            "pb-3 border-b-2 transition-all flex items-center gap-2 cursor-pointer",
            activeTab === "integrations" ? "border-violet-600 text-violet-600" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Sparkles className="h-4 w-4" /> AI &amp; Messaging Services
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* 🏢 TAB 1: INSTITUTE PROFILE & BRANDING */}
        {activeTab === "profile" && (
          <div className="space-y-6 fade-in max-w-4xl">
            {/* Institute Identity */}
            <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Building2 className="h-4 w-4 text-violet-600" />
                <span>Institute Identity &amp; Contact Details</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field label="Institute Name" error={errors.name?.message} help="Appears on all student report cards and invoices">
                    <input disabled={!isOwnerOrAdmin} {...register("name")} className={inputCls} />
                  </Field>
                </div>

                <div className="sm:col-span-2">
                  <Field label="Tagline / Motto" error={errors.tagline?.message}>
                    <input disabled={!isOwnerOrAdmin} {...register("tagline")} placeholder="Excellence in Education" className={inputCls} />
                  </Field>
                </div>

                <Field label="Contact Phone" error={errors.phone?.message}>
                  <div className="relative flex items-center">
                    <Phone className="absolute left-3 h-4 w-4 text-muted-foreground" />
                    <input disabled={!isOwnerOrAdmin} {...register("phone")} className={cn(inputCls, "pl-9")} />
                  </div>
                </Field>

                <Field label="Official Email" error={errors.email?.message}>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3 h-4 w-4 text-muted-foreground" />
                    <input disabled={!isOwnerOrAdmin} {...register("email")} type="email" className={cn(inputCls, "pl-9")} />
                  </div>
                </Field>

                <div className="sm:col-span-2">
                  <Field label="Institute Campus Address" error={errors.address?.message}>
                    <div className="relative flex items-center">
                      <MapPin className="absolute left-3 h-4 w-4 text-muted-foreground" />
                      <input disabled={!isOwnerOrAdmin} {...register("address")} className={cn(inputCls, "pl-9")} />
                    </div>
                  </Field>
                </div>

                <Field label="City" error={errors.city?.message}>
                  <input disabled={!isOwnerOrAdmin} {...register("city")} className={inputCls} />
                </Field>

                <Field label="State" error={errors.state?.message}>
                  <input disabled={!isOwnerOrAdmin} {...register("state")} className={inputCls} />
                </Field>

                <Field label="Pincode" error={errors.pincode?.message}>
                  <input disabled={!isOwnerOrAdmin} {...register("pincode")} className={inputCls} />
                </Field>

                <Field label="Official Website" error={errors.website?.message}>
                  <div className="relative flex items-center">
                    <Globe className="absolute left-3 h-4 w-4 text-muted-foreground" />
                    <input disabled={!isOwnerOrAdmin} {...register("website")} placeholder="https://yourinstitute.com" className={cn(inputCls, "pl-9")} />
                  </div>
                </Field>
              </div>
            </div>

            {/* Visual Branding & Color Scheme */}
            <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Palette className="h-4 w-4 text-violet-600" />
                <span>Visual Theme &amp; PDF Branding</span>
              </div>

              <Field label="Primary Theme Color (Hex Code)" error={errors.primaryColor?.message} help="Used for PDF reports, badges, and headers">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl border flex items-center justify-center shrink-0 shadow-xs" style={{ backgroundColor: primaryColorValue }}>
                    <CheckCircle2 className="h-5 w-5 text-white drop-shadow-md" />
                  </div>
                  <input disabled={!isOwnerOrAdmin} {...register("primaryColor")} type="text" className={cn(inputCls, "font-mono font-bold uppercase max-w-[160px]")} />
                  {isOwnerOrAdmin && (
                    <input {...register("primaryColor")} type="color" className="h-10 w-14 rounded-xl border cursor-pointer bg-background p-1" />
                  )}
                </div>
              </Field>

              <div className="rounded-xl border bg-muted/30 p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-foreground">Institute Header Logo</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Recommended size: 240×80 PNG / SVG with transparent background</p>
                </div>
                <button
                  type="button"
                  disabled={!isOwnerOrAdmin}
                  onClick={() => toast.info("Logo uploader ready for production storage!")}
                  className="rounded-xl border bg-background px-4 py-2 text-xs font-semibold hover:bg-accent transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Upload Logo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 👥 TAB 2: STAFF & USER MANAGEMENT */}
        {activeTab === "users" && (
          <div className="space-y-6 fade-in max-w-5xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold tracking-tight">Staff &amp; Tutor Accounts</h3>
                <p className="text-xs text-muted-foreground">{users.filter((u) => u.status === "ACTIVE").length} active user logins</p>
              </div>

              {isOwnerOrAdmin && (
                <button
                  type="button"
                  onClick={() => setShowInviteModal(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 transition-all shadow-sm cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Invite Staff Member
                </button>
              )}
            </div>

            {/* Users Table */}
            <div className="rounded-2xl border bg-card shadow-sm overflow-x-auto min-w-full">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead>
                  <tr className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground">
                    <th className="px-5 py-3.5">User</th>
                    <th className="px-5 py-3.5">Role Permission</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Last Login</th>
                    {isOwnerOrAdmin && <th className="px-5 py-3.5 text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y text-xs">
                  {users.map((item) => {
                    const roleCfg = ROLE_CONFIG[item.role] || ROLE_CONFIG["COACH"];
                    return (
                      <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                              {item.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground text-sm">{item.name}</p>
                              <p className="text-xs text-muted-foreground">{item.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          {isOwnerOrAdmin ? (
                            <select
                              value={item.role}
                              onChange={(e) => {
                                updateUserRole(item.id, e.target.value as InstituteUser["role"]);
                                toast.success(`Role updated for ${item.name}`);
                              }}
                              disabled={item.role === "SUPER_ADMIN" || !isOwnerOrAdmin}
                              className={cn(
                                "rounded-lg px-2.5 py-1 text-xs font-bold border-0 focus:outline-none cursor-pointer disabled:cursor-not-allowed",
                                roleCfg.bg,
                                roleCfg.color
                              )}
                            >
                              <option value="SUPER_ADMIN">Super Admin</option>
                              <option value="ADMIN">Admin</option>
                              <option value="COACH">Teacher / Tutor</option>
                            </select>
                          ) : (
                            <span className={cn("rounded-lg px-2.5 py-1 text-xs font-bold", roleCfg.bg, roleCfg.color)}>
                              {roleCfg.label}
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-3.5">
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase",
                              item.status === "ACTIVE" ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600"
                            )}
                          >
                            {item.status}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 text-muted-foreground font-medium">
                          {item.lastLogin ? format(new Date(item.lastLogin), "dd MMM yyyy, hh:mm a") : "—"}
                        </td>

                        {isOwnerOrAdmin && (
                          <td className="px-5 py-3.5 text-center">
                            {item.role !== "SUPER_ADMIN" && item.status === "ACTIVE" && (
                              <button
                                type="button"
                                onClick={() => {
                                  deactivateUser(item.id);
                                  toast.success(`${item.name} deactivated`);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-destructive/20 px-2.5 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                              >
                                <UserMinus className="h-3 w-3" /> Deactivate
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Role Permissions Matrix */}
            <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 border-b pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-violet-600" />
                <span>Role Permissions Breakdown</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {Object.entries(ROLE_CONFIG).map(([rKey, cfg]) => (
                  <div key={rKey} className={cn("rounded-xl p-4 border space-y-2", cfg.bg)}>
                    <p className={cn("text-xs font-bold uppercase tracking-wider", cfg.color)}>{cfg.label}</p>
                    <ul className="text-xs space-y-1 text-muted-foreground">
                      {rKey === "SUPER_ADMIN" && ["Full system access", "Manage billing & plans", "Manage staff accounts", "Modify institute settings"].map((p) => <li key={p}>✓ {p}</li>)}
                      {rKey === "ADMIN" && ["Manage admissions", "Manage student profiles", "Modify academic rules", "Create batches"].map((p) => <li key={p}>✓ {p}</li>)}
                      {rKey === "COACH" && ["Mark batch attendance", "Enter exam results", "View assigned batches", "View settings (Read-only)"].map((p) => <li key={p}>✓ {p}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 📚 TAB 3: ACADEMIC, EXAM & ATTENDANCE RULES */}
        {activeTab === "academic" && (
          <div className="space-y-6 fade-in max-w-4xl">
            <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <BookOpen className="h-4 w-4 text-violet-600" />
                <span>Attendance &amp; Absentee Threshold Rules</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Minimum Required Attendance %"
                  error={errors.attendanceThreshold?.message}
                  help="Students below this cutoff trigger low-attendance warnings"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={50}
                      max={100}
                      disabled={!isOwnerOrAdmin}
                      {...register("attendanceThreshold", { valueAsNumber: true })}
                      className={inputCls}
                    />
                    <span className="text-sm font-bold text-muted-foreground">%</span>
                  </div>
                </Field>

                <div className="space-y-2 pt-2">
                  <label className="text-xs font-semibold text-foreground">Automated Absent Notifications</label>
                  <label className={cn("flex items-center gap-2 text-xs font-medium", isOwnerOrAdmin ? "cursor-pointer" : "cursor-not-allowed opacity-60")}>
                    <input
                      type="checkbox"
                      disabled={!isOwnerOrAdmin}
                      {...register("autoNotifyAbsentees")}
                      className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                    />
                    <span>Auto-send SMS/WhatsApp alert to parents when student is marked ABSENT</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Sliders className="h-4 w-4 text-violet-600" />
                <span>Exam Grading &amp; Pass Criteria</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Default Exam Passing %"
                  error={errors.defaultPassingPct?.message}
                  help="Default passing score when creating new exams"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={30}
                      max={90}
                      disabled={!isOwnerOrAdmin}
                      {...register("defaultPassingPct", { valueAsNumber: true })}
                      className={inputCls}
                    />
                    <span className="text-sm font-bold text-muted-foreground">%</span>
                  </div>
                </Field>

                <div className="space-y-1 text-xs text-muted-foreground">
                  <label className="font-semibold text-foreground">Standard Grade System</label>
                  <p>A+ (≥90%), A (≥80%), B+ (≥70%), B (≥60%), C (≥50%), D (≥35%), F (&lt;35%)</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 💳 TAB 4: FEE POLICIES & PAYMENT GATEWAYS */}
        {activeTab === "fees" && (
          <div className="space-y-6 fade-in max-w-4xl">
            <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Receipt className="h-4 w-4 text-emerald-600" />
                <span>Fee Collection &amp; Late Fine Rules</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Late Fee Penalty (₹ per day overdue)"
                  error={errors.lateFeePenaltyPerDay?.message}
                  help="Applied to student invoices past due date"
                >
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-xs font-bold text-muted-foreground">₹</span>
                    <input
                      type="number"
                      min={0}
                      disabled={!isOwnerOrAdmin}
                      {...register("lateFeePenaltyPerDay", { valueAsNumber: true })}
                      className={cn(inputCls, "pl-7")}
                    />
                  </div>
                </Field>

                <div className="space-y-1 text-xs text-muted-foreground">
                  <label className="font-semibold text-foreground">Currency &amp; Format</label>
                  <p>Indian Rupee (₹ INR) · Standard decimal formatting</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <CreditCard className="h-4 w-4 text-blue-600" />
                <span>Online Student Fee Payment Gateways</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border p-4 flex items-center justify-between bg-muted/20">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                      UPI
                    </div>
                    <div>
                      <p className="font-bold text-xs">UPI Direct Gateway</p>
                      <p className="text-[11px] text-muted-foreground">GPay, PhonePe, Paytm QR</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-extrabold text-emerald-600">Active</span>
                </div>

                <div className="rounded-xl border p-4 flex items-center justify-between bg-muted/20">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-violet-600 text-white flex items-center justify-center font-bold text-xs">
                      RZP
                    </div>
                    <div>
                      <p className="font-bold text-xs">Razorpay Integration</p>
                      <p className="text-[11px] text-muted-foreground">Cards, Netbanking, Auto-receipts</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-extrabold text-emerald-600">Active</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 🤖 TAB 5: AI COPILOT & MESSAGING SERVICES */}
        {activeTab === "integrations" && (
          <div className="space-y-6 fade-in max-w-4xl">
            <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span>AI Copilot Model &amp; Intelligence Config</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Groq LLM Inference Model" help="Powers AI Insights, Weak Student Analysis &amp; Reports">
                  <select disabled={!isOwnerOrAdmin} {...register("aiCopilotModel")} className={inputCls}>
                    <option value="llama3-70b-8192">Llama 3 70B (High Precision - Recommended)</option>
                    <option value="mixtral-8x7b-32768">Mixtral 8x7B (Fast Analytical)</option>
                    <option value="llama3-8b-8192">Llama 3 8B (Speed Optimized)</option>
                  </select>
                </Field>

                <div className="space-y-2 pt-2">
                  <label className="text-xs font-semibold text-foreground">pgvector RAG Retrieval Engine</label>
                  <p className="text-xs text-muted-foreground">Status: <span className="font-bold text-emerald-600">Connected to PostgreSQL Vector Database</span></p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b pb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Bell className="h-4 w-4 text-emerald-600" />
                <span>Transactional Messaging Services</span>
              </div>

              <label className={cn("flex items-center gap-3 text-xs font-medium border p-4 rounded-xl bg-muted/20", isOwnerOrAdmin ? "cursor-pointer" : "cursor-not-allowed opacity-60")}>
                <input
                  type="checkbox"
                  disabled={!isOwnerOrAdmin}
                  {...register("whatsappNotifications")}
                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                />
                <div>
                  <p className="font-bold text-foreground">WhatsApp Business API Gateway</p>
                  <p className="text-muted-foreground text-[11px]">Send automated fee receipts, attendance warnings, and exam score cards to parents via WhatsApp</p>
                </div>
              </label>
            </div>
          </div>
        )}
      </form>

      {/* 📩 Invite Staff Modal */}
      {showInviteModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={() => setShowInviteModal(false)} />
          <div className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-2xl border bg-background shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="font-bold text-base">Invite Staff Member / Tutor</h2>
              <button type="button" onClick={() => setShowInviteModal(false)} className="rounded-lg p-1.5 hover:bg-accent text-muted-foreground cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold">Full Name</label>
                <input
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Rahul Verma"
                  className={inputCls}
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold">Email Address</label>
                <input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  type="email"
                  placeholder="e.g. rahul@institute.com"
                  className={inputCls}
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold">Role Permission</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as InstituteUser["role"])}
                  className={inputCls}
                >
                  <option value="COACH">Teacher / Tutor</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="rounded-xl border px-4 py-2 text-xs font-semibold hover:bg-accent transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendInvite}
                disabled={inviting}
                className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
              >
                {inviting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                <span>Send Invitation</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
