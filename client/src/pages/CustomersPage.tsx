import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  fetchCustomers,
  createCustomer,
  fetchCustomerMachines,
  createCustomerGroup,
  fetchCustomerGroups,
} from "../lib/customers";
import type { Customer, CustomerGroup, CustomerMachine } from "../lib/customers";
import { fetchSalesAgencies } from "../lib/agencies";
import type { SalesAgency } from "../lib/agencies";
import Modal from "../components/Modal";
import MachineSummaryCard from "../components/MachineSummaryCard";
import FormButton from "../components/FormButton";

export default function CustomersPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [agencyError, setAgencyError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [selectedAgencyId, setSelectedAgencyId] = useState<number | "">("");
  const [creating, setCreating] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [expandedCustomers, setExpandedCustomers] = useState<Set<number>>(new Set());
  const [machinesByCustomer, setMachinesByCustomer] = useState<
    Record<number, CustomerMachine[]>
  >({});
  const [groups, setGroups] = useState<CustomerGroup[]>([]);
  const [machinesLoading, setMachinesLoading] = useState<Record<number, boolean>>({});
  const [machinesError, setMachinesError] = useState<Record<number, string>>({});
  const [isCustomerCreateEnabled, setIsCustomerCreateEnabled] = useState(true);
  const [isGroupAttachEnabled, setIsGroupAttachEnabled] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<number | "">("");
  const [newGroupName, setNewGroupName] = useState("");
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [agencies, setAgencies] = useState<SalesAgency[]>([]);
  const isAddressDisabled = creating;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCustomers(false, debouncedQuery, page, pageSize);
      setRows(data.rows);
      setTotal(data.total);
      setPage(data.page);
      setPageSize(data.pageSize);
    } catch (e: any) {
      setError("고객사 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    setGroupError(null);
    try {
      const data = await fetchCustomerGroups();
      setGroups(data);
    } catch (e: any) {
      setGroupError("그룹 목록을 불러오지 못했습니다.");
    }
  };

  const loadAgencies = async () => {
    setAgencyError(null);
    try {
      const data = await fetchSalesAgencies();
      setAgencies(data);
    } catch (e: any) {
      setAgencyError("대리점 목록을 불러오지 못했습니다.");
    }
  };

  useEffect(() => {
    load();
  }, [debouncedQuery, page, pageSize]);

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    loadAgencies();
  }, []);

  const loadCustomerMachines = async (customerId: number) => {
    setMachinesLoading((prev) => ({ ...prev, [customerId]: true }));
    setMachinesError((prev) => ({ ...prev, [customerId]: "" }));
    try {
      const data = await fetchCustomerMachines(customerId);
      setMachinesByCustomer((prev) => ({ ...prev, [customerId]: data }));
    } catch (e: any) {
      setMachinesError((prev) => ({
        ...prev,
        [customerId]: e?.message || "장비 목록을 불러오지 못했습니다.",
      }));
    } finally {
      setMachinesLoading((prev) => ({ ...prev, [customerId]: false }));
    }
  };

  const resetForm = () => {
    setName("");
    setNameEn("");
    setCode("");
    setPhone("");
    setAddress("");
    setSelectedAgencyId("");
    setIsCustomerCreateEnabled(true);
    setIsGroupAttachEnabled(false);
    setSelectedGroupId("");
    setNewGroupName("");
  };

  const openCreateModal = () => {
    setFormError(null);
    resetForm();
    setIsCreateOpen(true);
  };

  const closeCreateModal = () => {
    if (creating) return;
    setIsCreateOpen(false);
    resetForm();
    setFormError(null);
  };

  const handleCreateGroup = async () => {
    const trimmedGroupName = newGroupName.trim();
    if (!trimmedGroupName) {
      setFormError("그룹명을 입력하세요.");
      return;
    }
    setIsCreatingGroup(true);
    setFormError(null);
    try {
      const newGroup = await createCustomerGroup(trimmedGroupName);
      setSelectedGroupId(newGroup.id);
      setNewGroupName("");
      await loadGroups();
    } catch (e: any) {
      setFormError(e?.message || "그룹 생성 실패");
    } finally {
      setIsCreatingGroup(false);
    }
  };

