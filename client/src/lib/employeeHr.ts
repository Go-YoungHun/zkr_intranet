import { api } from "./api";

export type EmploymentStatus = "ACTIVE" | "ON_LEAVE" | "RESIGNED";

export type EmployeeHrRow = {
  id: number;
  login_id: string;
  name: string;
  hire_date: string;
  is_active: boolean;
  permission_level: number;
  department: string | null;
  job_title: string | null;
  employment_status: EmploymentStatus;
  contact_phone: string | null;
  contact_email: string | null;
  address_line1: string | null;
  address_line2: string | null;
  note: string | null;
  can_edit_sensitive: boolean;
  is_sensitive_masked: boolean;
};

export type EmployeeHrUpdateInput = {
  department?: string | null;
  job_title?: string | null;
  employment_status?: EmploymentStatus;
  contact_phone?: string | null;
  contact_email?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  note?: string | null;
};

export async function fetchEmployeeHrList() {
  return api<EmployeeHrRow[]>("/employees/hr");
}

export async function updateEmployeeHr(id: number, input: EmployeeHrUpdateInput) {
  return api<EmployeeHrRow>(`/employees/${id}/hr`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
