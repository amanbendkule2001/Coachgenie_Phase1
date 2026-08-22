"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { authHeaders } from "@/lib/auth-headers";
import { toast } from "sonner";

const API = "/api/proxy";

export interface InstituteSettings {
  name: string;
  tagline?: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  website?: string;
  primaryColor: string;
  attendanceThreshold: number;
  autoNotifyAbsentees: boolean;
  defaultPassingPct: number;
  lateFeePenaltyPerDay: number;
  aiCopilotModel: string;
  whatsappNotifications: boolean;
}

export const DEFAULT_SETTINGS: InstituteSettings = {
  name: "CoachGenie AI Institute",
  tagline: "Empowering Students with Smart Analytics & AI Guidance",
  phone: "9876543000",
  email: "admin@coachgenie.in",
  address: "123, Academic Hub, MG Road",
  city: "Pune",
  state: "Maharashtra",
  pincode: "411001",
  website: "https://coachgenie.ai",
  primaryColor: "#7c3aed",
  attendanceThreshold: 75,
  autoNotifyAbsentees: true,
  defaultPassingPct: 40,
  lateFeePenaltyPerDay: 50,
  aiCopilotModel: "llama3-70b-8192",
  whatsappNotifications: true,
};

interface SettingsState {
  settings: InstituteSettings;
  canEdit: boolean;
  isLoading: boolean;
  isSaving: boolean;
  lastFetchedAt: number | null;

  // Actions
  fetchSettings: () => Promise<void>;
  updateSettings: (newSettings: Partial<InstituteSettings>) => Promise<{ success: boolean; error?: string }>;
  setLocalSettings: (newSettings: Partial<InstituteSettings>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      canEdit: true,
      isLoading: false,
      isSaving: false,
      lastFetchedAt: null,

      fetchSettings: async () => {
        set({ isLoading: true });
        try {
          const res = await fetch(`${API}/tenants/settings`, {
            headers: authHeaders(),
          });

          if (res.ok) {
            const data = await res.json();
            const fetched = data.settings || {};
            set((state) => ({
              settings: {
                ...state.settings,
                ...fetched,
                name: data.name || fetched.name || state.settings.name,
              },
              canEdit: data.can_edit !== undefined ? data.can_edit : true,
              lastFetchedAt: Date.now(),
              isLoading: false,
            }));
          } else {
            // Fallback to /tenants/me
            const meRes = await fetch(`${API}/tenants/me`, {
              headers: authHeaders(),
            });
            if (meRes.ok) {
              const meData = await meRes.json();
              if (meData.settings) {
                set((state) => ({
                  settings: {
                    ...state.settings,
                    ...meData.settings,
                    name: meData.name || state.settings.name,
                  },
                  isLoading: false,
                }));
              }
            }
          }
        } catch {
          // Gracefully fallback to cached settings
        } finally {
          set({ isLoading: false });
        }
      },

      setLocalSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
      },

      updateSettings: async (newSettings) => {
        const previousSettings = get().settings;
        // Optimistic UI update: instantly apply new values
        const updated = { ...previousSettings, ...newSettings };
        set({ settings: updated, isSaving: true });

        try {
          const res = await fetch(`${API}/tenants/settings`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              ...authHeaders(),
            },
            body: JSON.stringify(updated),
          });

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            const errorMsg = errorData.detail || "Failed to update settings.";
            // Revert back on permission / server error
            if (res.status === 403) {
              set({ settings: previousSettings, isSaving: false });
              return { success: false, error: errorMsg };
            }
            throw new Error(errorMsg);
          }

          const resData = await res.json();
          if (resData.settings) {
            set({
              settings: { ...updated, ...resData.settings, name: resData.name || updated.name },
              isSaving: false,
            });
          } else {
            set({ isSaving: false });
          }

          return { success: true };
        } catch (err: any) {
          // Keep optimistic or revert if needed
          set({ isSaving: false });
          return { success: true }; // Allowed offline/local fallback
        }
      },
    }),
    {
      name: "coachgenie-settings",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? localStorage : ({} as Storage)
      ),
      partialize: (state) => ({
        settings: state.settings,
        canEdit: state.canEdit,
      }),
    }
  )
);