//생성
  const onCreate = async () => {
    const trimmedName = name.trim();

    if (!isCustomerCreateEnabled) {
      setFormError("고객사 추가를 선택하세요.");
      return;
    }

    if (!trimmedName) {
      setFormError("고객사명(name)은 필수입니다.");
      return;
    }

    if (isGroupAttachEnabled) {
      const trimmedGroupName = newGroupName.trim();
      if (!selectedGroupId && !trimmedGroupName) {
        setFormError("그룹을 선택하거나 새 그룹명을 입력하세요.");
        return;
      }
    }

    setCreating(true);
    setFormError(null);
    try {
      const resolvedName = trimmedName;

      let resolvedGroupId: number | null = null;
      if (isGroupAttachEnabled) {
        if (selectedGroupId !== "") {
          resolvedGroupId = Number(selectedGroupId);
        } else if (newGroupName.trim()) {
          const trimmedGroupName = newGroupName.trim();
          const createdGroup = await createCustomerGroup(trimmedGroupName);
          resolvedGroupId = createdGroup.id;
          setSelectedGroupId(createdGroup.id);
          setNewGroupName("");
          await loadGroups();
        }
      }

      await createCustomer({
        name: resolvedName,
        name_en: nameEn.trim() || null,
        code: code.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        sales_agency_id: selectedAgencyId === "" ? null : Number(selectedAgencyId),
        group_id: resolvedGroupId,
      });

      // 입력 초기화
      resetForm();

      // 목록 갱신
      await load();
      setIsCreateOpen(false);
    } catch (e: any) {
      // 중복(409)일 수도 있어서 메시지 단순화
      setFormError(e?.message || "등록 실패");
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div style={{ padding: 24 }}>로딩중...</div>;
  if (error)
    return (
      <div style={{ padding: 24 }}>
        <div style={{ color: "crimson" }}>{error}</div>
        <FormButton type="button" variant="secondary" onClick={load} style={{ marginTop: 12 }}>
          다시 시도
        </FormButton>
      </div>
    );

  const toggleExpanded = (customerId: number) => {
    setExpandedCustomers((prev) => {
      const next = new Set(prev);
      if (next.has(customerId)) {
        next.delete(customerId);
      } else {
        next.add(customerId);
        if (!machinesByCustomer[customerId] && !machinesLoading[customerId]) {
          void loadCustomerMachines(customerId);
        }
      }
      return next;
    });
  };

  const handleDetailClick = (customerId: number) => {
    navigate(`/customers/${customerId}`);
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

  const groupedRows = rows.reduce<Map<string, Customer[]>>((acc, customer) => {
    const groupKey =
      customer.group_id !== null && customer.group_id !== undefined
        ? `group:${customer.group_id}`
        : `customer:${customer.id}`;
    const existing = acc.get(groupKey);
    if (existing) {
      existing.push(customer);
    } else {
      acc.set(groupKey, [customer]);
    }
    return acc;
  }, new Map());

  const groupEntries = Array.from(groupedRows.entries());
  const singleCustomers = groupEntries
    .filter(([key]) => key.startsWith("customer:"))
    .flatMap(([, customers]) => customers);
  const multiCustomerGroups = groupEntries
    .filter(([key]) => key.startsWith("group:"))
    .map(([key, customers]) => {
      const groupId = Number(key.split(":")[1]);
      const groupName = groups.find((group) => group.id === groupId)?.name;
      return { groupId, groupName: groupName ?? `그룹 #${groupId}`, customers };
    });

  const getCustomerPrimaryLabel = (customer: Customer) => {
    const siteName = customer.site_name?.trim();
    const customerName = customer.name?.trim() || "-";
    if (siteName) {
      return siteName === customerName ? siteName : `${siteName} (${customerName})`;
    }
    return customerName;
  };

  const renderCustomerRow = (customer: Customer) => {
    const isExpanded = expandedCustomers.has(customer.id);
    const machines = machinesByCustomer[customer.id] ?? [];
    const isLoadingMachines = machinesLoading[customer.id];
    const machineError = machinesError[customer.id];
    const primaryLabel = getCustomerPrimaryLabel(customer);
    const nameEn = customer.name_en?.trim();
    const salesAgentValue =
      customer.salesAgency?.name?.trim() || customer.sales_agent?.trim();
    const machineCount = customer.machine_count ?? 0;

    return (
      <div key={customer.id} style={{ display: "grid", gap: 8 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #f0f0f0",
            background: "#f9fafb",
          }}
        >
          <FormButton
            type="button"
            onClick={() => handleDetailClick(customer.id)}
            variant="secondary"
            style={{
              flex: 1,
              textAlign: "left",
              background: "transparent",
              border: "none",
              padding: 0,
              cursor: "pointer",
            }}
          >
            <div style={{ fontWeight: 600 }}>{primaryLabel}</div>
            {nameEn && (
              <div style={{ marginTop: 4, color: "#6b7280", fontSize: 12 }}>{nameEn}</div>
            )}
            <div style={{ marginTop: 4, color: "#6b7280", fontSize: 12 }}>
              {salesAgentValue ? `영업대리점: ${salesAgentValue}` : "영업대리점 정보 없음"}
            </div>
          </FormButton>
          <FormButton
            type="button"
            onClick={() => toggleExpanded(customer.id)}
            variant="secondary"
            style={{ whiteSpace: "nowrap" }}
          >
            {isExpanded ? "장비 닫기" : `장비 보기 (${machineCount})`}
          </FormButton>
        </div>

        {isExpanded && (
          <div
            style={{
              marginTop: 8,
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              background: "#f8fafc",
              borderLeft: "4px solid #c7d2fe",
            }}
          >
            <div
              style={{
                fontWeight: 600,
                marginBottom: 10,
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: "#4338ca",
              }}
            >
              <span aria-hidden="true">🔌</span>
              연결된 장비
            </div>
            {isLoadingMachines ? (
              <div style={{ color: "#6b7280" }}>장비 불러오는 중...</div>
            ) : machineError ? (
              <div style={{ color: "crimson" }}>{machineError}</div>
            ) : machines.length === 0 ? (
              <div style={{ color: "#6b7280" }}>연결된 장비가 없습니다.</div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: 8,
                  paddingTop: 8,
                  borderTop: "1px dashed #d1d5db",
                }}
              >
                {machines.map((machine) => {
                  const title = machine.name?.trim()
                    ? machine.name
                    : machine.serial_no?.trim()
                      ? machine.serial_no
                      : "시리얼 없음";

                  return (
                    <Link
                      key={machine.id}
                      to={`/machines/${machine.id}`}
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      <MachineSummaryCard
                        title={title}
                        model={machine.model}
                        location={machine.location}
                        variant="compact"
                      />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <div className="action-bar">
        <h2 style={{ margin: 0 }}>고객사 목록</h2>
        <div className="action-bar__actions">
          <input
            placeholder="고객사 검색"
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
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FormButton
              type="button"
              variant="secondary"
              onClick={() => navigate("/customers/groups")}
            >
              그룹 관리
            </FormButton>
            <FormButton
              type="button"
              variant="secondary"
              onClick={() => navigate("/customers/agencies")}
            >
              대리점 관리
            </FormButton>
          </div>
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

      <Modal isOpen={isCreateOpen} title="고객사 등록" onClose={closeCreateModal}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="checkbox"
                checked={isCustomerCreateEnabled}
                onChange={(event) => setIsCustomerCreateEnabled(event.target.checked)}
                disabled={creating}
              />
              고객사 추가
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="checkbox"
                checked={isGroupAttachEnabled}
                onChange={(event) => {
                  setIsGroupAttachEnabled(event.target.checked);
                  if (!event.target.checked) {
                    setSelectedGroupId("");
                    setNewGroupName("");
                  }
                }}
                disabled={creating}
              />
              그룹에 추가하기
            </label>
          </div>
          {isGroupAttachEnabled && (
            <div style={{ display: "grid", gap: 8 }}>
              <select
                value={selectedGroupId}
                onChange={(event) =>
                  setSelectedGroupId(
                    event.target.value === "" ? "" : Number(event.target.value)
                  )
                }
                style={{ padding: 8, minWidth: 200 }}
                disabled={creating || isCreatingGroup}
              >
                <option value="">그룹 선택</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  placeholder="새 그룹명"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  style={{ padding: 8, minWidth: 200 }}
                  disabled={creating || isCreatingGroup}
                />
                <FormButton
                  type="button"
                  onClick={handleCreateGroup}
                  disabled={creating || isCreatingGroup}
                >
                  {isCreatingGroup ? "생성 중..." : "그룹 만들기"}
                </FormButton>
              </div>
            </div>
          )}
          <div style={{ display: "grid", gap: 8 }}>
            <input
              placeholder="고객사명(필수)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ padding: 8, minWidth: 200 }}
              disabled={creating}
            />
            <input
              placeholder="고객사명(영문)"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              style={{ padding: 8, minWidth: 200 }}
              disabled={creating}
            />
            <input
              placeholder="코드"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={{ padding: 8 }}
              disabled={creating}
            />
            <input
              placeholder="전화"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{ padding: 8 }}
              disabled={creating}
            />
            <input
              placeholder="주소"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              style={{ padding: 8, minWidth: 240 }}
              disabled={isAddressDisabled}
            />
            <select
              value={selectedAgencyId}
              onChange={(event) =>
                setSelectedAgencyId(
                  event.target.value === "" ? "" : Number(event.target.value)
                )
              }
              style={{ padding: 8, minWidth: 180 }}
              disabled={creating}
            >
              <option value="">대리점 선택</option>
              {agencies.map((agency) => (
                <option key={agency.id} value={agency.id}>
                  {agency.name}
                </option>
              ))}
            </select>
            <FormButton type="button" onClick={onCreate} disabled={creating}>
              {creating ? "추가 중..." : "추가"}
            </FormButton>
          </div>
        </div>
        {formError && <div style={{ marginTop: 8, color: "crimson" }}>{formError}</div>}
        {groupError && <div style={{ marginTop: 8, color: "crimson" }}>{groupError}</div>}
        {agencyError && <div style={{ marginTop: 8, color: "crimson" }}>{agencyError}</div>}
      </Modal>

      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        {rows.length === 0 ? (
          <div style={{ padding: 16, border: "1px dashed #ddd", color: "#666" }}>
            데이터가 없습니다.
          </div>
        ) : (
          <>
            {singleCustomers.length > 0 && (
              <div style={{ display: "grid", gap: 8 }}>
                {singleCustomers.map((customer) => renderCustomerRow(customer))}
              </div>
            )}
            {multiCustomerGroups.map(({ groupId, groupName, customers }) => (
              <div
                key={groupId}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  padding: 16,
                  background: "#fff",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{groupName}</div>
                    <span
                      style={{
                        fontSize: 12,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: "#eef2ff",
                        color: "#4338ca",
                        fontWeight: 600,
                      }}
                    >
                      {customers.length}곳
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                  {customers.map((customer) => renderCustomerRow(customer))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
