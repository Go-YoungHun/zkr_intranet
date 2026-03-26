import { useEffect, useState } from "react";
import {
  createMachineModel,
  deleteMachineModel,
  fetchMachineModels,
  updateMachineModel,
} from "../lib/machineModels";
import type { MachineModel } from "../lib/machineModels";

const formatDate = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("ko-KR");
};

export default function MachineModelsPage() {
  const [models, setModels] = useState<MachineModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newModelName, setNewModelName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMachineModels();
      setModels(data);
    } catch (e: any) {
      setError(e?.message || "모델 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setNewModelName("");
    setFormError(null);
  };

  const onCreate = async () => {
    if (!newModelName.trim()) {
      setFormError("모델명은 필수입니다.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await createMachineModel(newModelName.trim());
      resetForm();
      setIsFormOpen(false);
      await load();
    } catch (e: any) {
      setFormError(e?.message || "모델 생성에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (model: MachineModel) => {
    setEditingId(model.id);
    setEditingName(model.name);
    setFormError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const onUpdate = async () => {
    if (!editingId) return;
    if (!editingName.trim()) {
      setFormError("모델명은 필수입니다.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await updateMachineModel(editingId, editingName.trim());
      await load();
      cancelEdit();
    } catch (e: any) {
      setFormError(e?.message || "모델 수정에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (model: MachineModel) => {
    const confirmed = window.confirm(`"${model.name}" 모델을 삭제할까요?`);
    if (!confirmed) return;

    setSubmitting(true);
    setError(null);
    try {
      await deleteMachineModel(model.id);
      await load();
    } catch (e: any) {
      setError(e?.message || "모델 삭제에 실패했습니다.");
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
        <h2 style={{ margin: 0 }}>장비 모델 관리</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" onClick={() => setIsFormOpen((prev) => !prev)}>
            {isFormOpen ? "추가 닫기" : "모델 추가"}
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
          <div style={{ fontWeight: 600 }}>모델 추가</div>
          <input
            placeholder="모델 이름 (필수)"
            value={newModelName}
            onChange={(event) => setNewModelName(event.target.value)}
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
        {models.length === 0 ? (
          <div style={{ padding: 16, border: "1px dashed #ddd", color: "#666" }}>
            등록된 모델이 없습니다.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ padding: "10px 12px" }}>모델명</th>
                <th style={{ padding: "10px 12px" }}>생성일</th>
                <th style={{ padding: "10px 12px" }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {models.map((model) => {
                const isEditing = editingId === model.id;

                return (
                  <tr key={model.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 600 }}>
                      {isEditing ? (
                        <input
                          value={editingName}
                          onChange={(event) => setEditingName(event.target.value)}
                          disabled={submitting}
                          style={{ padding: 6, minWidth: 200 }}
                        />
                      ) : (
                        model.name
                      )}
                    </td>
                    <td style={{ padding: "10px 12px", color: "#6b7280" }}>
                      {formatDate(model.created_at)}
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
                            onClick={() => startEdit(model)}
                            disabled={submitting}
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(model)}
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
