import { api } from "./api";

export type AuditLogActor = {
  id: number;
  name: string;
  login_id?: string | null;
};

export type AuditLog = {
  id: number;
  entity_type: string;
  entity_id: string;
  action: "create" | "update" | "delete";
  actor_employee_id?: number | null;
  performed_by_employee_id?: number | null;
  on_behalf_of_employee_id?: number | null;
  changed_fields_json?: string[] | null;
  before_json?: Record<string, unknown> | null;
  after_json?: Record<string, unknown> | null;
  created_at: string;
  actor?: AuditLogActor | null;
  performedBy?: AuditLogActor | null;
  onBehalfOf?: AuditLogActor | null;
};

export type AuditLogListResponse = {
  rows: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
};

export type FetchAuditLogsParams = {
  entityType?: string;
  entityId?: string | number;
  action?: AuditLog["action"] | "";
  actorEmployeeId?: number;
  performedByEmployeeId?: number;
  from?: string;
  to?: string;
  q?: string;
  dateFrom?: string;
  dateTo?: string;
  worker?: string;
  query?: string;
  page?: number;
  pageSize?: number;
};

export async function fetchAuditLogs(params: FetchAuditLogsParams = {}) {
  const searchParams = new URLSearchParams();
  if (params.entityType) searchParams.set("entityType", params.entityType);
  if (params.entityId !== undefined && params.entityId !== null) {
    searchParams.set("entityId", String(params.entityId));
  }
  if (params.action) searchParams.set("action", params.action);
  if (params.actorEmployeeId) searchParams.set("actorEmployeeId", String(params.actorEmployeeId));
  if (params.performedByEmployeeId)
    searchParams.set("performedByEmployeeId", String(params.performedByEmployeeId));
  if (params.from || params.dateFrom) searchParams.set("from", params.from ?? params.dateFrom ?? "");
  if (params.to || params.dateTo) searchParams.set("to", params.to ?? params.dateTo ?? "");
  if (params.worker) searchParams.set("worker", params.worker);
  if (params.q || params.query) searchParams.set("q", params.q ?? params.query ?? "");
  if (params.page) searchParams.set("page", String(params.page));
  if (params.pageSize) searchParams.set("pageSize", String(params.pageSize));

  const queryString = searchParams.toString();
  return api<AuditLogListResponse>(`/audit-logs${queryString ? `?${queryString}` : ""}`);
}
