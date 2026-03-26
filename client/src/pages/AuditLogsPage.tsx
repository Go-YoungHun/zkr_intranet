import { useEffect, useMemo, useState } from "react";
import AuditLogEntries from "../components/AuditLogEntries";
import { useAuth } from "../auth/AuthContext";
import type { AuditLog } from "../lib/audit";
import { fetchAuditLogs } from "../lib/audit";

const ENTITY_TYPE_OPTIONS = [
  "customer",
  "machine",
  "ticket",
  "ticket_comment",
  "ticket_category",
  "board_post",
  "board_attachment",
];

export default function AuditLogsPage() {
  const { user } = useAuth();
  const isAdmin = Number(user?.permission_level ?? 0) >= 7;

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState<"" | AuditLog["action"]>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [worker, setWorker] = useState("");
  const [query, setQuery] = useState("");
  const [actorEmployeeId, setActorEmployeeId] = useState("");
  const [performedByEmployeeId, setPerformedByEmployeeId] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAuditLogs({
          entityType: entityType || undefined,
          action: action || undefined,
          actorEmployeeId: actorEmployeeId ? Number(actorEmployeeId) : undefined,
          performedByEmployeeId: performedByEmployeeId ? Number(performedByEmployeeId) : undefined,
          from: dateFrom || undefined,
          to: dateTo || undefined,
          worker: worker.trim() || undefined,
          q: query.trim() || undefined,
          page,
          pageSize,
        });
        if (cancelled) return;
        setLogs(data.rows);
        setTotal(data.total);
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setError("변경 이력을 불러오지 못했습니다.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [
    action,
    actorEmployeeId,
    dateFrom,
    dateTo,
    entityType,
    page,
    pageSize,
    performedByEmployeeId,
    query,
    worker,
  ]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [pageSize, total]);

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginTop: 0 }}>변경이력</h2>
      <div style={{ fontSize: 13, color: "#4b5563", marginTop: 8, marginBottom: 8 }}>
        {isAdmin
          ? "관리자는 전체 변경 이력을 조회할 수 있습니다."
          : "일반 사용자는 본인이 관련된 변경 이력만 조회됩니다. (actor/performedBy/onBehalfOf)"}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 10,
          marginTop: 12,
          marginBottom: 12,
        }}
      >
        <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
          엔티티 타입
          <select
            value={entityType}
            onChange={(event) => {
              setPage(1);
              setEntityType(event.target.value);
            }}
          >
            <option value="">전체</option>
            {ENTITY_TYPE_OPTIONS.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
          액션
          <select
            value={action}
            onChange={(event) => {
              setPage(1);
              setAction(event.target.value as "" | AuditLog["action"]);
            }}
          >
            <option value="">전체</option>
            <option value="create">생성</option>
            <option value="update">수정</option>
            <option value="delete">삭제</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
          기간 시작
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => {
              setPage(1);
              setDateFrom(event.target.value);
            }}
          />
        </label>

        <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
          기간 종료
          <input
            type="date"
            value={dateTo}
            onChange={(event) => {
              setPage(1);
              setDateTo(event.target.value);
            }}
          />
        </label>

        <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
          작업자
          <input
            placeholder="이름/아이디"
            value={worker}
            onChange={(event) => {
              setPage(1);
              setWorker(event.target.value);
            }}
          />
        </label>

        <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
          작업자 ID(actor)
          <input
            type="number"
            min={1}
            placeholder="예: 1001"
            value={actorEmployeeId}
            onChange={(event) => {
              setPage(1);
              setActorEmployeeId(event.target.value);
            }}
          />
        </label>

        <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
          수행자 ID(performedBy)
          <input
            type="number"
            min={1}
            placeholder="예: 1001"
            value={performedByEmployeeId}
            onChange={(event) => {
              setPage(1);
              setPerformedByEmployeeId(event.target.value);
            }}
          />
        </label>

        <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
          검색어
          <input
            placeholder="엔티티/ID/작업자"
            value={query}
            onChange={(event) => {
              setPage(1);
              setQuery(event.target.value);
            }}
          />
        </label>
      </div>

      {loading ? <div style={{ color: "#6b7280" }}>변경 이력을 불러오는 중...</div> : null}
      {error ? <div style={{ color: "crimson" }}>{error}</div> : null}
      {!loading && !error && logs.length === 0 ? <div style={{ color: "#666" }}>표시할 로그가 없습니다.</div> : null}

      {logs.length > 0 ? <AuditLogEntries logs={logs} showEntityMeta /> : null}

      <div
        style={{
          marginTop: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontSize: 13, color: "#4b5563" }}>
          {page} / {totalPages} (총 {total}건)
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <select
            value={pageSize}
            onChange={(event) => {
              setPage(1);
              setPageSize(Number(event.target.value));
            }}
            disabled={loading}
          >
            {[10, 20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}개씩
              </option>
            ))}
          </select>
          <button type="button" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page <= 1 || loading}>
            이전
          </button>
          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page >= totalPages || loading}
          >
            다음
          </button>
        </div>
      </div>
    </div>
  );
}
