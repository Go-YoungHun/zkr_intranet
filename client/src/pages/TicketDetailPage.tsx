import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import type {
  Ticket,
  TicketAttachment,
  TicketAttachmentType,
} from "../lib/tickets";
import {
  deleteTicketAttachment,
  fetchTicket,
  fetchTicketAttachments,
  updateTicket,
  uploadTicketAttachment,
} from "../lib/tickets";
import { fetchCustomers, formatCustomerLabel } from "../lib/customers";
import type { Customer } from "../lib/customers";
import { fetchMachines } from "../lib/machines";
import type { Machine } from "../lib/machines";
import { isRichTextEmpty } from "../lib/richText";
import { sanitizeHtml } from "../lib/sanitizeHtml";
import DetailPageHeader from "../components/DetailPageHeader";
import FormButton from "../components/FormButton";
import FormInput from "../components/FormInput";
import FormSelect from "../components/FormSelect";
import RichTextEditor from "../components/RichTextEditor";
import {
  buildAttachmentLabel,
  createEmptyAttachmentUploadDraft,
} from "../lib/ticketAttachmentDraft";
import type { AttachmentUploadDraft } from "../lib/ticketAttachmentDraft";
import { formatDateTime, parseDateTime } from "../lib/dateTime";
import Modal from "../components/Modal";

const attachmentTypeOptions: Array<{
  value: TicketAttachmentType;
  label: string;
}> = [
  { value: "etc", label: "기타" },
  { value: "photo", label: "사진" },
  { value: "service_report", label: "서비스 리포트" },
  { value: "log_file", label: "로그 파일" },
  { value: "certificate", label: "인증서" },
];

const attachmentTypeLabelMap: Record<TicketAttachmentType, string> = {
  etc: "기타",
  photo: "사진",
  service_report: "서비스 리포트",
  log_file: "로그 파일",
  certificate: "인증서",
};

const toDateTimeLocalValue = (value?: string | null) => {
  if (!value) return "";
  const date = parseDateTime(value);
  if (!date) return "";
  const timezoneOffsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
};

const normalizeDateTimeToIso = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const statusLabelMap: Record<string, string> = {
  open: "접수",
  in_progress: "진행중",
  closed: "완료",
  cancelled: "취소",
  canceled: "취소",
};

const getStatusLabel = (value?: string | null) => {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return "접수";
  return statusLabelMap[normalized] ?? value ?? "접수";
};

