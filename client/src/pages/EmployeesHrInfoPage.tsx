import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import FormButton from "../components/FormButton";
import {
  fetchEmployeeHrList,
  type EmployeeHrRow,
  type EmployeeHrUpdateInput,
  updateEmployeeHr,
} from "../lib/employeeHr";

const ADMIN_PERMISSION_LEVEL = 7;

function normalizeEmpty(value: string) {
  return value.trim() ? value.trim() : null;
}

export default function EmployeesHrInfoPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<EmployeeHrRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [nameFilter, setNameFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [jobTitleFilter, setJobTitleFilter] = useState("");

  const [form, setForm] = useState<EmployeeHrUpdateInput>({
    department: "",
    job_title: "",
    employment_status: "ACTIVE",
    contact_phone: "",
    contact_email: "",
    address_line1: "",
    address_line2: "",
    note: "",
  });

  const canEdit = (user?.permission_level ?? 0) >= ADMIN_PERMISSION_LEVEL;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEmployeeHrList();
      setRows(data);
      setSelectedId((prev) => prev ?? data[0]?.id ?? null);
    } catch (e: any) {
      setError(e?.message || "인사정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const selectedRow = useMemo(
    () => rows.find((row) => row.id === selectedId) ?? null,
    [rows, selectedId]
  );

  useEffect(() => {
    if (!selectedRow) return;
    setForm({
      department: selectedRow.department ?? "",
      job_title: selectedRow.job_title ?? "",
      employment_status: selectedRow.employment_status,
      contact_phone: selectedRow.contact_phone ?? "",
      contact_email: selectedRow.contact_email ?? "",
      address_line1: selectedRow.address_line1 ?? "",
      address_line2: selectedRow.address_line2 ?? "",
      note: selectedRow.note ?? "",
    });
  }, [selectedRow]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const byName = row.name.toLowerCase().includes(nameFilter.trim().toLowerCase());
      const byStatus = statusFilter === "ALL" || row.employment_status === statusFilter;
      const byDepartment = (row.department ?? "")
        .toLowerCase()
        .includes(departmentFilter.trim().toLowerCase());
      const byJob = (row.job_title ?? "")
        .toLowerCase()
        .includes(jobTitleFilter.trim().toLowerCase());
      return byName && byStatus && byDepartment && byJob;
    });
  }, [rows, nameFilter, statusFilter, departmentFilter, jobTitleFilter]);

  const onSave = async () => {
    if (!selectedRow) return;
    setSaving(true);
    setError(null);
    setFeedback(null);

    try {
      const payload: EmployeeHrUpdateInput = {
        department: normalizeEmpty(String(form.department ?? "")),
        job_title: normalizeEmpty(String(form.job_title ?? "")),
        employment_status: form.employment_status,
        contact_phone: normalizeEmpty(String(form.contact_phone ?? "")),
        contact_email: normalizeEmpty(String(form.contact_email ?? "")),
        address_line1: normalizeEmpty(String(form.address_line1 ?? "")),
        address_line2: normalizeEmpty(String(form.address_line2 ?? "")),
        note: normalizeEmpty(String(form.note ?? "")),
      };

      const updated = await updateEmployeeHr(selectedRow.id, payload);
      setRows((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      setFeedback("저장되었습니다.");
    } catch (e: any) {
      setError(e?.message || "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 24 }}>로딩중...</div>;

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginTop: 0 }}>인사정보 관리</h2>

      <div style={panelStyle}>
        <strong>검색/필터</strong>
        <div style={filterRowStyle}>
          <input
            style={inputStyle}
            placeholder="이름 검색"
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
          />
          <select
            style={inputStyle}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">전체 재직상태</option>
            <option value="ACTIVE">재직</option>
            <option value="ON_LEAVE">휴직</option>
            <option value="RESIGNED">퇴사</option>
          </select>
          <input
            style={inputStyle}
            placeholder="부서"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
          />
          <input
            style={inputStyle}
            placeholder="직책"
            value={jobTitleFilter}
            onChange={(e) => setJobTitleFilter(e.target.value)}
          />
        </div>
      </div>

      <div style={{ ...panelStyle, marginTop: 12, overflowX: "auto" }}>
        <strong>직원 목록</strong>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
          <thead>
            <tr>
              <th style={th}>이름</th>
              <th style={th}>부서</th>
              <th style={th}>직책</th>
              <th style={th}>재직상태</th>
              <th style={th}>연락처</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={5} style={td}>
                  검색 결과가 없습니다.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => {
                    setSelectedId(row.id);
                    setFeedback(null);
                    setError(null);
                  }}
                  style={{
                    cursor: "pointer",
                    background: selectedId === row.id ? "#f3f7ff" : "transparent",
                  }}
                >
                  <td style={td}>{row.name}</td>
                  <td style={td}>{row.department ?? "-"}</td>
                  <td style={td}>{row.job_title ?? "-"}</td>
                  <td style={td}>{statusLabel[row.employment_status]}</td>
                  <td style={td}>{row.contact_phone ?? "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ ...panelStyle, marginTop: 12 }}>
        <strong>인사카드 상세 편집</strong>
        {!selectedRow ? (
          <p style={{ color: "#666" }}>직원을 선택해주세요.</p>
        ) : (
          <>
            <p style={{ marginBottom: 10 }}>
              선택 직원: <b>{selectedRow.name}</b> ({selectedRow.login_id})
              {!canEdit && " · 읽기 전용"}
              {selectedRow.is_sensitive_masked && " · 민감정보 마스킹"}
            </p>
            <div style={detailGridStyle}>
              <label>
                부서
                <input
                  style={inputStyle}
                  value={String(form.department ?? "")}
                  onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))}
                  disabled={saving || !canEdit}
                />
              </label>
              <label>
                직책
                <input
                  style={inputStyle}
                  value={String(form.job_title ?? "")}
                  onChange={(e) => setForm((prev) => ({ ...prev, job_title: e.target.value }))}
                  disabled={saving || !canEdit}
                />
              </label>
              <label>
                재직상태
                <select
                  style={inputStyle}
                  value={String(form.employment_status ?? "ACTIVE")}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      employment_status: e.target.value as EmployeeHrRow["employment_status"],
                    }))
                  }
                  disabled={saving || !canEdit}
                >
                  <option value="ACTIVE">재직</option>
                  <option value="ON_LEAVE">휴직</option>
                  <option value="RESIGNED">퇴사</option>
                </select>
              </label>
              <label>
                연락처
                <input
                  style={inputStyle}
                  value={String(form.contact_phone ?? "")}
                  onChange={(e) => setForm((prev) => ({ ...prev, contact_phone: e.target.value }))}
                  disabled={saving || !canEdit}
                />
              </label>
              <label>
                이메일
                <input
                  style={inputStyle}
                  value={String(form.contact_email ?? "")}
                  onChange={(e) => setForm((prev) => ({ ...prev, contact_email: e.target.value }))}
                  disabled={saving || !canEdit}
                />
              </label>
              <label>
                주소1
                <input
                  style={inputStyle}
                  value={String(form.address_line1 ?? "")}
                  onChange={(e) => setForm((prev) => ({ ...prev, address_line1: e.target.value }))}
                  disabled={saving || !canEdit}
                />
              </label>
              <label>
                주소2
                <input
                  style={inputStyle}
                  value={String(form.address_line2 ?? "")}
                  onChange={(e) => setForm((prev) => ({ ...prev, address_line2: e.target.value }))}
                  disabled={saving || !canEdit}
                />
              </label>
            </div>
            <label style={{ display: "block", marginTop: 8 }}>
              비고
              <textarea
                style={{ ...inputStyle, minHeight: 90, width: "100%", boxSizing: "border-box" }}
                value={String(form.note ?? "")}
                onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                disabled={saving || !canEdit}
              />
            </label>
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
              <FormButton type="button" onClick={onSave} disabled={saving || !canEdit}>
                {saving ? "저장 중..." : "저장"}
              </FormButton>
              {feedback && <span style={{ color: "#0a7f38" }}>{feedback}</span>}
              {error && <span style={{ color: "crimson" }}>{error}</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const statusLabel: Record<EmployeeHrRow["employment_status"], string> = {
  ACTIVE: "재직",
  ON_LEAVE: "휴직",
  RESIGNED: "퇴사",
};

const panelStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: 12,
};

const filterRowStyle: React.CSSProperties = {
  marginTop: 8,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 8,
};

const detailGridStyle: React.CSSProperties = {
  marginTop: 8,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 8,
};

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  marginTop: 4,
  padding: 8,
};

const th: React.CSSProperties = {
  textAlign: "left",
  borderBottom: "1px solid #ddd",
  padding: "10px 8px",
};

const td: React.CSSProperties = {
  borderBottom: "1px solid #f0f0f0",
  padding: "10px 8px",
};
