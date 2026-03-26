import { api, resolveFileUrl } from "./api";

export type Machine = {
  id: number;
  name: string;
  model: string | null;
  software_name: string | null;
  serial_no: string | null;
  location: string | null;
  is_active: boolean;
  status: string | null;
  customer_id: number | null;
  machine_model_id?: number | null;
  software_installed_at?: string | null;
  owner_employee_id?: number | null;

  Customer?: {
    id: number;
    name: string;
    address: string | null;
    sales_agent?: string | null;
    salesAgency?: {
      id: number;
      name: string;
    } | null;
  };
  MachineModel?: {
    id: number;
    name: string;
  };
  Owner?: {
    id: number;
    name: string;
  } | null;
};

export type MachineTicket = {
  id: number;
  subject: string;
  status: string | null;
  priority: string | null;
};

export type MachineAttachment = {
  id: number;
  machine_id: number;
  file_name: string;
  label: string | null;
  file_url: string;
  mime_type: string | null;
  size: number | null;
  uploaded_by_employee_id: number | null;
  created_at: string;
  is_image?: boolean;
};

export type MachineDetail = Machine & {
  Tickets?: MachineTicket[];
};

export type MachineAttachmentUploadResult = {
  file_name: string;
  status: "success" | "failed";
  attachment: MachineAttachment | null;
  error: string | null;
};

export type MachineAttachmentsBulkUploadResponse = {
  results: MachineAttachmentUploadResult[];
  successCount: number;
  failureCount: number;
};

export type MachineCreateInput = {
  customer_id: number | null; // 고객사 선택 안하면 null 허용(원하면 필수로 바꿀 수 있음)
  name: string;
  model?: string | null;
  software_name?: string | null;
  serial_no?: string | null;
  location?: string | null;
  machine_model_id?: number | null;
  status?: string | null;
  software_installed_at?: string | null;
  owner_employee_id?: number | null;
};

export async function createMachine(input: MachineCreateInput) {
  return api<Machine>("/machines", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export type MachineListResponse = {
  rows: Machine[];
  total: number;
  page: number;
  pageSize: number;
};

export async function fetchMachines(
  all = false,
  query?: string,
  page?: number,
  pageSize?: number,
) {
  const params = new URLSearchParams();
  if (all) params.set("all", "1");
  if (query) params.set("q", query);
  if (page) params.set("page", String(page));
  if (pageSize) params.set("pageSize", String(pageSize));
  const q = params.toString();
  return api<MachineListResponse>(`/machines${q ? `?${q}` : ""}`);
}

export async function fetchMachine(id: number) {
  return api<MachineDetail>(`/machines/${id}`);
}

export async function deleteMachine(id: number) {
  return api<{ ok: true }>(`/machines/${id}`, { method: "DELETE" });
}

export async function restoreMachine(id: number) {
  return api<{ ok: true }>(`/machines/${id}/restore`, { method: "PATCH" });
}
export type MachineUpdateInput = {
  customer_id: number;
  name: string;
  model?: string | null;
  software_name?: string | null;
  serial_no?: string | null;
  location?: string | null;
  machine_model_id?: number | null;
  is_active?: boolean;
  status?: string | null;
  software_installed_at?: string | null;
  owner_employee_id?: number | null;
};
export async function updateMachine(id: number, input: MachineUpdateInput) {
  return api<Machine>(`/machines/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function fetchMachineTickets(id: number) {
  return api<MachineTicket[]>(`/machines/${id}/tickets`);
}

export async function fetchMachineAttachments(id: number) {
  const attachments = await api<MachineAttachment[]>(`/machines/${id}/attachments`);
  return attachments.map((attachment) => ({
    ...attachment,
    file_url: resolveFileUrl(attachment.file_url),
  }));
}

export type MachineAttachmentUploadInput = {
  file: File;
  label?: string | null;
};

export async function uploadMachineAttachments(
  id: number,
  inputs: MachineAttachmentUploadInput[],
) {
  const formData = new FormData();
  inputs.forEach(({ file, label }) => {
    formData.append("files", file);
    formData.append("labels", label?.trim() ?? "");
  });
  const response = await api<MachineAttachmentsBulkUploadResponse>(
    `/machines/${id}/attachments/bulk`,
    {
      method: "POST",
      body: formData,
    },
  );
  return {
    ...response,
    results: response.results.map((result) => ({
      ...result,
      attachment: result.attachment
        ? {
            ...result.attachment,
            file_url: resolveFileUrl(result.attachment.file_url),
          }
        : null,
    })),
  };
}

export async function uploadMachineAttachment(
  id: number,
  input: MachineAttachmentUploadInput,
) {
  const formData = new FormData();
  formData.append("file", input.file);
  formData.append("label", input.label?.trim() ?? "");
  const attachment = await api<MachineAttachment>(`/machines/${id}/attachments`, {
    method: "POST",
    body: formData,
  });
  return { ...attachment, file_url: resolveFileUrl(attachment.file_url) };
}

export async function deleteMachineAttachment(
  id: number,
  attachmentId: number,
) {
  return api<{ ok: true }>(`/machines/${id}/attachments/${attachmentId}`, {
    method: "DELETE",
  });
}
