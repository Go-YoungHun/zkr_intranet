import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Ticket } from "../lib/tickets";
import { fetchTickets } from "../lib/tickets";
import FormButton from "../components/FormButton";

export default function TicketsPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const ticketData = await fetchTickets({
        query: debouncedQuery,
        page,
        pageSize,
      });
      setTickets(ticketData.rows);
      setTotal(ticketData.total);
      setPage(ticketData.page);
      setPageSize(ticketData.pageSize);
    } catch (e: any) {
      setError(e?.message || "티켓 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [debouncedQuery, page, pageSize]);

  const handleSearch = () => {
    setPage(1);
    setDebouncedQuery(query.trim());
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const clampedPage = Math.min(page, totalPages);

  const goToPage = (nextPage: number) => {
    const target = Math.min(Math.max(nextPage, 1), totalPages);
    if (target !== page) {
      setPage(target);
    }
  };

  const getPageNumbers = () => {
    const maxVisible = 5;
    let start = Math.max(1, clampedPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  };

  if (loading) return <div style={{ padding: 24 }}>로딩중...</div>;

  return (
    <div style={{ padding: 24 }}>
      <style>
        {`
          .tickets-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
            background: #fff;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            overflow: hidden;
          }

          .tickets-table thead {
            background: #f9fafb;
            text-align: left;
          }

          .tickets-table th,
          .tickets-table td {
            padding: 12px 16px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 14px;
            vertical-align: middle;
          }

          .tickets-table tr:last-child td {
            border-bottom: none;
          }

          .tickets-row {
            cursor: pointer;
            transition: background 0.2s ease;
          }

          .tickets-row:hover {
            background: #f8fafc;
          }

          .ticket-title-row {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .ticket-subject {
            font-weight: 700;
            font-size: 15px;
          }

          .ticket-summary {
            display: none;
            margin-top: 8px;
            color: #6b7280;
            font-size: 12px;
            gap: 4px 12px;
          }

          @media (max-width: 960px) {
            .col-machine {
              display: none;
            }
          }

          @media (max-width: 720px) {
            .col-customer,
            .col-machine,
            .col-updated {
              display: none;
            }

            .ticket-summary {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          }
        `}
      </style>
      <div className="action-bar">
        <h2 style={{ margin: 0 }}>티켓 목록</h2>
        <div className="action-bar__actions">
          <input
            placeholder="티켓 검색"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleSearch();
              }
            }}
            style={{ padding: 8, minWidth: 200 }}
          />
          <FormButton type="button" onClick={handleSearch}>
            검색
          </FormButton>
          <FormButton
            type="button"
            variant="secondary"
            onClick={() => navigate("/tickets/categories")}
          >
            카테고리 관리
          </FormButton>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "#6b7280" }}>페이지 크기</span>
            <select
              value={pageSize}
              onChange={(event) => {
                setPage(1);
                setPageSize(Number(event.target.value));
              }}
              style={{ padding: 6 }}
            >
              {[10, 20, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
          <FormButton type="button" onClick={() => navigate("/tickets/new")}>
            등록
          </FormButton>
        </div>
      </div>

      {error && (
        <div style={{ marginTop: 12, color: "crimson" }}>
          {error}
        </div>
      )}

      <div
        style={{
          marginTop: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ color: "#6b7280", fontSize: 13 }}>
          총 {total.toLocaleString()}건 · {clampedPage}/{totalPages} 페이지
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <FormButton
            type="button"
            variant="secondary"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
          >
            이전
          </FormButton>
          {getPageNumbers().map((pageNumber) => (
            <FormButton
              key={pageNumber}
              type="button"
              variant="secondary"
              onClick={() => goToPage(pageNumber)}
              className={pageNumber === clampedPage ? "pagination-button--active" : undefined}
            >
              {pageNumber}
            </FormButton>
          ))}
          <FormButton
            type="button"
            variant="secondary"
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages}
          >
            다음
          </FormButton>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        {tickets.length === 0 ? (
          <div style={{ padding: 16, border: "1px dashed #ddd", color: "#666" }}>
            데이터가 없습니다.
          </div>
        ) : (
          <table className="tickets-table">
            <thead>
              <tr>
                <th>번호</th>
                <th>상태</th>
                <th>카테고리</th>
                <th>제목</th>
                <th className="col-customer">고객사</th>
                <th className="col-machine">장비</th>
                <th>작성자</th>
                <th className="col-updated">접수시간</th>
                <th className="col-updated">종료시간</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => {
                const openedByLabel = ticket.openedBy?.name ?? ticket.openedBy?.login_id ?? "-";
                const receivedAt = ticket.opened_at ?? ticket.created_at;
                const closedAt = formatTicketDateTime(ticket.closed_at);

                return (
                  <tr
                    key={ticket.id}
                    className="tickets-row"
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate(`/tickets/${ticket.id}`);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <td>{ticket.id}</td>
                    <td>
                      <span style={statusBadgeStyle(ticket.status)}>
                        {ticket.status ?? "OPEN"}
                      </span>
                    </td>
                    <td>{ticket.TicketCategory?.name ?? "-"}</td>
                    <td>
                      <div className="ticket-title-row">
                        <span className="ticket-subject">{ticket.subject}</span>
                      </div>
                      <div className="ticket-summary">
                        <div>카테고리: {ticket.TicketCategory?.name ?? "-"}</div>
                        <div>작성자: {openedByLabel}</div>
                        <div>접수시간: {formatTicketDateTime(receivedAt)}</div>
                        <div>종료시간: {closedAt}</div>
                        <div>고객사: {ticket.Customer?.name ?? "-"}</div>
                        <div>장비: {ticket.Machine?.name ?? "선택 안함"}</div>
                      </div>
                    </td>
                    <td className="col-customer">{ticket.Customer?.name ?? "-"}</td>
                    <td className="col-machine">{ticket.Machine?.name ?? "선택 안함"}</td>
                    <td>{openedByLabel}</td>
                    <td className="col-updated">{formatTicketDateTime(receivedAt)}</td>
                    <td className="col-updated">{closedAt}</td>
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

const statusBadgeStyle = (status?: string | null): React.CSSProperties => {
  const normalized = (status ?? "OPEN").toLowerCase();
  if (normalized.includes("close")) {
    return {
      fontSize: 12,
      padding: "4px 10px",
      borderRadius: 999,
      background: "#fef2f2",
      color: "#b91c1c",
      fontWeight: 600,
    };
  }
  if (normalized.includes("progress") || normalized.includes("ing")) {
    return {
      fontSize: 12,
      padding: "4px 10px",
      borderRadius: 999,
      background: "#eff6ff",
      color: "#1d4ed8",
      fontWeight: 600,
    };
  }
  return {
    fontSize: 12,
    padding: "4px 10px",
    borderRadius: 999,
    background: "#ecfdf3",
    color: "#15803d",
    fontWeight: 600,
  };
};

const formatKoreanDateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "-";

const formatYmdDate = (value?: string | null) => {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatTicketDateTime = (value?: string | null, dateOnly = false) =>
  dateOnly ? formatYmdDate(value) : formatKoreanDateTime(value);
