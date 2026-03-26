import { api } from "./api";

export type InventoryTransactionType = "IN" | "OUT" | "ADJUST";

export type Inventory = {
  id: number;
  serial_no: string | null;
  category: string;
  asset_name: string;
  quantity: number;
  location: string | null;
  note: string | null;
  latest_transaction_type?: InventoryTransactionType | null;
  latest_transaction_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type InventoryTransaction = {
  id: number;
  inventory_id: number;
  type: InventoryTransactionType;
  quantity_delta: number;
  reason: string;
  note: string | null;
  created_by_employee_id: number;
  created_at: string;
};

export type InventoryPagination = {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
};

export type InventoryListResponse = {
  rows: Inventory[];
  pagination: InventoryPagination;
};

export type InventoryTransactionListResponse = {
  rows: InventoryTransaction[];
};

export type InventoryQuery = {
  includeZero?: boolean;
  query?: string;
  location?: string;
  page?: number;
  limit?: number;
};

export type InventoryCreateInput = {
  serial_no?: string | null;
  category: string;
  asset_name: string;
  quantity?: number;
  location?: string | null;
  note?: string | null;
};

export type InventoryUpdateInput = {
  serial_no?: string | null;
  category?: string;
  asset_name?: string;
  quantity?: number;
  location?: string | null;
  note?: string | null;
};

export type InventoryTransactionCreateInput = {
  type: InventoryTransactionType;
  quantity: number;
  reason: string;
  note?: string | null;
};

export async function fetchInventories(params: InventoryQuery = {}) {
  const searchParams = new URLSearchParams();
  if (params.includeZero) searchParams.set("include_zero", "1");
  if (params.query) searchParams.set("q", params.query);
  if (params.location) searchParams.set("location", params.location);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));
  const queryString = searchParams.toString();

  return api<InventoryListResponse>(
    `/inventories${queryString ? `?${queryString}` : ""}`
  );
}

export async function createInventory(input: InventoryCreateInput) {
  return api<Inventory>("/inventories", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateInventory(id: number, input: InventoryUpdateInput) {
  return api<Inventory>(`/inventories/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteInventory(id: number) {
  return api<{ ok: boolean }>(`/inventories/${id}`, {
    method: "DELETE",
  });
}

export async function createInventoryTransaction(
  id: number,
  input: InventoryTransactionCreateInput
) {
  return api<{ inventory: Inventory; transaction: InventoryTransaction }>(
    `/inventories/${id}/transactions`,
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );
}

export async function fetchInventoryTransactions(id: number) {
  return api<InventoryTransactionListResponse>(`/inventories/${id}/transactions`);
}
