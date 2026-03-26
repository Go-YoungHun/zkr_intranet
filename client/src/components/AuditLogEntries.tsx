import type { CSSProperties } from "react";
import type { AuditLog } from "../lib/audit";

type Props = {
  logs: AuditLog[];
  showEntityMeta?: boolean;
};

const badgeStyle = (action: AuditLog["action"]): CSSProperties => {
  if (action === "create") return { background: "#ecfdf3", color: "#15803d" };
  if (action === "delete") return { background: "#fef2f2", color: "#b91c1c" };
  return { background: "#eff6ff", color: "#1d4ed8" };
};

const formatWorker = (log: AuditLog) => {
  const worker = log.performedBy ?? log.actor;
  if (!worker) return "알 수 없음";

  const behalf = log.onBehalfOf;
  const label = worker.login_id ? `${worker.name} (${worker.login_id})` : worker.name;

  if (behalf && behalf.id !== worker.id) {
    return `${label} → 대리 대상: ${behalf.name}${behalf.login_id ? ` (${behalf.login_id})` : ""}`;
  }

  return label;
};

const actionToLabel = (action: AuditLog["action"]) => {
  if (action === "create") return "생성";
  if (action === "delete") return "삭제";
  return "수정";
};

const FIELD_LABEL_MAP: Record<string, string> = {
  name: "고객사명",
  name_en: "영문명",
  code: "코드",
  phone: "전화번호",
  address: "주소",
  group_id: "그룹",
  sales_agency_id: "대리점",
  label: "라벨",
  file_name: "파일명",
  file_url: "파일 URL",
  mime_type: "파일 형식",
  size: "파일 크기",
};

const toKebabWords = (raw: string) =>
  raw
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[_-]+/g, " ")
    .trim();

const formatFieldLabel = (fieldPath: string) => {
  if (!fieldPath) return "(필드 없음)";
  const key = fieldPath.split(".").pop() ?? fieldPath;
  return FIELD_LABEL_MAP[key] ?? toKebabWords(key);
};

const readPathValue = (input: unknown, path: string) => {
  if (!path) return input;
  return path.split(".").reduce<unknown>((acc, key) => {
    if (!acc || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, input);
};

const stringifyValue = (value: unknown) => {
  if (value === undefined || value === null || value === "") return "(비어있음)";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
};

const resolveSummary = (log: AuditLog) => {
  const fields = log.changed_fields_json ?? [];
  if (fields.length === 0) return "변경 필드 정보 없음";
  return fields.map(formatFieldLabel).join(", ");
};

export default function AuditLogEntries({ logs, showEntityMeta = false }: Props) {
  return (
    <ul className="audit-log-list">
      {logs.map((log) => {
        const fields = log.changed_fields_json ?? [];
        return (
          <li key={log.id} className="audit-log-card">
            <div className="audit-log-card__meta">
              <div className="audit-log-card__line">
                <strong>시각</strong>: {new Date(log.created_at).toLocaleString()}
              </div>
              {showEntityMeta ? (
                <div className="audit-log-card__line">
                  <strong>대상</strong>: {log.entity_type} / {log.entity_id}
                </div>
              ) : null}
              <div className="audit-log-card__line">
                <strong>작업자</strong>: {formatWorker(log)}
              </div>
              <div className="audit-log-card__line audit-log-card__line--action">
                <strong>액션</strong>
                <span
                  className="audit-log-card__badge"
                  style={{
                    ...badgeStyle(log.action),
                  }}
                >
                  {actionToLabel(log.action)}
                </span>
              </div>
              <div className="audit-log-card__line">
                <strong>변경 필드 요약</strong>: {resolveSummary(log)}
              </div>
            </div>

            <details className="audit-log-card__details">
              <summary className="audit-log-card__summary">상세 diff 보기</summary>
              {fields.length > 0 ? (
                <div className="audit-log-card__table-wrap">
                  <table className="audit-log-card__table">
                    <thead>
                      <tr>
                        <th style={headerCellStyle}>필드</th>
                        <th style={headerCellStyle}>변경 전</th>
                        <th style={headerCellStyle}>변경 후</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fields.map((fieldPath) => (
                        <tr key={`${log.id}-${fieldPath}`}>
                          <td style={bodyCellStyle}>
                            <div style={{ fontWeight: 600 }}>{formatFieldLabel(fieldPath)}</div>
                            <div style={{ color: "#6b7280", fontSize: 11 }}>{fieldPath}</div>
                          </td>
                          <td style={bodyCellStyle}>{stringifyValue(readPathValue(log.before_json, fieldPath))}</td>
                          <td style={bodyCellStyle}>{stringifyValue(readPathValue(log.after_json, fieldPath))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <pre className="audit-log-card__json">
                  {JSON.stringify({ before: log.before_json, after: log.after_json }, null, 2)}
                </pre>
              )}
            </details>
          </li>
        );
      })}
    </ul>
  );
}

const headerCellStyle: CSSProperties = {
  textAlign: "left",
  borderBottom: "1px solid #e5e7eb",
  padding: "6px 8px",
  color: "#374151",
  fontWeight: 700,
};

const bodyCellStyle: CSSProperties = {
  borderBottom: "1px solid #f3f4f6",
  padding: "6px 8px",
  color: "#111827",
  verticalAlign: "top",
};
