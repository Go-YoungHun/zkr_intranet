import { api } from "./api";

export type SalesAgency = {
  id: number;
  name: string;
  customer_count?: number;
  created_at?: string;
  updated_at?: string;
};

export type SalesAgencyCustomer = {
  id: number;
  name: string;
  code?: string | null;
};

export async function fetchSalesAgencies() {
  return api<SalesAgency[]>("/sales-agencies");
}

export async function fetchSalesAgencyCustomers(id: number) {
  return api<SalesAgencyCustomer[]>(`/sales-agencies/${id}/customers`);
}

export async function createSalesAgency(name: string) {
  return api<SalesAgency>("/sales-agencies", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function updateSalesAgency(id: number, name: string) {
  return api<SalesAgency>(`/sales-agencies/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name }),
  });
}

export async function deleteSalesAgency(id: number) {
  return api<{ ok: boolean }>(`/sales-agencies/${id}`, {
    method: "DELETE",
  });
}
