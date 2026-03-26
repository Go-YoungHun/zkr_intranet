import { Fragment, useEffect, useState } from "react";
import {
  createSalesAgency,
  deleteSalesAgency,
  fetchSalesAgencies,
  fetchSalesAgencyCustomers,
  updateSalesAgency,
} from "../lib/agencies";
import type { SalesAgency, SalesAgencyCustomer } from "../lib/agencies";

const formatDate = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("ko-KR");
};

export default function CustomerAgenciesPage() {
  const [agencies, setAgencies] = useState<SalesAgency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newAgencyName, setNewAgencyName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [expandedIds, setExpandedIds] = useState<number[]>([]);
  const [customersByAgency, setCustomersByAgency] = useState<
    Record<number, SalesAgencyCustomer[]>
  >({});
  const [customersLoading, setCustomersLoading] = useState<Record<number, boolean>>({});
  const [customersError, setCustomersError] = useState<Record<number, string | null>>({});

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSalesAgencies();
      setAgencies(data);
      setCustomersByAgency((prev) => {
        const next: Record<number, SalesAgencyCustomer[]> = {};
        data.forEach((agency) => {
          if (prev[agency.id]) {
            next[agency.id] = prev[agency.id];
          }
        });
        return next;
      });
    } catch (e: any) {
      setError(e?.message || "대리점 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setNewAgencyName("");
    setFormError(null);
  };

  const isDuplicateName = (name: string, ignoreId?: number | null) => {
    const normalized = name.trim().toLowerCase();
    return agencies.some(
      (agency) =>
        agency.name.trim().toLowerCase() === normalized && agency.id !== ignoreId,
    );
  };

  const onCreate = async () => {
    const normalizedName = newAgencyName.trim();
    if (!normalizedName) {
      setFormError("대리점명은 필수입니다.");
      return;
    }
    if (isDuplicateName(normalizedName)) {
      setFormError("이미 등록된 대리점명입니다.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await createSalesAgency(normalizedName);
      resetForm();
      setIsFormOpen(false);
      await load();
    } catch (e: any) {
      setFormError(e?.message || "대리점 추가에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (agency: SalesAgency) => {
    setEditingId(agency.id);
    setEditingName(agency.name);
    setFormError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const onUpdate = async () => {
    if (!editingId) return;
    const normalizedName = editingName.trim();
    if (!normalizedName) {
      setFormError("대리점명은 필수입니다.");
      return;
    }
    if (isDuplicateName(normalizedName, editingId)) {
      setFormError("이미 등록된 대리점명입니다.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await updateSalesAgency(editingId, normalizedName);
      await load();
      cancelEdit();
    } catch (e: any) {
      setFormError(e?.message || "대리점 수정에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (agency: SalesAgency) => {
    const confirmed = window.confirm(`"${agency.name}" 대리점을 삭제할까요?`);
    if (!confirmed) return;

    setSubmitting(true);
    setError(null);
    try {
      await deleteSalesAgency(agency.id);
      await load();
    } catch (e: any) {
      setError(e?.message || "대리점 삭제에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleCustomers = async (agency: SalesAgency) => {
    const isExpanded = expandedIds.includes(agency.id);
    if (isExpanded) {
      setExpandedIds((prev) => prev.filter((id) => id !== agency.id));
      return;
    }

    setExpandedIds((prev) => [...prev, agency.id]);
    if (customersByAgency[agency.id]) return;

    setCustomersLoading((prev) => ({ ...prev, [agency.id]: true }));
    setCustomersError((prev) => ({ ...prev, [agency.id]: null }));
    try {
      const data = await fetchSalesAgencyCustomers(agency.id);
      setCustomersByAgency((prev) => ({ ...prev, [agency.id]: data }));
    } catch (e: any) {
      setCustomersError((prev) => ({
        ...prev,
        [agency.id]: e?.message || "고객사 목록을 불러오지 못했습니다.",
      }));
    } finally {
      setCustomersLoading((prev) => ({ ...prev, [agency.id]: false }));
    }
  };

  if (loading) return <div style={{ padding: 24 }}>로딩중...</div>;

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h2 style={{ margin: 0 }}>대리점 관리</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" onClick={() => setIsFormOpen((prev) => !prev)}>
            {isFormOpen ? "추가 닫기" : "대리점 추가"}
          </button>
        </div>
      </div>

      {error && <div style={{ marginTop: 12, color: "crimson" }}>{error}</div>}

      {isFormOpen && (
        <div
          style={{
            marginTop: 16,
            padding: 16,
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            background: "#f9fafb",
            display: "grid",
            gap: 10,
            maxWidth: 520,
          }}
        >
          <div style={{ fontWeight: 600 }}>대리점 추가</div>
          <input
            placeholder="대리점명 (필수)"
            value={newAgencyName}
            onChange={(event) => setNewAgencyName(event.target.value)}
            style={{ padding: 8 }}
            disabled={submitting}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={onCreate} disabled={submitting}>
              {submitting ? "추가 중..." : "추가"}
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setIsFormOpen(false);
              }}
              disabled={submitting}
            >
              취소
            </button>
          </div>
          {formError && <div style={{ color: "crimson" }}>{formError}</div>}
        </div>
      )}

      <div style={{ marginTop: 16, overflowX: "auto" }}>
        {agencies.length === 0 ? (
          <div style={{ padding: 16, border: "1px dashed #ddd", color: "#666" }}>
            등록된 대리점이 없습니다.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ padding: "10px 12px" }}>대리점명</th>
                <th style={{ padding: "10px 12px" }}>생성일</th>
                <th style={{ padding: "10px 12px" }}>고객사</th>
                <th style={{ padding: "10px 12px" }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {agencies.map((agency) => {
                const isEditing = editingId === agency.id;
                const isExpanded = expandedIds.includes(agency.id);
                const customerCount = Number(agency.customer_count ?? 0);
                const customers = customersByAgency[agency.id] ?? [];
                const isCustomersLoading = customersLoading[agency.id];
                const customersErrorMessage = customersError[agency.id];

                return (
                  <Fragment key={agency.id}>
                    <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "10px 12px", fontWeight: 600 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {isEditing ? (
                            <input
                              value={editingName}
                              onChange={(event) => setEditingName(event.target.value)}
                              disabled={submitting}
                              style={{ padding: 6, minWidth: 200 }}
                            />
                          ) : (
                            <span>{agency.name}</span>
                          )}
                          <span
                            style={{
                              background: "#eef2ff",
                              color: "#4338ca",
                              padding: "2px 8px",
                              borderRadius: 999,
                              fontSize: 12,
                              fontWeight: 600,
                            }}
                          >
                            {customerCount}곳
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px", color: "#6b7280" }}>
                        {formatDate(agency.created_at)}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <button
                          type="button"
                          onClick={() => toggleCustomers(agency)}
                          disabled={submitting}
                        >
                          {isExpanded ? "고객사 닫기" : "고객사 보기"}
                        </button>
                      </td>
                      <td style={{ padding: "10px 12px", display: "flex", gap: 8 }}>
                        {isEditing ? (
                          <>
                            <button type="button" onClick={onUpdate} disabled={submitting}>
                              저장
                            </button>
                            <button type="button" onClick={cancelEdit} disabled={submitting}>
                              취소
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(agency)}
                              disabled={submitting}
                            >
                              수정
                            </button>
                            <button
                              type="button"
                              onClick={() => onDelete(agency)}
                              disabled={submitting}
                            >
                              삭제
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={4} style={{ padding: "0 12px 12px 12px" }}>
                          <div
                            style={{
                              border: "1px solid #e5e7eb",
                              borderRadius: 12,
                              padding: 12,
                              background: "#f9fafb",
                            }}
                          >
                            {isCustomersLoading ? (
                              <div style={{ color: "#6b7280" }}>불러오는 중...</div>
                            ) : customersErrorMessage ? (
                              <div style={{ color: "crimson" }}>{customersErrorMessage}</div>
                            ) : customers.length === 0 ? (
                              <div style={{ color: "#6b7280" }}>
                                연결된 고객사가 없습니다.
                              </div>
                            ) : (
                              <ul
                                style={{
                                  listStyle: "none",
                                  margin: 0,
                                  padding: 0,
                                  display: "grid",
                                  gap: 8,
                                }}
                              >
                                {customers.map((customer) => (
                                  <li
                                    key={customer.id}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      padding: "6px 10px",
                                      background: "white",
                                      borderRadius: 8,
                                      border: "1px solid #e5e7eb",
                                    }}
                                  >
                                    <div style={{ fontWeight: 600 }}>{customer.name}</div>
                                    <div style={{ color: "#6b7280", fontSize: 12 }}>
                                      ID {customer.id}
                                      {customer.code ? ` · ${customer.code}` : ""}
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