export default function TicketDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const ticketId = Number(id);

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [customerId, setCustomerId] = useState<number | "">("");
  const [machineId, setMachineId] = useState<number | "">("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [openedAt, setOpenedAt] = useState("");
  const [closedAt, setClosedAt] = useState("");
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusAction, setStatusAction] = useState<
    "open" | "in_progress" | "closed" | "cancelled"
  >("closed");
  const [statusActionDateTime, setStatusActionDateTime] = useState(() =>
    toDateTimeLocalValue(new Date().toISOString()),
  );
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);

  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [attachmentFiles, setAttachmentFiles] = useState<
    AttachmentUploadDraft[]
  >([]);
  const attachmentDraftIdRef = useRef(0);
  const [attachmentsLoading, setAttachmentsLoading] = useState(true);
  const [attachmentsError, setAttachmentsError] = useState<string | null>(null);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<
    number | null
  >(null);
  const attachmentNotice = useMemo(() => {
    const uploadError = location.state?.attachmentUploadError;
    if (!uploadError) return null;
    if (typeof uploadError === "object") {
      const failedCount = Number(uploadError.failedCount);
      const totalCount = Number(uploadError.totalCount);
      if (
        Number.isFinite(failedCount) &&
        Number.isFinite(totalCount) &&
        totalCount > 0
      ) {
        return `티켓은 등록되었지만 첨부파일 ${totalCount}건 중 ${failedCount}건 업로드에 실패했습니다.`;
      }
    }
    return "티켓은 등록되었지만 첨부파일 업로드에 실패했습니다.";
  }, [location.state?.attachmentUploadError]);
  const statusOptions = [
    { value: "open", label: "접수" },
    { value: "in_progress", label: "진행중" },
    { value: "closed", label: "완료" },
    { value: "cancelled", label: "취소" },
  ];
  const sanitizedTicketDescription = useMemo(
    () => sanitizeHtml(ticket?.description ?? ""),
    [ticket?.description],
  );

  const resetFormFromTicket = (data: Ticket) => {
    setCustomerId((data.customer_id ?? "") as any);
    setMachineId((data.machine_id ?? "") as any);
    setSubject(data.subject ?? "");
    setDescription(data.description ?? "");
    setStatus(data.status ?? "");
    setPriority(data.priority ?? "");
    setOpenedAt(toDateTimeLocalValue(data.opened_at));
    setClosedAt(toDateTimeLocalValue(data.closed_at));
  };

  const load = async () => {
    if (!ticketId) {
      setError("유효하지 않은 티켓입니다.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [data, customerList, machineList] = await Promise.all([
        fetchTicket(ticketId),
        fetchCustomers(false, undefined, 1, 1000),
        fetchMachines(false, undefined, 1, 1000),
      ]);
      setTicket(data);
      setCustomers(customerList.rows);
      setMachines(machineList.rows);
      resetFormFromTicket(data);
      setIsEditing(false);
    } catch (e: any) {
      setError(e?.message || "티켓을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const loadAttachments = async () => {
    if (!ticketId) return;
    setAttachmentsLoading(true);
    setAttachmentsError(null);
    try {
      const attachmentList = await fetchTicketAttachments(ticketId);
      setAttachments(attachmentList);
    } catch (e: any) {
      setAttachmentsError(e?.message || "첨부파일을 불러오지 못했습니다.");
    } finally {
      setAttachmentsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [ticketId]);

  useEffect(() => {
    loadAttachments();
  }, [ticketId]);

  useEffect(() => {
    if (location.state?.attachmentUploadError) {
      const clearedState = { ...location.state };
      delete clearedState.attachmentUploadError;
      navigate(location.pathname, { replace: true, state: clearedState });
    }
  }, [location, navigate]);

  const availableMachines = useMemo(() => {
    if (customerId === "") return machines;
    return machines.filter((machine) => machine.customer_id === customerId);
  }, [customerId, machines]);

  useEffect(() => {
    if (
      machineId !== "" &&
      !availableMachines.some((machine) => machine.id === machineId)
    ) {
      setMachineId("");
    }
  }, [availableMachines, machineId]);

  const onSave = async () => {
    if (!ticketId) return;
    if (!subject.trim()) {
      setError("제목은 필수입니다.");
      return;
    }
    if (customerId === "") {
      setError("고객사는 필수입니다.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updated = await updateTicket(ticketId, {
        customer_id: Number(customerId),
        machine_id: machineId === "" ? null : Number(machineId),
        subject: subject.trim(),
        description: isRichTextEmpty(description) ? null : description,
        status: status.trim() || null,
        priority: priority.trim() || null,
        opened_at: normalizeDateTimeToIso(openedAt),
        closed_at: normalizeDateTimeToIso(closedAt),
      });
      setTicket(updated);
      resetFormFromTicket(updated);
      setIsEditing(false);
    } catch (e: any) {
      setError(e?.message || "티켓 수정에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const onAddAttachmentRow = () => {
    setAttachmentFiles((prev) => [
      ...prev,
      createEmptyAttachmentUploadDraft(attachmentDraftIdRef.current++),
    ]);
  };

  const onRemoveAttachmentRow = (id: number) => {
    setAttachmentFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const onUploadAttachments = async () => {
    if (!isEditing) return;
    if (!ticketId) return;
    if (attachmentFiles.length === 0) {
      setAttachmentsError("첨부 파일 행을 추가해주세요.");
      return;
    }

    const invalidRows = attachmentFiles
      .map((draft, index) => ({
        draft,
        rowNumber: index + 1,
      }))
      .filter(({ draft }) => !draft.attachmentType || !draft.file);

    if (invalidRows.length > 0) {
      setAttachmentsError(
        `유형/파일이 누락된 행이 있습니다: ${invalidRows
          .map(({ rowNumber }) => `${rowNumber}행`)
          .join(", ")}`,
      );
      return;
    }

    setUploadingAttachments(true);
    setAttachmentsError(null);
    try {
      const results = await Promise.allSettled(
        attachmentFiles.map((draft) =>
          uploadTicketAttachment(ticketId, {
            file: draft.file as File,
            label: buildAttachmentLabel(draft),
            attachment_type: draft.attachmentType,
          }),
        ),
      );
      const failedRows: number[] = [];
      const succeededDraftIds = new Set<number>();
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          succeededDraftIds.add(attachmentFiles[index].id);
        } else {
          failedRows.push(index + 1);
        }
      });

      setAttachmentFiles((prev) =>
        prev.filter((item) => !succeededDraftIds.has(item.id)),
      );

      if (succeededDraftIds.size > 0) {
        await loadAttachments();
      }

      if (failedRows.length > 0) {
        setAttachmentsError(
          `일부 행 업로드에 실패했습니다: ${failedRows.join(", ")}행`,
        );
      }
    } catch (e: any) {
      setAttachmentsError(e?.message || "첨부파일 업로드에 실패했습니다.");
    } finally {
      setUploadingAttachments(false);
    }
  };

  const onAttachmentTypeChange = (id: number, value: TicketAttachmentType) => {
    setAttachmentFiles((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, attachmentType: value } : item,
      ),
    );
  };

  const onAttachmentDraftChange = (
    id: number,
    field:
      | "label"
      | "reportTitle"
      | "reportVersion"
      | "photoTakenAt"
      | "photoDescription",
    value: string,
  ) => {
    setAttachmentFiles((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const onAttachmentFileChange = (id: number, file: File | null) => {
    setAttachmentFiles((prev) =>
      prev.map((item) => (item.id === id ? { ...item, file } : item)),
    );
  };

  const onDeleteAttachment = async (attachmentId: number) => {
    if (!isEditing) return;
    if (!ticketId) return;
    setDeletingAttachmentId(attachmentId);
    setAttachmentsError(null);
    try {
      await deleteTicketAttachment(ticketId, attachmentId);
      await loadAttachments();
    } catch (e: any) {
      setAttachmentsError(e?.message || "첨부파일 삭제에 실패했습니다.");
    } finally {
      setDeletingAttachmentId(null);
    }
  };

  const onCancelEdit = () => {
    if (ticket) {
      resetFormFromTicket(ticket);
    }
    setError(null);
    setIsEditing(false);
  };

  const openStatusModal = () => {
    const normalizedStatus = (ticket?.status ?? "").trim().toLowerCase();
    const nextStatus =
      normalizedStatus === "open" ||
      normalizedStatus === "in_progress" ||
      normalizedStatus === "closed" ||
      normalizedStatus === "cancelled"
        ? (normalizedStatus as "open" | "in_progress" | "closed" | "cancelled")
        : "open";
    setStatusAction(nextStatus);
    setStatusActionDateTime(
      toDateTimeLocalValue(ticket?.closed_at ?? new Date().toISOString()),
    );
    setIsStatusModalOpen(true);
  };

  const onStatusChangeApply = async () => {
    if (!ticketId || !ticket) return;

    const shouldSetClosedAt =
      statusAction === "closed" || statusAction === "cancelled";
    const normalizedClosedAt = shouldSetClosedAt
      ? normalizeDateTimeToIso(statusActionDateTime)
      : null;

    if (shouldSetClosedAt && !normalizedClosedAt) {
      setError("적용 일시를 입력해주세요.");
      return;
    }

    setIsStatusUpdating(true);
    setError(null);
    try {
      const updated = await updateTicket(ticketId, {
        status: statusAction,
        closed_at: shouldSetClosedAt ? normalizedClosedAt : null,
      });
      setTicket(updated);
      resetFormFromTicket(updated);
      setIsStatusModalOpen(false);
      setError(null);
      setIsEditing(false);
    } catch (e: any) {
      setError(e?.message || "상태 변경에 실패했습니다.");
    } finally {
      setIsStatusUpdating(false);
    }
  };

  if (loading) return <div style={{ padding: 24 }}>로딩중...</div>;
  if (!ticket) {
    return (
      <div style={{ padding: 24 }}>
        <p>티켓을 찾을 수 없습니다.</p>
        <FormButton
          type="button"
          onClick={() => navigate("/tickets")}
          variant="secondary"
        >
          목록으로
        </FormButton>
      </div>
    );
  }

  const displayStatus = isEditing ? status : ticket.status;

  return (
    <div style={{ padding: 24 }}>
      <DetailPageHeader
        title={
          <h2
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 700,
              lineHeight: 1.3,
            }}
          >
            티켓 상세 #{ticket.id}
          </h2>
        }
        actions={
          <FormButton
            type="button"
            onClick={() => navigate("/tickets")}
            variant="secondary"
          >
            목록으로
          </FormButton>
        }
      />

      <div
        style={{
          marginTop: 12,
          padding: 12,
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          background: "#fff",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <span style={statusBadgeStyle(displayStatus)}>
          {getStatusLabel(displayStatus)}
        </span>
        <span style={{ color: "#6b7280", fontSize: 13 }}>
          고객사: {ticket.Customer ? formatCustomerLabel(ticket.Customer) : "-"}
        </span>
        <span style={{ color: "#6b7280", fontSize: 13 }}>
          장비: {ticket.Machine?.name ?? "선택 안함"}
        </span>
      </div>

      <div
        style={{
          marginTop: 12,
          padding: 12,
          border: "1px solid #eee",
          borderRadius: 12,
          background: "#fff",
        }}
      >
        <div style={{ marginBottom: 10, fontWeight: 700 }}>티켓 정보</div>
        {isEditing ? (
          <div className="ticket-edit-grid">
            <FormSelect
              value={customerId}
              onChange={(e) =>
                setCustomerId(
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
              className="form-field--wide"
              disabled={saving}
            >
              <option value="">고객사 선택(필수)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {formatCustomerLabel(c)}
                </option>
              ))}
            </FormSelect>
            <FormSelect
              value={machineId}
              onChange={(e) =>
                setMachineId(
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
              className="form-field--wide"
              disabled={saving}
            >
              <option value="">장비 선택(선택)</option>
              {availableMachines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </FormSelect>
            <FormInput
              placeholder="제목"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="form-field--wide"
              disabled={saving}
            />
            <FormSelect
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="form-field--short"
              disabled={saving}
            >
              <option value="">상태 선택</option>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </FormSelect>
            <FormInput
              type="datetime-local"
              value={openedAt}
              onChange={(e) => setOpenedAt(e.target.value)}
              className="form-field--wide"
              disabled={saving}
            />
            <FormInput
              type="datetime-local"
              value={closedAt}
              onChange={(e) => setClosedAt(e.target.value)}
              className="form-field--wide"
              disabled={saving}
            />
            <div className="ticket-edit-grid__full form-field--long form-field--flex">
              <RichTextEditor
                value={description}
                onChange={setDescription}
                placeholder="설명"
                disabled={saving}
                minHeight={140}
              />
            </div>
            <div className="ticket-edit-grid__actions">
              <FormButton type="button" onClick={onSave} disabled={saving}>
                {saving ? "저장 중..." : "수정 저장"}
              </FormButton>
              <FormButton
                type="button"
                onClick={onCancelEdit}
                disabled={saving}
                variant="secondary"
              >
                취소
              </FormButton>
            </div>
          </div>
        ) : (
          <>
            <dl className="ticket-info-grid">
              <dt>고객사</dt>
              <dd>
                {ticket.Customer ? formatCustomerLabel(ticket.Customer) : "-"}
              </dd>
              <dt>장비</dt>
              <dd>{ticket.Machine?.name ?? "선택 안함"}</dd>
              <dt>제목</dt>
              <dd className="ticket-info-grid__value-box">
                {ticket.subject ?? "-"}
              </dd>
              <dt>설명</dt>
              <dd className="ticket-info-grid__value-box ticket-info-grid__value-box--description">
                {!isRichTextEmpty(sanitizedTicketDescription) ? (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: sanitizedTicketDescription,
                    }}
                  />
                ) : (
                  <span>-</span>
                )}
              </dd>
              <dt>상태</dt>
              <dd>{getStatusLabel(ticket.status)}</dd>
              <dt>오픈 일시</dt>
              <dd>{formatDateTime(ticket.opened_at)}</dd>
              <dt>종결 일시</dt>
              <dd>{formatDateTime(ticket.closed_at)}</dd>
            </dl>
            <div
              style={{
                marginTop: 12,
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <FormButton
                  type="button"
                  onClick={() => setIsEditing(true)}
                  disabled={saving}
                >
                  수정
                </FormButton>
              </div>
              <div style={{ marginLeft: "auto" }}>
                <FormButton
                  type="button"
                  onClick={openStatusModal}
                  disabled={saving || isStatusUpdating}
                  variant="secondary"
                >
                  상태 변경
                </FormButton>
              </div>
            </div>
          </>
        )}
        <div style={{ marginTop: 8, color: "#666", fontSize: 13 }}>
          생성: {ticket.created_at ?? "-"} / 업데이트:{" "}
          {ticket.updated_at ?? "-"}
        </div>
        {error && <div style={{ marginTop: 8, color: "crimson" }}>{error}</div>}
      </div>

      <Modal
        isOpen={isStatusModalOpen}
        title="상태 변경"
        onClose={() => {
          if (isStatusUpdating) return;
          setIsStatusModalOpen(false);
        }}
      >
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ color: "#4b5563", fontSize: 14 }}>
            티켓 상태와 적용 일시를 선택한 뒤 변경 내용을 적용하세요.
          </div>
          <FormSelect
            value={statusAction}
            onChange={(e) =>
              setStatusAction(
                e.target.value as
                  | "open"
                  | "in_progress"
                  | "closed"
                  | "cancelled",
              )
            }
            disabled={isStatusUpdating}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </FormSelect>
          <FormInput
            type="datetime-local"
            value={statusActionDateTime}
            onChange={(e) => setStatusActionDateTime(e.target.value)}
            disabled={isStatusUpdating}
          />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <FormButton
              type="button"
              variant="secondary"
              onClick={() => setIsStatusModalOpen(false)}
              disabled={isStatusUpdating}
            >
              닫기
            </FormButton>
            <FormButton
              type="button"
              onClick={onStatusChangeApply}
              disabled={isStatusUpdating}
            >
              {isStatusUpdating ? "적용 중..." : "적용"}
            </FormButton>
          </div>
        </div>
      </Modal>

      <div
        style={{
          marginTop: 12,
          padding: 12,
          border: "1px solid #eee",
          borderRadius: 12,
          background: "#fff",
        }}
      >
        <div style={{ marginBottom: 10, fontWeight: 700 }}>첨부파일</div>
        {attachmentNotice && (
          <div style={{ marginBottom: 8, color: "#b45309", fontSize: 13 }}>
            {attachmentNotice}
          </div>
        )}
        {!isEditing && (
          <div style={{ marginBottom: 8, color: "#6b7280", fontSize: 13 }}>
            첨부파일 수정은 [수정] 버튼 클릭 후 가능합니다
          </div>
        )}
        {isEditing && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
            }}
          >
            <FormButton
              type="button"
              onClick={onAddAttachmentRow}
              variant="secondary"
              disabled={uploadingAttachments}
            >
              첨부 파일 추가
            </FormButton>
            <FormButton
              type="button"
              onClick={onUploadAttachments}
              disabled={uploadingAttachments || attachmentFiles.length === 0}
            >
              {uploadingAttachments ? "업로드 중..." : "첨부 업로드"}
            </FormButton>
          </div>
        )}
        {attachmentFiles.length > 0 && (
          <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
            {attachmentFiles.map((item, index) => (
              <div
                key={item.id}
                style={{
                  display: "grid",
                  gap: 8,
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  padding: 10,
                }}
              >
                <div
                  style={{ fontSize: 12, color: "#374151", fontWeight: 600 }}
                >
                  첨부 {index + 1}
                </div>
                <FormSelect
                  value={item.attachmentType}
                  onChange={(event) =>
                    onAttachmentTypeChange(
                      item.id,
                      event.target.value as TicketAttachmentType,
                    )
                  }
                  disabled={uploadingAttachments || !isEditing}
                >
                  {attachmentTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </FormSelect>
                <input
                  type="file"
                  disabled={uploadingAttachments || !isEditing}
                  onChange={(event) =>
                    onAttachmentFileChange(
                      item.id,
                      event.target.files?.[0] ?? null,
                    )
                  }
                />
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  {item.file?.name ?? "파일을 선택해주세요."}
                </div>
                {item.attachmentType === "service_report" && (
                  <>
                    <FormInput
                      value={item.reportTitle}
                      onChange={(event) =>
                        onAttachmentDraftChange(
                          item.id,
                          "reportTitle",
                          event.target.value,
                        )
                      }
                      placeholder="보고서 제목"
                      disabled={uploadingAttachments || !isEditing}
                    />
                    <FormInput
                      value={item.reportVersion}
                      onChange={(event) =>
                        onAttachmentDraftChange(
                          item.id,
                          "reportVersion",
                          event.target.value,
                        )
                      }
                      placeholder="버전"
                      disabled={uploadingAttachments || !isEditing}
                    />
                  </>
                )}
                {item.attachmentType === "photo" && (
                  <>
                    <FormInput
                      type="date"
                      value={item.photoTakenAt}
                      onChange={(event) =>
                        onAttachmentDraftChange(
                          item.id,
                          "photoTakenAt",
                          event.target.value,
                        )
                      }
                      disabled={uploadingAttachments || !isEditing}
                    />
                    <FormInput
                      value={item.photoDescription}
                      onChange={(event) =>
                        onAttachmentDraftChange(
                          item.id,
                          "photoDescription",
                          event.target.value,
                        )
                      }
                      placeholder="사진 설명"
                      disabled={uploadingAttachments || !isEditing}
                    />
                  </>
                )}
                {item.attachmentType === "etc" && (
                  <FormInput
                    value={item.label}
                    onChange={(event) =>
                      onAttachmentDraftChange(
                        item.id,
                        "label",
                        event.target.value,
                      )
                    }
                    placeholder="자유 라벨"
                    disabled={uploadingAttachments || !isEditing}
                  />
                )}
                <div>
                  <FormButton
                    type="button"
                    variant="secondary"
                    onClick={() => onRemoveAttachmentRow(item.id)}
                    disabled={uploadingAttachments || !isEditing}
                  >
                    행 삭제
                  </FormButton>
                </div>
              </div>
            ))}
          </div>
        )}
        {attachmentsError && (
          <div style={{ marginTop: 8, color: "crimson" }}>
            {attachmentsError}
          </div>
        )}
        {attachmentsLoading ? (
          <div style={{ marginTop: 8, color: "#6b7280" }}>
            첨부파일 불러오는 중...
          </div>
        ) : attachments.length > 0 ? (
          <ul
            style={{
              marginTop: 10,
              display: "grid",
              gap: 8,
              padding: 0,
              marginBottom: 0,
              listStyle: "none",
            }}
          >
            {attachments.map((attachment) => (
              <li
                key={attachment.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #f0f0f0",
                  background: "#f9fafb",
                }}
              >
                <div>
                  <a
                    href={attachment.file_url}
                    target="_blank"
                    rel="noreferrer"
                    download={attachment.file_name}
                    style={{
                      fontWeight: 600,
                      color: "#111827",
                      textDecoration: "none",
                    }}
                  >
                    {attachment.file_name}
                  </a>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginTop: 2,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: "#e5e7eb",
                        color: "#111827",
                        fontWeight: 600,
                      }}
                    >
                      {attachmentTypeLabelMap[attachment.attachment_type] ??
                        attachment.attachment_type}
                    </span>
                    <span style={{ color: "#4b5563", fontSize: 12 }}>
                      {attachment.label?.trim() ||
                        "라벨이 입력되지 않았습니다."}
                    </span>
                  </div>
                  <div style={{ color: "#6b7280", fontSize: 12 }}>
                    {attachment.mime_type ?? "unknown"} ·{" "}
                    {attachment.size
                      ? `${(attachment.size / 1024).toFixed(1)} KB`
                      : "-"}
                  </div>
                </div>
                <FormButton
                  type="button"
                  onClick={() => onDeleteAttachment(attachment.id)}
                  variant="secondary"
                  disabled={
                    deletingAttachmentId === attachment.id || !isEditing
                  }
                >
                  {deletingAttachmentId === attachment.id
                    ? "삭제 중..."
                    : "삭제"}
                </FormButton>
              </li>
            ))}
          </ul>
        ) : (
          <div style={{ marginTop: 8, color: "#666" }}>
            등록된 첨부파일이 없습니다.
          </div>
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
