import { useEffect, useMemo, useState } from "react";
import type { Machine } from "../lib/machines";
import { fetchMachines } from "../lib/machines";
import Modal from "./Modal";

type MachineSelectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (machine: Machine) => void;
  selectedMachineId?: number | null;
  customerId?: number | null;
};

export default function MachineSelectModal({
  isOpen,
  onClose,
  onSelect,
  selectedMachineId,
  customerId,
}: MachineSelectModalProps) {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    setQuery("");
    fetchMachines(false, undefined, 1, 1000)
      .then((data) => setMachines(data.rows))
      .catch((fetchError: any) => {
        setError(fetchError?.message || "장비 목록을 불러오지 못했습니다.");
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  const filteredMachines = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    const customerFiltered = customerId
      ? machines.filter((machine) => machine.customer_id === customerId)
      : machines;
    if (!trimmed) return customerFiltered;

    return customerFiltered.filter((machine) => {
      const haystack = [
        machine.name,
        machine.model,
        machine.serial_no,
        machine.location,
        machine.Customer?.name,
        String(machine.id),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(trimmed);
    });
  }, [customerId, machines, query]);

  return (
    <Modal isOpen={isOpen} title="장비 검색" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          placeholder="장비명 또는 ID 검색"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          style={{ padding: 8 }}
        />

        {loading && <div style={{ color: "#6b7280" }}>장비 불러오는 중...</div>}
        {error && <div style={{ color: "crimson" }}>{error}</div>}

        {!loading && !error && (
          <div style={{ display: "grid", gap: 8, maxHeight: 320, overflowY: "auto" }}>
            {filteredMachines.length === 0 ? (
              <div style={{ color: "#6b7280" }}>검색 결과가 없습니다.</div>
            ) : (
              filteredMachines.map((machine) => {
                const isSelected = selectedMachineId === machine.id;
                return (
                  <button
                    key={machine.id}
                    type="button"
                    onClick={() => {
                      onSelect(machine);
                      onClose();
                    }}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "1px solid #e5e7eb",
                      background: isSelected ? "#eef2ff" : "#fff",
                      textAlign: "left",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{machine.name}</span>
                    <span style={{ color: "#6b7280", fontSize: 12 }}>
                      {machine.Customer?.name ? `${machine.Customer.name} · ` : ""}ID: {machine.id}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
