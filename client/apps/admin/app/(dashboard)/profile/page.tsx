"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useAuthStore } from "@/lib/stores/auth.store";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  Building2,
  KeyRound,
  Lock,
  Save,
  Loader2,
  CheckCircle2,
  Camera,
  Trash2,
  Eye,
  EyeOff,
  Fingerprint,
  Sparkles,
  ShieldAlert,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: "owner" | "counselor" | "tutor" | "parent" | "student" | string;
  tenant_id: string;
  phone?: string | null;
  avatar_url?: string | null;
}

const ROLE_BADGE_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; desc: string }> = {
  owner: {
    label: "Institute Owner (Super Admin)",
    bg: "bg-violet-500/15",
    text: "text-violet-700 dark:text-violet-300",
    border: "border-violet-500/30",
    desc: "Full Master Administrative Control over all academy operations, settings, and financials.",
  },
  admin: {
    label: "Administrator",
    bg: "bg-blue-500/15",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-500/30",
    desc: "Operations manager for student admissions, batches, faculty schedules, and fee collections.",
  },
  tutor: {
    label: "Teacher / Faculty",
    bg: "bg-emerald-500/15",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-500/30",
    desc: "Academic educator responsible for class attendance marking, syllabus, and exam grading.",
  },
  coach: {
    label: "Coach / Tutor",
    bg: "bg-emerald-500/15",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-500/30",
    desc: "Academic educator responsible for class attendance marking, syllabus, and exam grading.",
  },
  counselor: {
    label: "Academic Counselor",
    bg: "bg-amber-500/15",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-500/30",
    desc: "Student counselor managing lead conversions, enquiries, and admissions pipeline.",
  },
};

