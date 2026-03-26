import { api } from "./api";

export type MachineModel = {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
};

export async function fetchMachineModels() {
  return api<MachineModel[]>("/machine-models");
}

export async function createMachineModel(name: string) {
  return api<MachineModel>("/machine-models", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function updateMachineModel(id: number, name: string) {
  return api<MachineModel>(`/machine-models/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name }),
  });
}

export async function deleteMachineModel(id: number) {
  return api<{ ok: true }>(`/machine-models/${id}`, {
    method: "DELETE",
  });
}
