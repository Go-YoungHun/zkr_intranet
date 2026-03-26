import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMachines, createMachine } from "../lib/machines";
import type { Machine } from "../lib/machines";
import { formatCustomerLabel } from "../lib/customers";
import { fetchEmployees } from "../lib/employees";
import type { Employee } from "../lib/employees";
import { fetchMachineModels } from "../lib/machineModels";
import type { MachineModel } from "../lib/machineModels";

import Modal from "../components/Modal";
import CustomerSelectModal from "../components/CustomerSelectModal";
import FormButton from "../components/FormButton";

const formatDateOnly = (value?: string | null) => {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(parsed);
};

export default function MachinesPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [machineModels, setMachineModels] = useState<MachineModel[]>([]);
  const [machineModelsError, setMachineModelsError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeesError, setEmployeesError] = useState<string | null>(null);

  // 폼 state
  const [customerId, setCustomerId] = useState<number | "">("");
  const [customerName, setCustomerName] = useState("");
  const [name, setName] = useState("");
  const [model, setModel] = useState("");
  const [softwareName, setSoftwareName] = useState("");
  const [machineModelId, setMachineModelId] = useState<number | "">("");
  const [location, setLocation] = useState("");
  const [softwareInstalledAt, setSoftwareInstalledAt] = useState("");
  const [ownerEmployeeId, setOwnerEmployeeId] = useState<number | "">("");

  const resetForm = () => {
    setCustomerId("");
    setCustomerName("");
    setName("");
    setModel("");
    setSoftwareName("");
    setMachineModelId("");
    setLocation("");
    setSoftwareInstalledAt("");
    setOwnerEmployeeId("");
  };

  const openCreateModal = () => {
    setError(null);
    resetForm();
    setIsFormOpen(true);
  };

  const closeFormModal = () => {
    if (saving) return;
    setIsFormOpen(false);
    setIsCustomerModalOpen(false);
    setError(null);
    resetForm();
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const mData = await fetchMachines(false, debouncedQuery, page, pageSize);
      setRows(mData.rows);
      setTotal(mData.total);
      setPage(mData.page);
      setPageSize(mData.pageSize);
    } catch (e: any) {
      setError(e?.message || "장비 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const loadMachineModels = async () => {
    setMachineModelsError(null);
    try {
      const data = await fetchMachineModels();
      setMachineModels(data);
    } catch (e: any) {
      setMachineModelsError(e?.message || "장비 모델 목록을 불러오지 못했습니다.");
    }
  };

  const loadEmployees = async () => {
    setEmployeesError(null);
    try {
      const data = await fetchEmployees(true);
      setEmployees(data);
    } catch (e: any) {
      setEmployeesError(e?.message || "담당자 목록을 불러오지 못했습니다.");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, page, pageSize]);

  useEffect(() => {
    loadMachineModels();
    loadEmployees();
  }, []);

  const onSubmit = async () => {
    if (!name.trim()) {
      setError("장비 식별명은 필수입니다.");
      return;
    }
    if (customerId === "") {
      setError("고객사를 선택해주세요.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        customer_id: Number(customerId),
        name: name.trim(),
        model: model.trim() || null,
        software_name: softwareName.trim() || null,
        location: location.trim() || null,
        machine_model_id: machineModelId === "" ? null : Number(machineModelId),
        software_installed_at: softwareInstalledAt || null,
        owner_employee_id: ownerEmployeeId === "" ? null : Number(ownerEmployeeId),
      };

      await createMachine(payload);

      resetForm();
      await load();
      setIsFormOpen(false);
    } catch (e: any) {
      setError(e?.message || "등록 실패");
    } finally {
      setSaving(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    setDebouncedQuery(query.trim());
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const clampedPage = Math.min(page, totalPages);

  const goToPage = (nextPage: number) => {
    const target = Math.min(Math.max(nextPage, 1), totalPages);
    if (target !== page) {
      setPage(target);
    }
  };

  const getPageNumbers = () => {
    const maxVisible = 5;
    let start = Math.max(1, clampedPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  };

  if (loading) return <div style={{ padding: 24 }}>로딩중...</div>;

  return (
    <div style={{ padding: 24 }}>
      {/* 상단 타이틀/컨트롤 */}
      <div className="action-bar">
        <h2 style={{ margin: 0 }}>장비 목록</h2>

        <div className="action-bar__actions">
          <input
            placeholder="장비 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleSearch();
              }
            }}
            style={{ padding: 8, minWidth: 200 }}
          />
          <FormButton type="button" onClick={handleSearch}>
            검색
          </FormButton>
          <FormButton
            type="button"
            variant="secondary"
            onClick={() => navigate("/machines/models")}
          >
            장비 모델 관리
          </FormButton>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "#6b7280" }}>페이지 크기</span>
            <select
              value={pageSize}
              onChange={(event) => {
                setPage(1);
                setPageSize(Number(event.target.value));
              }}
              style={{ padding: 6 }}
            >
              {[10, 20, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          <FormButton type="button" onClick={openCreateModal}>
            등록
          </FormButton>
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ color: "#6b7280", fontSize: 13 }}>
          총 {total.toLocaleString()}건 · {clampedPage}/{totalPages} 페이지
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <FormButton
            type="button"
            variant="secondary"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
          >
            이전
          </FormButton>
          {getPageNumbers().map((pageNumber) => (
            <FormButton
              key={pageNumber}
              type="button"
              variant="secondary"
              onClick={() => goToPage(pageNumber)}
              className={pageNumber === clampedPage ? "pagination-button--active" : undefined}
            >
              {pageNumber}
            </FormButton>
          ))}
          <FormButton
            type="button"
            variant="secondary"
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages}
          >
            다음
          </FormButton>
        </div>
      </div>

      <Modal isOpen={isFormOpen} title="장비 등록" onClose={closeFormModal}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FormButton
              type="button"
              variant="secondary"
              onClick={() => setIsCustomerModalOpen(true)}
              disabled={saving}
            >
              고객사 선택
            </FormButton>
            <span style={{ color: customerId ? "#111827" : "#6b7280", minWidth: 180 }}>
              {customerId ? customerName || `ID: ${customerId}` : "선택된 고객사 없음"}
            </span>
          </div>

          <input
            placeholder="장비 식별명(필수)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ padding: 8, minWidth: 180 }}
            disabled={saving}
          />
          <select
            value={machineModelId}
            onChange={(event) => {
              const value = event.target.value;
              if (!value) {
                setMachineModelId("");
                return;
              }
              const selected = machineModels.find(
                (item) => item.id === Number(value),
              );
              setMachineModelId(Number(value));
              if (selected) {
                setModel(selected.name);
              }
            }}
            style={{ padding: 8, minWidth: 180 }}
            disabled={saving}
          >
            <option value="">모델 선택(직접 입력)</option>
            {machineModels.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <input
            placeholder="모델명 직접 입력"
            value={model}
            onChange={(e) => {
              setModel(e.target.value);
              if (machineModelId !== "") {
                setMachineModelId("");
              }
            }}
            style={{ padding: 8 }}
            disabled={saving}
          />
          <input
            placeholder="소프트웨어"
            value={softwareName}
            onChange={(e) => setSoftwareName(e.target.value)}
            style={{ padding: 8, minWidth: 180 }}
            disabled={saving}
          />
          <input
            placeholder="위치"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            style={{ padding: 8, minWidth: 180 }}
            disabled={saving}
          />
          <input
            type="date"
            placeholder="소프트웨어 설치일자"
            value={softwareInstalledAt}
            onChange={(e) => setSoftwareInstalledAt(e.target.value)}
            style={{ padding: 8, minWidth: 180 }}
            disabled={saving}
          />
          <select
            value={ownerEmployeeId}
            onChange={(event) => {
              const value = event.target.value;
              setOwnerEmployeeId(value ? Number(value) : "");
            }}
            style={{ padding: 8, minWidth: 180 }}
            disabled={saving}
          >
            <option value="">담당자 선택(없음)</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>

          <FormButton type="button" onClick={onSubmit} disabled={saving}>
            {saving ? "추가 중..." : "장비 추가"}
          </FormButton>
        </div>

        {(error || machineModelsError || employeesError) && (
          <div style={{ marginTop: 8, color: "crimson" }}>
            {error || machineModelsError || employeesError}
          </div>
        )}
      </Modal>

      <CustomerSelectModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSelect={(customer) => {
          setCustomerId(customer.id);
          setCustomerName(formatCustomerLabel(customer));
          setError(null);
        }}
        selectedCustomerId={customerId === "" ? null : Number(customerId)}
      />

      <div style={{ marginTop: 16 }}>
        {rows.length === 0 ? (
          <div style={{ padding: 16, border: "1px dashed #ddd", color: "#666" }}>
            데이터가 없습니다.
          </div>
        ) : (
          <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
              <thead style={{ background: "#f9fafb", textAlign: "left" }}>
                <tr>
                  {[
                    "번호",
                    "상태",
                    "소프트웨어",
                    "설치일자",
                    "장비이름",
                    "담당자",
                    "고객업체",
                    "영업대리점",
                    "지역",
                  ].map((label) => (
                    <th
                      key={label}
                      style={{
                        padding: "12px 14px",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#4b5563",
                        borderBottom: "1px solid #e5e7eb",
                      }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => {
                  const title = m.name?.trim()
                    ? m.name
                    : m.serial_no?.trim()
                      ? m.serial_no
                      : "시리얼 없음";
                  const managerName = m.Owner?.name;
                  const softwareNameLabel = m.software_name?.trim();
                  const softwareInstallDate = m.software_installed_at;

                  return (
                    <tr
                      key={m.id}
                      onClick={() => navigate(`/machines/${m.id}`)}
                      style={{
                        cursor: "pointer",
                        borderBottom: "1px solid #f3f4f6",
                      }}
                    >
                      <td style={{ padding: "12px 14px", color: "#111827" }}>{m.id}</td>
                      <td style={{ padding: "12px 14px", color: "#111827" }}>
                        {m.status ?? "-"}
                      </td>
                      <td style={{ padding: "12px 14px", color: "#111827" }}>
                        {softwareNameLabel || "-"}
                      </td>
                      <td style={{ padding: "12px 14px", color: "#111827" }}>
                        {formatDateOnly(softwareInstallDate)}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontWeight: 600, color: "#111827" }}>{title}</div>
                      </td>
                      <td style={{ padding: "12px 14px", color: "#111827" }}>
                        {managerName || "-"}
                      </td>
                      <td style={{ padding: "12px 14px", color: "#111827" }}>
                        {m.Customer?.name ?? "-"}
                      </td>
                      <td style={{ padding: "12px 14px", color: "#111827" }}>
                        {m.Customer?.salesAgency?.name ?? m.Customer?.sales_agent ?? "-"}
                      </td>
                      <td style={{ padding: "12px 14px", color: "#111827" }}>
                        {m.Customer?.address ?? "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
