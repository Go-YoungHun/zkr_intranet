import { useEffect, useMemo, useState } from "react";
import type { AuditLog } from "../lib/audit";
import { fetchAuditLogs } from "../lib/audit";
import AuditLogEntries from "./AuditLogEntries";

type Props = {
  entityType: string;
  entityId: number | string;
  title?: string;
  pageSize?: number;
};

export default function AuditTimeline({ entityType, entityId, title = "변경 이력", pageSize = 10 }: Props) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setPage(1);
  }, [entityType, entityId]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAuditLogs({ entityType, entityId, page, pageSize });
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
  }, [entityType, entityId, page, pageSize]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [pageSize, total]);

  return (
    <section className="audit-timeline">
      <div className="audit-timeline__header">
        <strong>{title}</strong>
        <span className="audit-timeline__total">총 {total}건</span>
      </div>

      {loading ? <div className="audit-timeline__state">변경 이력을 불러오는 중...</div> : null}
      {error ? <div className="audit-timeline__state audit-timeline__state--error">{error}</div> : null}

      {!loading && !error && logs.length === 0 ? (
        <div className="audit-timeline__state">표시할 변경 이력이 없습니다.</div>
      ) : null}

      {logs.length > 0 ? <AuditLogEntries logs={logs} /> : null}

      <div className="audit-timeline__pagination">
        <button
          type="button"
          className="audit-timeline__page-btn"
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          disabled={page <= 1 || loading}
        >
          이전
        </button>
        <span className="audit-timeline__page-text">
          {page} / {totalPages} (총 {total}건)
        </span>
        <button
          type="button"
          className="audit-timeline__page-btn"
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          disabled={page >= totalPages || loading}
        >
          다음
        </button>
      </div>
    </section>
  );
}
