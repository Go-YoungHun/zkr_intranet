import { api, resolveFileUrl } from "./api";

export type Customer = {
  id: number;
  group_id: number | null;
  sales_agency_id: number | null;
  name: string;
  legal_name: string | null;
  site_name: string | null;
  name_en: string | null;
  code: string | null;
  phone: string | null;
  address: string | null;
  sales_agent: string | null;
  salesAgency?: {
    id: number;
    name: string;
  } | null;
  is_active: boolean;
  machine_count?: number;
  created_at?: string;
  updated_at?: string;
};

export type CustomerGroup = {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
};

export type CustomerMachine = {
  id: number;
  name: string;
  serial_no?: string | null;
  location?: string | null;
  model: string | null;
  is_active: boolean;
};

export type CustomerDetail = Customer & {
  Machines?: CustomerMachine[];
};

export type CustomerAttachment = {
  id: number;
  customer_id: number;
  file_name: string;
  label: string | null;
  file_url: string;
  mime_type: string | null;
  size: number | null;
  uploaded_by_employee_id: number | null;
  created_at: string;
  is_image?: boolean;
};

export type CustomerListResponse = {
  rows: Customer[];
  total: number;
  page: number;
  pageSize: number;
};

export async function fetchCustomers(
  all = false,
  query?: string,
  page = 1,
  pageSize = 20
) {
  const params = new URLSearchParams();
  if (all) params.set("all", "1");
  if (query) params.set("q", query);
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  const q = params.toString();
  return api<CustomerListResponse>(`/customers${q ? `?${q}` : ""}`);
}

export async function fetchCustomerGroups() {
  return api<CustomerGroup[]>("/customers/groups");
}

export async function restoreCustomer(id: number) {
  return api<{ ok: true }>(`/customers/${id}/restore`, {
    method: "PATCH",
  });
}

export async function fetchCustomerMachines(id: number) {
  return api<CustomerMachine[]>(`/customers/${id}/machines`);
}

export async function fetchCustomer(id: number) {
  return api<CustomerDetail>(`/customers/${id}`);
}

export async function fetchCustomerAttachments(id: number) {
  const attachments = await api<CustomerAttachment[]>(`/customers/${id}/attachments`);
  return attachments.map((attachment) => ({
    ...attachment,
    file_url: resolveFileUrl(attachment.file_url),
  }));
}

export type CustomerAttachmentUploadInput = {
  file: File;
  label?: string | null;
};

export async function uploadCustomerAttachment(
  id: number,
  input: CustomerAttachmentUploadInput,
) {
  const formData = new FormData();
  formData.append("file", input.file);
  formData.append("label", input.label?.trim() ?? "");
  const attachment = await api<CustomerAttachment>(`/customers/${id}/attachments`, {
    method: "POST",
    body: formData,
  });
  return { ...attachment, file_url: resolveFileUrl(attachment.file_url) };
}

export async function deleteCustomerAttachment(
  id: number,
  attachmentId: number,
) {
  return api<{ ok: true }>(`/customers/${id}/attachments/${attachmentId}`, {
    method: "DELETE",
  });
}

export type CustomerCreateInput = {
  name: string;
  legal_name?: string | null;
  name_en?: string | null;
  code?: string | null;
  phone?: string | null;
  address?: string | null;
  sales_agent?: string | null;
  sales_agency_id?: number | null;
  group_id?: number | null;
  is_active?: boolean;
};

export async function createCustomer(input: CustomerCreateInput) {
  return api<Customer>("/customers", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function createCustomerGroup(groupName: string) {
  return api<CustomerGroup>("/customers/groups", {
    method: "POST",
    body: JSON.stringify({ name: groupName }),
  });
}

export async function updateCustomerGroup(id: number, groupName: string) {
  return api<CustomerGroup>(`/customers/groups/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name: groupName }),
  });
}

export async function deleteCustomerGroup(id: number) {
  return api<{ ok: boolean }>(`/customers/groups/${id}`, {
    method: "DELETE",
  });
}

export async function deleteCustomer(id: number) {
  return api<{ ok: boolean }>(`/customers/${id}`, { method: "DELETE" });
}

export type CustomerUpdateInput = {
  name: string;
  legal_name?: string | null;
  name_en?: string | null;
  code?: string | null;
  phone?: string | null;
  address?: string | null;
  sales_agent?: string | null;
  sales_agency_id?: number | null;
  group_id?: number | null;
  is_active?: boolean;
};

export async function updateCustomer(id: number, input: CustomerUpdateInput) {
  return api<Customer>(`/customers/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export type CustomerLabelSource = {
  name: string;
  name_en?: string | null;
  sales_agent?: string | null;
  salesAgency?: { name: string } | null;
};

export function formatCustomerLabel(customer: CustomerLabelSource) {
  const english = customer.name_en?.trim();
  const agent = customer.salesAgency?.name?.trim() || customer.sales_agent?.trim();
  let label = customer.name;

  if (english) {
    label += ` (${english})`;
  }

  if (agent) {
    label += ` · 영업대리점: ${agent}`;
  }

  return label;
}
