import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  createLeaveRequest,
  fetchLeaveRequests,
  fetchLeaveSummary,

  updateLeaveStatus,
} from "../lib/leave";
import type { LeaveRequestItem, LeaveUnit } from "../lib/leave";

const ADMIN_PERMISSION_LEVEL = 7;
const REASON_MAX_LENGTH = 500;

type FormState = {
  start_date: string;
  end_date: string;
  leave_unit: LeaveUnit;
  reason: string;
};

const initialFormState: FormState = {
  start_date: "",
  end_date: "",
  leave_unit: "full",
  reason: "",
};

const cardStyle: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 20,
  background: "#fff",
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
};

function formatLeaveUnit(unit: LeaveUnit) {
  if (unit === "half_am") return "오전 반차";
  if (unit === "half_pm") return "오후 반차";
  return "연차";
}

function validateForm(form: FormState): string | null {
  if (!form.start_date || !form.end_date || !form.reason.trim()) {
    return "시작일, 종료일, 사유를 모두 입력해 주세요.";
  }

  if (form.start_date > form.end_date) {
    return "시작일은 종료일보다 늦을 수 없습니다.";
  }

  if ((form.leave_unit === "half_am" || form.leave_unit === "half_pm") && form.start_date !== form.end_date) {
    return "반차는 하루만 선택할 수 있습니다.";
  }

  if (form.reason.trim().length > REASON_MAX_LENGTH) {
    return `사유는 ${REASON_MAX_LENGTH}자 이하로 작성해 주세요.`;
  }

  return null;
}

export default function EmployeesLeavePage() {
  const { user } = useAuth();
  const isAdmin = Number(user?.permission_level ?? 0) >= ADMIN_PERMISSION_LEVEL;

  const [summary, setSummary] = useState({ total_days: 0, used_days: 0, pending_days: 0, remaining_days: 0 });
  const [requests, setRequests] = useState<LeaveRequestItem[]>([]);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const sortedRequests = useMemo(
    () => [...requests].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
    [requests]
  );

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [summaryData, requestData] = await Promise.all([
        fetchLeaveSummary(),
        fetchLeaveRequests(),
      ]);
      setSummary(summaryData);
      setRequests(requestData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "연차 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const validationMessage = validateForm(form);
    if (validationMessage) {
      setSubmitError(validationMessage);
      return;
    }

    try {
      setSubmitError(null);
      setSubmitLoading(true);
      await createLeaveRequest({
        start_date: form.start_date,
        end_date: form.end_date,
        leave_unit: form.leave_unit,
        reason: form.reason.trim(),
      });
      setForm(initialFormState);
      await loadData();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "연차 신청에 실패했습니다.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleStatusChange = async (id: number, status: "approved" | "rejected") => {
    try {
      await updateLeaveStatus(id, status);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "상태 변경에 실패했습니다.");
    }
  };

  return (
    <div style={{ padding: 24, display: "grid", gap: 16 }}>
      <h2 style={{ margin: 0 }}>연차 관리</h2>

      {error ? (
        <div style={{ ...cardStyle, borderColor: "#ef4444", color: "#b91c1c" }}>{error}</div>
      ) : null}

      <section style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>(a) 개인 잔여 연차 요약</h3>
        {loading ? (
          <p>요약 정보를 불러오는 중...</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
            <div><strong>총 연차</strong><br />{summary.total_days}일</div>
            <div><strong>사용</strong><br />{summary.used_days}일</div>
            <div><strong>대기</strong><br />{summary.pending_days}일</div>
            <div><strong>잔여</strong><br />{summary.remaining_days}일</div>
          </div>
        )}
      </section>

      <section style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>(b) 연차 신청 폼</h3>
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 10, maxWidth: 520 }}>
          <label>
            시작일
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => setForm((prev) => ({ ...prev, start_date: e.target.value }))}
              style={{ width: "100%", marginTop: 4 }}
            />
          </label>
          <label>
            종료일
            <input
              type="date"
              value={form.end_date}
              onChange={(e) => setForm((prev) => ({ ...prev, end_date: e.target.value }))}
              style={{ width: "100%", marginTop: 4 }}
            />
          </label>
          <label>
            유형
            <select
              value={form.leave_unit}
              onChange={(e) => setForm((prev) => ({ ...prev, leave_unit: e.target.value as LeaveUnit }))}
              style={{ width: "100%", marginTop: 4 }}
            >
              <option value="full">연차</option>
              <option value="half_am">오전 반차</option>
              <option value="half_pm">오후 반차</option>
            </select>
          </label>
          <label>
            사유 ({form.reason.length}/{REASON_MAX_LENGTH})
            <textarea
              value={form.reason}
              onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
              rows={4}
              style={{ width: "100%", marginTop: 4 }}
            />
          </label>

          {submitError ? <div style={{ color: "#b91c1c" }}>{submitError}</div> : null}

          <button type="submit" disabled={submitLoading} style={{ width: 120 }}>
            {submitLoading ? "신청 중..." : "연차 신청"}
          </button>
        </form>
      </section>

      <section style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>(c) 신청/승인 이력 목록</h3>
        {loading ? (
          <p>이력을 불러오는 중...</p>
        ) : sortedRequests.length === 0 ? (
          <p>신청 이력이 없습니다.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {sortedRequests.map((request) => (
              <div key={request.id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <strong>
                    {request.start_date} ~ {request.end_date} · {formatLeaveUnit(request.leave_unit)} ({request.duration_days}일)
                  </strong>
                  <span>상태: {request.status}</span>
                </div>
                <div style={{ marginTop: 8 }}>{request.reason}</div>
                <div style={{ marginTop: 8, fontSize: 13, color: "#4b5563" }}>
                  신청자: {request.requester?.name ?? user?.name ?? "-"}
                  {request.reviewer ? ` · 처리자: ${request.reviewer.name}` : ""}
                </div>
                {isAdmin && request.status === "pending" ? (
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button type="button" onClick={() => handleStatusChange(request.id, "approved")}>승인</button>
                    <button type="button" onClick={() => handleStatusChange(request.id, "rejected")}>반려</button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
