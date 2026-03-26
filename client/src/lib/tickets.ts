import { api, resolveFileUrl } from "./api";

export type TicketComment = {
  id: number;
  comment: string;
  created_at?: string | null;
  updated_at?: string | null;
  Employee?: {
    id: number;
    name: string;
    login_id?: string | null;
  };
};

export type TicketAttachmentType =
  | "photo"
  | "service_report"
  | "log_file"
  | "certificate"
  | "etc";

export type TicketAttachment = {
  id: number;
  ticket_id: number;
  file_name: string;
  label: string | null;
  attachment_type: TicketAttachmentType;
  file_url: string;
  mime_type: string | null;
  size: number | null;
  uploaded_by_employee_id: number | null;
  created_at: string;
};

export type TicketCategory = {
  id: number;
  name: string;
  description?: string | null;
  is_active?: boolean;
};

export type Ticket = {
  id: number;
  subject: string;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  customer_id: number;
  machine_id?: number | null;
  category_id?: number | null;
  opened_by_employee_id?: number | null;
  assigned_to_employee_id?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  opened_at?: string | null;
  closed_at?: string | null;
  Customer?: {
    id: number;
    name: string;
    name_en?: string | null;
    sales_agent?: string | null;
  };
  Machine?: {
    id: number;
    name: string;
    serial_no?: string | null;
  };
  TicketCategory?: {
    id: number;
    name: string;
  };
  openedBy?: {
    id: number;
    name: string;
    login_id?: string | null;
  };
  assignedTo?: {
    id: number;
    name: string;
    login_id?: string | null;
  };
  TicketComments?: TicketComment[];
};

export type TicketCreateInput = {
  customer_id: number;
  subject: string;
  machine_id?: number | null;
  category_id: number;
  opened_by_employee_id?: number | null;
  assigned_to_employee_id?: number | null;
  description?: string | null;
  priority?: string | null;
  status?: string | null;
  opened_at?: string | null;
  closed_at?: string | null;
};

export type TicketCategoryCreateInput = {
  name: string;
  description?: string | null;
  is_active?: boolean;
};

export type TicketCategoryUpdateInput = {
  name?: string;
  description?: string | null;
  is_active?: boolean;
};

export type TicketUpdateInput = {
  customer_id?: number;
  machine_id?: number | null;
  category_id?: number | null;
  opened_by_employee_id?: number | null;
  assigned_to_employee_id?: number | null;
  subject?: string;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  opened_at?: string | null;
  closed_at?: string | null;
};

export type TicketStatusUpdateInput = {
  status: string;
  closed_at?: string | null;
};

export type TicketCommentInput = {
  comment: string;
};

export type TicketPreset = {
  customerId?: number;
  machineId?: number;
};

export type TicketListResponse = {
  rows: Ticket[];
  total: number;
  page: number;
  pageSize: number;
};

export type TicketListParams = {
  query?: string;
  page?: number;
  pageSize?: number;
  customerId?: number;
};

const normalizePresetValue = (value?: number | string | null) => {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
};

export function normalizeTicketPreset(input: {
  customerId?: number | string | null;
  machineId?: number | string | null;
}): TicketPreset {
  return {
    customerId: normalizePresetValue(input.customerId),
    machineId: normalizePresetValue(input.machineId),
  };
}

export async function fetchTickets(params: TicketListParams = {}) {
  const searchParams = new URLSearchParams();
  if (params.query) searchParams.set("query", params.query);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.pageSize) searchParams.set("pageSize", String(params.pageSize));
  if (params.customerId)
    searchParams.set("customerId", String(params.customerId));
  const queryString = searchParams.toString();
  return api<TicketListResponse>(
    `/tickets${queryString ? `?${queryString}` : ""}`,
  );
}

export async function fetchTicketsByCustomer(customerId: number) {
  return fetchTickets({ customerId });
}

export async function fetchTicketCategories() {
  return api<TicketCategory[]>("/tickets/categories");
}

export async function fetchTicket(id: number) {
  return api<Ticket>(`/tickets/${id}`);
}

export async function createTicket(input: TicketCreateInput) {
  return api<Ticket>("/tickets", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function createTicketCategory(input: TicketCategoryCreateInput) {
  return api<TicketCategory>("/tickets/categories", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateTicketCategory(
  id: number,
  input: TicketCategoryUpdateInput,
) {
  return api<TicketCategory>(`/tickets/categories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function updateTicket(id: number, input: TicketUpdateInput) {
  return api<Ticket>(`/tickets/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function updateTicketStatus(
  id: number,
  input: TicketStatusUpdateInput,
) {
  return api<Ticket>(`/tickets/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function addTicketComment(id: number, input: TicketCommentInput) {
  return api<TicketComment>(`/tickets/${id}/comments`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function fetchTicketAttachments(id: number) {
  const attachments = await api<TicketAttachment[]>(`/tickets/${id}/attachments`);
  return attachments.map((attachment) => ({
    ...attachment,
    file_url: resolveFileUrl(attachment.file_url),
  }));
}

export type TicketAttachmentUploadInput = {
  file: File;
  label?: string | null;
  attachment_type: TicketAttachmentType;
};

export async function uploadTicketAttachment(
  id: number,
  input: TicketAttachmentUploadInput,
) {
  const formData = new FormData();
  formData.append("file", input.file);
  formData.append("label", input.label?.trim() ?? "");
  formData.append("attachment_type", input.attachment_type);
  const attachment = await api<TicketAttachment>(`/tickets/${id}/attachments`, {
    method: "POST",
    body: formData,
  });
  return { ...attachment, file_url: resolveFileUrl(attachment.file_url) };
}

export async function deleteTicketAttachment(id: number, attachmentId: number) {
  return api<{ ok: true }>(`/tickets/${id}/attachments/${attachmentId}`, {
    method: "DELETE",
  });
}
