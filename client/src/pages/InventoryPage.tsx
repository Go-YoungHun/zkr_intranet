import { useEffect, useMemo, useState } from "react";
import {
  createInventory,
  createInventoryTransaction,
  fetchInventories,
  fetchInventoryTransactions,
} from "../lib/inventory";
import type {
  Inventory,
  InventoryCreateInput,
  InventoryPagination,
  InventoryTransaction,
  InventoryTransactionType,
} from "../lib/inventory";

const transactionTypeLabel: Record<InventoryTransactionType, string> = {
  IN: "입고",
  OUT: "출고",
  ADJUST: "조정",
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ko-KR", {
    hour12: false,
  });
}

export default function InventoryPage() {
  const [rows, setRows] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [pagination, setPagination] = useState<InventoryPagination | null>(null);

  const [showCreatePanel, setShowCreatePanel] = useState(false);
  const [createForm, setCreateForm] = useState<InventoryCreateInput>({
    serial_no: "",
    category: "",
    asset_name: "",
    quantity: 0,
    location: "",
    note: "",
  });

  const [selectedInventory, setSelectedInventory] = useState<Inventory | null>(null);
  const [txType, setTxType] = useState<InventoryTransactionType>("IN");
  const [txQuantity, setTxQuantity] = useState<number>(1);
  const [txReason, setTxReason] = useState("");
  const [txNote, setTxNote] = useState("");

  const [historyRows, setHistoryRows] = useState<InventoryTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = async (query = searchQuery) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchInventories({ includeZero: true, query: query.trim(), page, limit });
      setRows(data.rows);
      setPagination(data.pagination);
    } catch (e: any) {
      setError(e?.message || "재고 목록을 불러오지 못했습니다.");
      setRows([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchQuery, page, limit]);

  const panelTitle = useMemo(() => {
    if (!selectedInventory) return "";
    return `${selectedInventory.asset_name} (${selectedInventory.serial_no || "시리얼 없음"})`;
  }, [selectedInventory]);

  const handleCreateInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createInventory({
        ...createForm,
        quantity: Number(createForm.quantity || 0),
      });
      setCreateForm({
        serial_no: "",
        category: "",
        asset_name: "",
        quantity: 0,
        location: "",
        note: "",
      });
      setShowCreatePanel(false);
      await load();
    } catch (e: any) {
      setError(e?.message || "재고 등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const openTransactionPanel = (inventory: Inventory, type: InventoryTransactionType) => {
    setSelectedInventory(inventory);
    setTxType(type);
    setTxQuantity(type === "ADJUST" ? inventory.quantity : 1);
    setTxReason("");
    setTxNote("");
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInventory) return;

    setError(null);
    setSubmitting(true);
    try {
      await createInventoryTransaction(selectedInventory.id, {
        type: txType,
        quantity: Number(txQuantity),
        reason: txReason,
        note: txNote || undefined,
      });
      await load();
      await handleLoadHistory(selectedInventory);
      setSelectedInventory(null);
    } catch (e: any) {
      setError(e?.message || "재고 변동 등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoadHistory = async (inventory: Inventory) => {
    setHistoryLoading(true);
    setError(null);
    try {
      const data = await fetchInventoryTransactions(inventory.id);
      setHistoryRows(data.rows);
    } catch (e: any) {
      setError(e?.message || "이력 조회에 실패했습니다.");
      setHistoryRows([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="inventory-page">
      <div className="inventory-header">
        <div>
          <h2 style={{ margin: 0 }}>재고 목록</h2>
          <p className="inventory-subtitle">시리얼 번호 기준으로 관리 중인 부품 재고입니다.</p>
        </div>
        <div className="inventory-actions-row">
          <input
            placeholder="검색 (시리얼/중분류/자산명/위치/비고)"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
          />
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
          >
            <option value={20}>20개씩</option>
            <option value={50}>50개씩</option>
            <option value={100}>100개씩</option>
          </select>
          <button type="button" className="inventory-btn" onClick={() => setShowCreatePanel((prev) => !prev)}>
            재고 등록
          </button>
        </div>
      </div>

      {showCreatePanel && (
        <form className="inventory-panel" onSubmit={handleCreateInventory}>
          <h3>신규 재고 등록</h3>
          <div className="inventory-form-grid">
            <input placeholder="시리얼번호" value={createForm.serial_no || ""} onChange={(e) => setCreateForm((prev) => ({ ...prev, serial_no: e.target.value }))} />
            <input placeholder="중분류" required value={createForm.category} onChange={(e) => setCreateForm((prev) => ({ ...prev, category: e.target.value }))} />
            <input placeholder="자산명" required value={createForm.asset_name} onChange={(e) => setCreateForm((prev) => ({ ...prev, asset_name: e.target.value }))} />
            <input type="number" min={0} placeholder="초기 수량" value={createForm.quantity ?? 0} onChange={(e) => setCreateForm((prev) => ({ ...prev, quantity: Number(e.target.value) }))} />
            <input placeholder="위치" value={createForm.location || ""} onChange={(e) => setCreateForm((prev) => ({ ...prev, location: e.target.value }))} />
            <input placeholder="비고" value={createForm.note || ""} onChange={(e) => setCreateForm((prev) => ({ ...prev, note: e.target.value }))} />
          </div>
          <button type="submit" className="inventory-btn" disabled={submitting}>등록</button>
        </form>
      )}

      {selectedInventory && (
        <form className="inventory-panel" onSubmit={handleCreateTransaction}>
          <h3>재고 변동 등록 - {panelTitle}</h3>
          <div className="inventory-form-grid">
            <select value={txType} onChange={(e) => setTxType(e.target.value as InventoryTransactionType)}>
              <option value="IN">입고</option>
              <option value="OUT">출고</option>
              <option value="ADJUST">조정</option>
            </select>
            <input
              type="number"
              min={1}
              value={txQuantity}
              onChange={(e) => setTxQuantity(Number(e.target.value))}
              placeholder={txType === "ADJUST" ? "조정 후 수량" : "수량"}
              required
            />
            <input value={txReason} onChange={(e) => setTxReason(e.target.value)} placeholder="사유" required />
            <input value={txNote} onChange={(e) => setTxNote(e.target.value)} placeholder="메모" />
          </div>
          <div className="inventory-actions-row">
            <button type="submit" className="inventory-btn" disabled={submitting}>
              저장
            </button>
            <button type="button" className="inventory-btn inventory-btn--ghost" onClick={() => setSelectedInventory(null)}>
              닫기
            </button>
          </div>
        </form>
      )}

      {error && <div className="inventory-error">{error}</div>}

      <div className="inventory-table-wrapper">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>시리얼번호</th>
              <th>중분류</th>
              <th>자산명</th>
              <th>현재 수량</th>
              <th>최근 변동</th>
              <th>최근 변동일</th>
              <th>위치</th>
              <th>액션</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="inventory-empty" colSpan={8}>
                  로딩중...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="inventory-empty" colSpan={8}>
                  등록된 재고가 없습니다.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className={row.quantity === 0 ? "inventory-row--zero" : undefined}
                >
                  <td>{row.serial_no || "-"}</td>
                  <td>{row.category}</td>
                  <td>{row.asset_name}</td>
                  <td>{row.quantity}</td>
                  <td>{row.latest_transaction_type ? transactionTypeLabel[row.latest_transaction_type] : "-"}</td>
                  <td>{formatDate(row.latest_transaction_at)}</td>
                  <td>{row.location || "-"}</td>
                  <td>
                    <div className="inventory-actions-row">
                      <button type="button" className="inventory-btn inventory-btn--small" onClick={() => openTransactionPanel(row, "IN")}>입고</button>
                      <button type="button" className="inventory-btn inventory-btn--small" onClick={() => openTransactionPanel(row, "OUT")}>출고</button>
                      <button type="button" className="inventory-btn inventory-btn--small" onClick={() => openTransactionPanel(row, "ADJUST")}>조정</button>
                      <button type="button" className="inventory-btn inventory-btn--ghost inventory-btn--small" onClick={() => handleLoadHistory(row)}>이력</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="inventory-pagination">
        <button
          type="button"
          className="inventory-btn inventory-btn--small"
          onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
          disabled={loading || (pagination?.page ?? page) <= 1}
        >
          이전
        </button>
        <span className="inventory-subtitle">
          {pagination
            ? `${pagination.page} / ${Math.max(pagination.totalPages, 1)} 페이지 (총 ${pagination.totalCount}건)`
            : `${page} 페이지`}
        </span>
        <button
          type="button"
          className="inventory-btn inventory-btn--small"
          onClick={() => setPage((prev) => prev + 1)}
          disabled={loading || (pagination ? pagination.page >= pagination.totalPages : true)}
        >
          다음
        </button>
      </div>

      <section className="inventory-panel">
        <h3>변동 이력</h3>
        {historyLoading ? (
          <p className="inventory-subtitle">이력을 불러오는 중입니다...</p>
        ) : historyRows.length === 0 ? (
          <p className="inventory-subtitle">조회된 변동 이력이 없습니다.</p>
        ) : (
          <div className="inventory-table-wrapper">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>유형</th>
                  <th>변동량</th>
                  <th>사유</th>
                  <th>메모</th>
                  <th>등록일</th>
                </tr>
              </thead>
              <tbody>
                {historyRows.map((history) => (
                  <tr key={history.id}>
                    <td>{transactionTypeLabel[history.type]}</td>
                    <td>{history.quantity_delta > 0 ? `+${history.quantity_delta}` : history.quantity_delta}</td>
                    <td>{history.reason}</td>
                    <td>{history.note || "-"}</td>
                    <td>{formatDate(history.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
