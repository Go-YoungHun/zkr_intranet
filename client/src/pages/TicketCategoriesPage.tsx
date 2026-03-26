import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { TicketCategory } from "../lib/tickets";
import {
  createTicketCategory,
  fetchTicketCategories,
  updateTicketCategory,
} from "../lib/tickets";

export default function TicketCategoriesPage() {
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTicketCategories();
      setCategories(data);
    } catch (e: any) {
      setError(e?.message || "카테고리 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFormError(null);
  };

  const onCreate = async () => {
    if (!formName.trim()) {
      setFormError("카테고리 이름은 필수입니다.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      await createTicketCategory({
        name: formName.trim(),
        description: formDescription.trim() || null,
      });
      resetForm();
      setIsFormOpen(false);
      await load();
    } catch (e: any) {
      setFormError(e?.message || "카테고리 생성에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const onDeactivate = async (category: TicketCategory) => {
    if (!category.id) return;
    const confirmed = window.confirm("이 카테고리를 비활성 처리할까요?");
    if (!confirmed) return;

    setSubmitting(true);
    setError(null);
    try {
      await updateTicketCategory(category.id, { is_active: false });
      await load();
    } catch (e: any) {
      setError(e?.message || "카테고리 비활성 처리에 실패했습니다.");
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
        <h2 style={{ margin: 0 }}>티켓 카테고리</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button type="button" onClick={() => setIsFormOpen((prev) => !prev)}>
            {isFormOpen ? "추가 닫기" : "카테고리 추가"}
          </button>
          <Link to="/tickets" style={{ fontSize: 13, color: "#2563eb", textDecoration: "none" }}>
            티켓으로 돌아가기
          </Link>
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
          <div style={{ fontWeight: 600 }}>카테고리 추가</div>
          <input
            placeholder="카테고리 이름 (필수)"
            value={formName}
            onChange={(event) => setFormName(event.target.value)}
            style={{ padding: 8 }}
            disabled={submitting}
          />
          <input
            placeholder="설명 (선택)"
            value={formDescription}
            onChange={(event) => setFormDescription(event.target.value)}
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
        {categories.length === 0 ? (
          <div style={{ padding: 16, border: "1px dashed #ddd", color: "#666" }}>
            등록된 카테고리가 없습니다.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ padding: "10px 12px" }}>이름</th>
                <th style={{ padding: "10px 12px" }}>설명</th>
                <th style={{ padding: "10px 12px" }}>상태</th>
                <th style={{ padding: "10px 12px" }}>액션</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "10px 12px", fontWeight: 600 }}>{category.name}</td>
                  <td style={{ padding: "10px 12px", color: "#6b7280" }}>
                    {category.description || "-"}
                  </td>
                  <td style={{ padding: "10px 12px" }}>{category.is_active ? "활성" : "비활성"}</td>
                  <td style={{ padding: "10px 12px" }}>
                    {category.is_active ? (
                      <button
                        type="button"
                        onClick={() => onDeactivate(category)}
                        disabled={submitting}
                      >
                        비활성화
                      </button>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
