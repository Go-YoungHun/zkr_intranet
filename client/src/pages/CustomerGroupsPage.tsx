import { useEffect, useState } from "react";
import {
  createCustomerGroup,
  deleteCustomerGroup,
  fetchCustomerGroups,
  updateCustomerGroup,
} from "../lib/customers";
import type { CustomerGroup } from "../lib/customers";

const formatDate = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("ko-KR");
};

export default function CustomerGroupsPage() {
  const [groups, setGroups] = useState<CustomerGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCustomerGroups();
      setGroups(data);
    } catch (e: any) {
      setError(e?.message || "그룹 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setNewGroupName("");
    setFormError(null);
  };

  const onCreate = async () => {
    if (!newGroupName.trim()) {
      setFormError("그룹명은 필수입니다.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await createCustomerGroup(newGroupName.trim());
      resetForm();
      setIsFormOpen(false);
      await load();
    } catch (e: any) {
      setFormError(e?.message || "그룹 생성에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (group: CustomerGroup) => {
    setEditingId(group.id);
    setEditingName(group.name);
    setFormError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const onUpdate = async () => {
    if (!editingId) return;
    if (!editingName.trim()) {
      setFormError("그룹명은 필수입니다.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await updateCustomerGroup(editingId, editingName.trim());
      await load();
      cancelEdit();
    } catch (e: any) {
      setFormError(e?.message || "그룹 수정에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (group: CustomerGroup) => {
    const confirmed = window.confirm(`"${group.name}" 그룹을 삭제할까요?`);
    if (!confirmed) return;

    setSubmitting(true);
    setError(null);
    try {
      await deleteCustomerGroup(group.id);
      await load();
    } catch (e: any) {
      setError(e?.message || "그룹 삭제에 실패했습니다.");
    } finally {
      setSubmitting(false);
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
        <h2 style={{ margin: 0 }}>고객사 그룹 관리</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" onClick={() => setIsFormOpen((prev) => !prev)}>
            {isFormOpen ? "추가 닫기" : "그룹 추가"}
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
          <div style={{ fontWeight: 600 }}>그룹 추가</div>
          <input
            placeholder="그룹 이름 (필수)"
            value={newGroupName}
            onChange={(event) => setNewGroupName(event.target.value)}
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
        {groups.length === 0 ? (
          <div style={{ padding: 16, border: "1px dashed #ddd", color: "#666" }}>
            등록된 그룹이 없습니다.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ padding: "10px 12px" }}>그룹명</th>
                <th style={{ padding: "10px 12px" }}>생성일</th>
                <th style={{ padding: "10px 12px" }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => {
                const isEditing = editingId === group.id;

                return (
                  <tr key={group.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 600 }}>
                      {isEditing ? (
                        <input
                          value={editingName}
                          onChange={(event) => setEditingName(event.target.value)}
                          disabled={submitting}
                          style={{ padding: 6, minWidth: 200 }}
                        />
                      ) : (
                        group.name
                      )}
                    </td>
                    <td style={{ padding: "10px 12px", color: "#6b7280" }}>
                      {formatDate(group.created_at)}
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
                            onClick={() => startEdit(group)}
                            disabled={submitting}
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(group)}
                            disabled={submitting}
                          >
                            삭제
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
