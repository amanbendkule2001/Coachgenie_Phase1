import { apiClient } from "../lib/axios";

export interface LeadCreate {
  full_name:              string;
  email?:                 string;
  phone?:                 string;
  source?:                string;
  status?:                string;
  interested_course?:     string;
  grade?:                 string;
  school_name?:           string;
  parent_name?:           string;
  parent_contact_number?: string;
  board_name?:            string;
  batch_id?:              string;
  assigned_to?:           string;
  notes?:                 string;
}

export const leadsService = {
  list: (params?: { page?: number; limit?: number; status?: string; search?: string; batch_id?: string }) =>
    apiClient.get("/leads/", { params }),

  get: (id: string) =>
    apiClient.get(`/leads/${id}`),

  create: (data: LeadCreate) =>
    apiClient.post("/leads/", data),

  update: (id: string, data: Partial<LeadCreate>) =>
    apiClient.patch(`/leads/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/leads/${id}`),

  assignCounselor: (id: string, counselorId: string) =>
    apiClient.post(`/leads/${id}/assign-counselor`, { counselor_id: counselorId }),

  changeStage: (id: string, stage: string) =>
    apiClient.post(`/leads/${id}/change-stage`, { stage }),

  scheduleFollowup: (id: string, followupDate: string, notes?: string) =>
    apiClient.post(`/leads/${id}/schedule-followup`, { follow_up_date: followupDate, notes }),

  convert: (id: string, data?: { applied_course?: string; academic_year?: string; remarks?: string }) =>
    apiClient.post(`/leads/${id}/convert`, data ?? {}),

  addActivity: (id: string, data: { type: string; description?: string }) =>
    apiClient.post(`/leads/${id}/activities`, data),

  getActivities: (id: string) =>
    apiClient.get(`/leads/${id}/activities`),
};
