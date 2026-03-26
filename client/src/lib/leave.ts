import { api } from "./api";

export type LeaveStatus = "pending" | "approved" | "rejected";
export type LeaveUnit = "full" | "half_am" | "half_pm";

export type LeaveSummary = {
  total_days: number;
  used_days: number;
  pending_days: number;
  remaining_days: number;
};

export type LeaveRequestItem = {
  id: number;
  employee_id: number;
  start_date: string;
  end_date: string;
  leave_unit: LeaveUnit;
  duration_days: number;
  reason: string;
  status: LeaveStatus;
  review_comment: string | null;
  reviewed_at: string | null;
  requester?: {
    id: number;
    name: string;
    login_id: string;
    permission_level: number;
  };
  reviewer?: {
    id: number;
    name: string;
    login_id: string;
  } | null;
  created_at: string;
};

export type LeaveCreateInput = {
  start_date: string;
  end_date: string;
  leave_unit: LeaveUnit;
  reason: string;
};

export async function fetchLeaveSummary() {
  return api<LeaveSummary>("/leaves/summary");
}

export async function fetchLeaveRequests() {
  return api<LeaveRequestItem[]>("/leaves");
}

export async function createLeaveRequest(payload: LeaveCreateInput) {
  return api<LeaveRequestItem>("/leaves", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateLeaveStatus(id: number, status: Exclude<LeaveStatus, "pending">) {
  return api<LeaveRequestItem>(`/leaves/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
