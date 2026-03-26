import { api } from "./api";

export type Employee = {
  id: number;
  login_id: string;
  name: string;
  hire_date: string; // YYYY-MM-DD
  is_active: boolean;
  last_login_at: string | null;
  permission_level: number;
  department?: string | null;
  job_title?: string | null;
  employment_status?: "ACTIVE" | "ON_LEAVE" | "RESIGNED";
};

export type EmployeeCreateInput = {
  login_id: string;
  name: string;
  hire_date: string;
  password: string;
};

export type EmployeeUpdateInput = {
  name: string;
  hire_date: string;
  is_active?: boolean;
};

export async function fetchEmployees(all = false) {
  const q = all ? "?all=1" : "";
  return api<Employee[]>(`/employees${q}`);
}

export async function createEmployee(input: EmployeeCreateInput) {
  return api<Employee>("/employees", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateEmployee(id: number, input: EmployeeUpdateInput) {
  return api<Employee>(`/employees/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deleteEmployee(id: number) {
  return api<{ ok: true }>(`/employees/${id}`, { method: "DELETE" });
}

export async function restoreEmployee(id: number) {
  return api<{ ok: true }>(`/employees/${id}/restore`, { method: "PATCH" });
}

export async function changeEmployeePassword(id: number, password: string) {
  return api<{ ok: true }>(`/employees/${id}/password`, {
    method: "PATCH",
    body: JSON.stringify({ password }),
  });
}

export async function changeEmployeePermission(id: number, permissionLevel: number) {
  return api<{ ok: true }>(`/employees/${id}/permission`, {
    method: "PATCH",
    body: JSON.stringify({ permission_level: permissionLevel }),
  });
}