const inputCls =
  "flex h-10 w-full rounded-xl border border-input bg-background/80 px-3.5 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-xs transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-muted/40";

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [form, setForm] = useState<Partial<ProfileData>>({
    first_name: "",
    last_name: "",
    phone: "",
    avatar_url: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const data = await api.get<ProfileData>("/auth/profile");
        const resData = (data as any)?.data ?? data;
        setProfile(resData);
        setForm({
          first_name: resData.first_name || "",
          last_name: resData.last_name || "",
          phone: resData.phone || "",
          avatar_url: resData.avatar_url || "",
        });
      } catch (err) {
        if (user) {
          setProfile({
            id: user.id,
            email: user.email,
            first_name: user.first_name || "Admin",
            last_name: user.last_name || "User",
            role: user.role,
            tenant_id: user.tenant_id,
          });
          setForm({
            first_name: user.first_name || "",
            last_name: user.last_name || "",
          });
        }
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [user]);

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    if (!newPassword) return 0;
    let score = 0;
    if (newPassword.length >= 8) score += 25;
    if (/[A-Z]/.test(newPassword)) score += 25;
    if (/[0-9]/.test(newPassword)) score += 25;
    if (/[^A-Za-z0-9]/.test(newPassword)) score += 25;
    return score;
  }, [newPassword]);

  // Image Upload & Canvas Optimization Handler (Max 400x400)
  async function handleAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image (PNG, JPG, WebP)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size must be under 5MB");
      return;
    }

    setUploadingAvatar(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement("canvas");
        const maxDim = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.85);

          // Optimistic UI state
          setForm((prev) => ({ ...prev, avatar_url: compressedDataUrl }));
          setProfile((prev) => (prev ? { ...prev, avatar_url: compressedDataUrl } : null));

          try {
            const res = await api.patch<{ success: boolean; data: ProfileData }>("/auth/profile", {
              avatar_url: compressedDataUrl,
            });
            const updated = res.data ?? (res as any);
            if (user) {
              setUser({ ...user, ...updated, role: (updated.role || user.role) as any });
            }
            toast.success("Avatar photo updated!");
          } catch {
            toast.success("Avatar updated locally!");
          } finally {
            setUploadingAvatar(false);
          }
        }
      };
      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleRemoveAvatar() {
    setUploadingAvatar(true);
    setForm((prev) => ({ ...prev, avatar_url: "" }));
    setProfile((prev) => (prev ? { ...prev, avatar_url: "" } : null));

    try {
      await api.patch("/auth/profile", { avatar_url: "" });
      toast.success("Avatar removed. Reverted to initials.");
    } catch {
      toast.success("Avatar reset.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        first_name: form.first_name?.trim(),
        last_name: form.last_name?.trim(),
        phone: form.phone?.trim(),
        avatar_url: form.avatar_url || undefined,
      };
      const res = await api.patch<{ success: boolean; data: ProfileData }>("/auth/profile", payload);
      const updated = res.data ?? (res as any);
      setProfile((prev) => (prev ? { ...prev, ...updated } : updated));
      if (user) {
        setUser({ ...user, ...updated, role: (updated.role || user.role) as any });
      }
      toast.success("Profile details updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile.");
      if (user && form.first_name) {
        setUser({ ...user, first_name: form.first_name, last_name: form.last_name || "" });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error("Please provide both current and new passwords");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setChangingPassword(true);
    try {
      await api.post("/auth/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast.success("Security password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Current password was incorrect. Please try again.");
    } finally {
      setChangingPassword(false);
    }
  }

  const roleKey = (profile?.role || user?.role || "owner").toLowerCase();
  const roleCfg = ROLE_BADGE_CONFIG[roleKey] || ROLE_BADGE_CONFIG["owner"];

  const initials = `${(form.first_name || profile?.first_name || "A")[0] || ""}${(form.last_name || profile?.last_name || "U")[0] || ""}`.toUpperCase();
  const currentAvatar = form.avatar_url || profile?.avatar_url;

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Loading account profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleAvatarFileChange}
      />

      {/* 🚀 Hero Banner Card */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card/90 to-primary/5 p-6 sm:p-8 shadow-sm backdrop-blur-md">
        {/* Glow Accents */}
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Interactive Avatar */}
            <div className="relative group shrink-0">
              {currentAvatar ? (
                <img
                  src={currentAvatar}
                  alt="Profile Avatar"
                  className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl object-cover shadow-md ring-4 ring-background border border-border/60"
                />
              ) : (
                <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-2xl sm:text-3xl font-extrabold text-white shadow-md ring-4 ring-background">
                  {initials}
                </div>
              )}

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1.5 -right-1.5 h-8 w-8 rounded-xl bg-background border shadow-md flex items-center justify-center text-muted-foreground hover:text-primary hover:scale-105 active:scale-95 transition-all cursor-pointer"
                title="Change Avatar Photo"
              >
                {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Camera className="h-4 w-4" />}
              </button>
            </div>

            {/* Profile Identity Details */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {form.first_name || profile?.first_name} {form.last_name || profile?.last_name}
                </h1>
                <span className={cn("inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-bold border", roleCfg.bg, roleCfg.text, roleCfg.border)}>
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {roleCfg.label}
                </span>
              </div>

              <p className="text-sm text-muted-foreground flex items-center gap-1.5 font-medium">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                {profile?.email}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground font-medium">
                <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Active &amp; Verified
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="inline-flex items-center gap-1 font-mono">
                  <Fingerprint className="h-3.5 w-3.5 text-muted-foreground" /> ID: {profile?.id?.slice(0, 8)}...
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {currentAvatar && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                className="flex items-center gap-1.5 rounded-xl border border-destructive/20 bg-background/80 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors shadow-xs cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove Photo
              </button>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 shadow-sm transition-all cursor-pointer"
            >
              <Camera className="h-3.5 w-3.5" />
              Upload Photo
            </button>
          </div>
        </div>
      </div>

      {/* 🧭 Responsive Grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* 📝 Left Card: Personal Profile Information (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b pb-3.5">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <User className="h-4 w-4 text-violet-600" />
                <span>Personal Profile Information</span>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">Self-managed account</span>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">First Name</label>
                  <div className="relative flex items-center">
                    <User className="absolute left-3.5 h-4 w-4 text-muted-foreground" />
                    <input
                      value={form.first_name ?? ""}
                      onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                      placeholder="e.g. Vikas"
                      className={cn(inputCls, "pl-10")}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Last Name</label>
                  <input
                    value={form.last_name ?? ""}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    placeholder="e.g. Verma"
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Official Email Address</label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 h-4 w-4 text-muted-foreground" />
                  <input
                    value={profile?.email ?? ""}
                    disabled
                    className={cn(inputCls, "pl-10 font-mono text-xs")}
                  />
                  <span className="absolute right-3.5 inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
                    <Lock className="h-3 w-3 text-muted-foreground" /> Primary Login ID
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">Primary login email is locked to ensure system authentication security.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Contact Phone Number</label>
                <div className="relative flex items-center">
                  <Phone className="absolute left-3.5 h-4 w-4 text-muted-foreground" />
                  <input
                    value={form.phone ?? ""}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className={cn(inputCls, "pl-10")}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Assigned System Role</label>
                <div className="relative flex items-center">
                  <ShieldCheck className="absolute left-3.5 h-4 w-4 text-violet-600" />
                  <input
                    value={roleCfg.label}
                    disabled
                    className={cn(inputCls, "pl-10 font-bold text-xs")}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">{roleCfg.desc}</p>
              </div>

              <div className="flex justify-end pt-3 border-t">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all shadow-sm cursor-pointer"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span>{saving ? "Saving Live..." : "Save Profile Details"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* 🔐 Right Card: Security & Permissions (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Security / Change Password */}
          <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3.5">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <KeyRound className="h-4 w-4 text-amber-500" />
                <span>Account Security</span>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">Credentials</span>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Current Password</label>
                <div className="relative flex items-center">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className={cn(inputCls, "pr-10")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3.5 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">New Password</label>
                <div className="relative flex items-center">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 8 chars (1 Upper, 1 Number)"
                    className={cn(inputCls, "pr-10")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3.5 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {newPassword && (
                  <div className="space-y-1 pt-1">
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all duration-300",
                          passwordStrength <= 25 && "bg-destructive w-1/4",
                          passwordStrength === 50 && "bg-amber-500 w-2/4",
                          passwordStrength === 75 && "bg-blue-500 w-3/4",
                          passwordStrength === 100 && "bg-emerald-500 w-full"
                        )}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Strength: {passwordStrength < 50 ? "Weak" : passwordStrength < 100 ? "Good" : "Strong"}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Confirm New Password</label>
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className={inputCls}
                />
              </div>

              <button
                type="submit"
                disabled={changingPassword || !currentPassword || !newPassword}
                className="w-full flex items-center justify-center gap-2 rounded-xl border bg-background px-4 py-2.5 text-xs font-bold hover:bg-accent disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
              >
                {changingPassword ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                <span>Update Password</span>
              </button>
            </form>
          </div>

          {/* Account Role Permissions Card */}
          <div className="rounded-2xl border bg-muted/25 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <ShieldCheck className="h-4 w-4 text-violet-600" />
              <span>Active Privilege Level</span>
            </div>

            <ul className="text-xs space-y-2 text-muted-foreground">
              {roleKey === "owner" && (
                <>
                  <li className="flex items-center gap-2 text-foreground font-semibold">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-600 shrink-0" /> Full Master System Administration
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" /> Manage Billing, Plans &amp; Subscriptions
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" /> Modify Institute Policies, Cutoffs &amp; Fines
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" /> Invite, Assign Roles &amp; Deactivate Staff
                  </li>
                </>
              )}
              {roleKey === "admin" && (
                <>
                  <li className="flex items-center gap-2 text-foreground font-semibold">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0" /> Academic &amp; Student Operations
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" /> Manage Admissions, Batches &amp; Fees
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" /> Configure Pass Mark Cutoffs
                  </li>
                </>
              )}
              {roleKey !== "owner" && roleKey !== "admin" && (
                <>
                  <li className="flex items-center gap-2 text-foreground font-semibold">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 shrink-0" /> Batch Attendance Marking
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" /> Student Marks Entry &amp; Exam Scoring
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" /> View Assigned Batches &amp; Student Rosters
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}