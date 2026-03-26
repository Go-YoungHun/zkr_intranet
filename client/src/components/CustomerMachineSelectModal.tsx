import { useEffect, useMemo, useState } from "react";
import type { Customer } from "../lib/customers";
import { formatCustomerLabel } from "../lib/customers";
import type { Machine } from "../lib/machines";
import FormButton from "./FormButton";
import Modal from "./Modal";

type SelectionMode = "customer" | "machine";

type CustomerMachineSelectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  machines: Machine[];
  selectedCustomerId?: number | null;
  selectedMachineId?: number | null;
  initialMode?: SelectionMode;
  onSelectCustomer: (customer: Customer) => void;
  onSelectMachine: (machine: Machine) => void;
  onResetCustomerSelection?: () => void;
  onResetMachineSelection?: () => void;
};

export default function CustomerMachineSelectModal({
  isOpen,
  onClose,
  customers,
  machines,
  selectedCustomerId,
  selectedMachineId,
  initialMode = "customer",
  onSelectCustomer,
  onSelectMachine,
  onResetCustomerSelection,
  onResetMachineSelection,
}: CustomerMachineSelectModalProps) {
  const [mode, setMode] = useState<SelectionMode>(initialMode);
  const [query, setQuery] = useState("");
  const [activeCustomerId, setActiveCustomerId] = useState<number | null>(
    selectedCustomerId ?? null,
  );

  useEffect(() => {
    if (!isOpen) return;
    setMode(initialMode);
    setQuery("");
    setActiveCustomerId(selectedCustomerId ?? null);
  }, [initialMode, isOpen, selectedCustomerId]);

  const filteredCustomers = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return customers;
    return customers.filter((customer) => {
      const haystack = [
        customer.name,
        customer.name_en,
        customer.sales_agent,
        customer.salesAgency?.name,
        String(customer.id),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(trimmed);
    });
  }, [customers, query]);

  const filteredMachines = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    const baseMachines = activeCustomerId
      ? machines.filter((machine) => machine.customer_id === activeCustomerId)
      : machines;

    if (!trimmed) return baseMachines;

    return baseMachines.filter((machine) => {
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
  }, [activeCustomerId, machines, query]);

  const activeCustomer = useMemo(() => {
    if (!activeCustomerId) return null;
    return customers.find((customer) => customer.id === activeCustomerId) ?? null;
  }, [activeCustomerId, customers]);

  const handleResetSelection = () => {
    const shouldResetMachineOnly =
      mode === "machine" && selectedMachineId != null && onResetMachineSelection;

    if (shouldResetMachineOnly) {
      onResetMachineSelection();
      setQuery("");
      return;
    }

    onResetCustomerSelection?.();
    setActiveCustomerId(null);
    setQuery("");
    if (mode === "machine") {
      setMode("customer");
    }
  };

  return (
    <Modal isOpen={isOpen} title="고객사/장비 검색" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          단계 안내: 고객사 선택 → 장비 선택
        </div>
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
            fontSize: 13,
            color: "#374151",
          }}
        >
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="radio"
              name="customer-machine-mode"
              value="customer"
              checked={mode === "customer"}
              onChange={() => {
                setMode("customer");
                setQuery("");
              }}
            />
            고객사로 검색
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="radio"
              name="customer-machine-mode"
              value="machine"
              checked={mode === "machine"}
              onChange={() => {
                setMode("machine");
                setQuery("");
              }}
            />
            장비로 검색
          </label>
        </div>

        <input
          placeholder={mode === "customer" ? "고객사명 또는 ID 검색" : "장비명 또는 ID 검색"}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          style={{ padding: 8 }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <FormButton type="button" variant="secondary" onClick={handleResetSelection}>
            초기화
          </FormButton>
        </div>

        {mode === "machine" && activeCustomer ? (
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            선택된 고객사: {formatCustomerLabel(activeCustomer)}
          </div>
        ) : mode === "machine" ? (
          <div style={{ fontSize: 12, color: "#6b7280" }}>
            고객사를 선택하면 해당 고객사 장비로 필터됩니다.
          </div>
        ) : null}

        <div style={{ display: "grid", gap: 8, maxHeight: 320, overflowY: "auto" }}>
          {mode === "customer" ? (
            filteredCustomers.length === 0 ? (
              <div style={{ color: "#6b7280" }}>검색 결과가 없습니다.</div>
            ) : (
              filteredCustomers.map((customer) => {
                const isSelected = selectedCustomerId === customer.id;
                return (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => {
                      onSelectCustomer(customer);
                      setActiveCustomerId(customer.id);
                      setMode("machine");
                      setQuery("");
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
                    <span style={{ fontWeight: 600 }}>
                      {formatCustomerLabel(customer)}
                    </span>
                    <span style={{ color: "#6b7280", fontSize: 12 }}>
                      ID: {customer.id}
                    </span>
                  </button>
                );
              })
            )
          ) : filteredMachines.length === 0 ? (
            <div style={{ color: "#6b7280" }}>검색 결과가 없습니다.</div>
          ) : (
            filteredMachines.map((machine) => {
              const isSelected = selectedMachineId === machine.id;
              return (
                <button
                  key={machine.id}
                  type="button"
                  onClick={() => {
                    onSelectMachine(machine);
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
      </div>
    </Modal>
  );
}
