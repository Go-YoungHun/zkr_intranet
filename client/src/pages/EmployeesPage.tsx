import { useEffect, useState } from "react";
import {
  fetchEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  restoreEmployee,
  changeEmployeePassword,
  changeEmployeePermission,
} from "../lib/employees";
import type { Employee } from "../lib/employees";
import { useAuth } from "../auth/AuthContext";
import FormButton from "../components/FormButton";

const ADMIN_PERMISSION_LEVEL = 7;

export default function EmployeesPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAll, setShowAll] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // 폼
  const [loginId, setLoginId] = useState("");
  const [name, setName] = useState("");
  const [hireDate, setHireDate] = useState(""); // YYYY-MM-DD
  const [password, setPassword] = useState(""); // 생성 or 비번 변경용
  const [permissionLevel, setPermissionLevel] = useState<string>("");

  const resetForm = () => {
    setLoginId("");
    setName("");
    setHireDate("");
    setPassword("");
    setPermissionLevel("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setError(null);
    resetForm();
  };

  const startEdit = (e: Employee) => {
    setError(null);
    setEditingId(e.id);
    setLoginId(e.login_id); // 수정 시 잠금
    setName(e.name);
    setHireDate(e.hire_date);
    setPassword("");
    setPermissionLevel(String(e.permission_level ?? ""));
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEmployees(showAll);
      setRows(data);
    } catch (e: any) {
      setError(e?.message || "직원 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAll]);

  const onSubmit = async () => {
    if (!loginId.trim()) return setError("login_id는 필수입니다.");
    if (!name.trim()) return setError("이름(name)은 필수입니다.");
    if (!hireDate.trim()) return setError("입사일(hire_date)은 필수입니다.");

    setSaving(true);
    setError(null);

    try {
      if (editingId) {
        if (!permissionLevel.trim()) {
          return setError("권한 단계(permission_level)를 입력해주세요.");
        }
        const parsedPermission = Number(permissionLevel);
        if (!Number.isFinite(parsedPermission)) {
          return setError("권한 단계(permission_level)는 숫자여야 합니다.");
        }
        await updateEmployee(editingId, { name: name.trim(), hire_date: hireDate.trim() });
        await changeEmployeePermission(editingId, parsedPermission);
        setEditingId(null);
        resetForm();
        await load();
        return;
      }

      // 등록 모드에서는 password 필수
      if (!password.trim()) {
        setSaving(false);
        return setError("등록 시 비밀번호(password)는 필수입니다.");
      }

      await createEmployee({
        login_id: loginId.trim(),
        name: name.trim(),
        hire_date: hireDate.trim(),
        password: password.trim(),
      });

      resetForm();
      await load();
    } catch (e: any) {
      setError(e?.message || (editingId ? "수정 실패" : "등록 실패"));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: number) => {
    const ok = confirm("직원을 비활성화(삭제)할까요?");
    if (!ok) return;

    setError(null);
    try {
      await deleteEmployee(id);
      if (editingId === id) cancelEdit();
      await load();
    } catch (e: any) {
      setError(e?.message || "삭제 실패");
    }
  };

  const onRestore = async (id: number) => {
    setError(null);
    try {
      await restoreEmployee(id);
      await load();
    } catch (e: any) {
      setError(e?.message || "복구 실패");
    }
  };

  const onChangePassword = async () => {
    if (!editingId) return setError("비밀번호 변경은 수정 모드에서 가능합니다.");
    if (!password.trim()) return setError("새 비밀번호를 입력해주세요.");

    const ok = confirm("비밀번호를 변경할까요?");
    if (!ok) return;

    setSaving(true);
    setError(null);
    try {
      await changeEmployeePassword(editingId, password.trim());
      setPassword("");
      alert("비밀번호 변경 완료");
    } catch (e: any) {
      setError(e?.message || "비밀번호 변경 실패");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 24 }}>로딩중...</div>;

  const canManageEmployees = (user?.permission_level ?? 0) >= ADMIN_PERMISSION_LEVEL;

  return (
    <div style={{ padding: 24 }}>
      <div className="action-bar">
        <h2 style={{ margin: 0 }}>직원 관리</h2>

        <div className="action-bar__actions">
          <label style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
            비활성 포함 보기
          </label>
        </div>
      </div>

      {/* 등록/수정 폼 */}
      {canManageEmployees ? (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #eee" }}>
          <div style={{ marginBottom: 10, fontWeight: 700 }}>
            {editingId ? `직원 수정 (ID: ${editingId})` : "직원 등록"}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input
              placeholder="login_id (필수)"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              style={{ padding: 8, minWidth: 160 }}
              disabled={saving || !!editingId} // 수정 시 login_id 변경 막음
            />
            <input
              placeholder="이름 (필수)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ padding: 8, minWidth: 160 }}
              disabled={saving}
            />
            <input
              placeholder="입사일 YYYY-MM-DD"
              value={hireDate}
              onChange={(e) => setHireDate(e.target.value)}
              style={{ padding: 8, minWidth: 170 }}
              disabled={saving}
            />
            <input
              placeholder={editingId ? "새 비밀번호(선택)" : "비밀번호(필수)"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ padding: 8, minWidth: 170 }}
              disabled={saving}
            />

            <FormButton type="button" onClick={onSubmit} disabled={saving}>
              {saving ? (editingId ? "저장 중..." : "추가 중...") : editingId ? "수정 저장" : "직원 추가"}
            </FormButton>

            {editingId && (
              <>
                <input
                  type="number"
                  placeholder="권한 단계 (숫자)"
                  value={permissionLevel}
                  onChange={(e) => setPermissionLevel(e.target.value)}
                  style={{ padding: 8, minWidth: 140 }}
                  disabled={saving}
                />
                <FormButton type="button" variant="secondary" onClick={cancelEdit} disabled={saving}>
                  취소
                </FormButton>
                <FormButton type="button" onClick={onChangePassword} disabled={saving}>
                  비밀번호 변경
                </FormButton>
              </>
            )}
          </div>

          {error && <div style={{ marginTop: 8, color: "crimson" }}>{error}</div>}
        </div>
      ) : (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #eee", color: "#666" }}>
          권한이 부족합니다.
        </div>
      )}

      {/* 목록 */}
      <div style={{ marginTop: 12, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>ID</th>
              <th style={th}>login_id</th>
              <th style={th}>이름</th>
              <th style={th}>입사일</th>
              <th style={th}>최근 로그인</th>
              <th style={th}>활성</th>
              <th style={th}>관리</th>
              <th style={th}>수정</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td style={td} colSpan={8}>데이터가 없습니다.</td>
              </tr>
            ) : (
              rows.map((e) => (
                <tr key={e.id}>
                  <td style={td}>{e.id}</td>
                  <td style={td}>{e.login_id}</td>
                  <td style={td}>{e.name}</td>
                  <td style={td}>{e.hire_date}</td>
                  <td style={td}>{e.last_login_at ?? "-"}</td>
                  <td style={td}>{e.is_active ? "Y" : "N"}</td>
                  <td style={td}>
                    {e.is_active ? (
                      <FormButton type="button" variant="secondary" onClick={() => onDelete(e.id)}>
                        삭제
                      </FormButton>
                    ) : (
                      <FormButton type="button" variant="secondary" onClick={() => onRestore(e.id)}>
                        복구
                      </FormButton>
                    )}
                  </td>
                  <td style={td}>
                    <FormButton type="button" variant="secondary" onClick={() => startEdit(e)} disabled={saving}>
                      수정
                    </FormButton>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  borderBottom: "1px solid #ddd",
  padding: "10px 8px",
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  borderBottom: "1px solid #f0f0f0",
  padding: "10px 8px",
  verticalAlign: "top",
};
