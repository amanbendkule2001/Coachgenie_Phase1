
// app/(dashboard)/profile/page.tsx
"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/auth.store";

interface ProfileData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: "owner" | "counselor" | "tutor" | "parent" | "student";
  tenant_id: string;
  phone?: string | null;
  avatar_url?: string | null;
}

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [form, setForm] = useState<Partial<ProfileData>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const data = await api.get<ProfileData>("/auth/profile");
        setProfile(data);
        setForm(data);
      } catch (err) {
        console.error("Profile fetch error:", err);
        setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const data = await api.patch<ProfileData>("/auth/profile", form);
      console.log("PATCH response:", data);
      setProfile(data);
      if (user) {
        setUser({ ...user, ...data }); // merge so missing fields don't null out the store
      }
      setSuccess(true);
    } catch (err) {
      console.error("Profile update error:", err);
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6">Loading...</div>;
  if (error && !profile) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-xl font-semibold mb-4">Profile</h1>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">First Name</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={form.first_name ?? ""}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Last Name</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={form.last_name ?? ""}
            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            className="w-full border rounded px-3 py-2 bg-gray-100"
            value={form.email ?? ""}
            disabled
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Phone</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={form.phone ?? ""}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Role</label>
          <input
            className="w-full border rounded px-3 py-2 bg-gray-100"
            value={form.role ?? ""}
            disabled
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}
        {success && <p className="text-green-600 text-sm">Profile updated</p>}

        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}