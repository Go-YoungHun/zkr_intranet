import { useEffect, useState, type ChangeEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type {
  CustomerAttachment,
  CustomerDetail,
  CustomerGroup,
} from "../lib/customers";
import type { Ticket } from "../lib/tickets";
import {
  createCustomerGroup,
  deleteCustomerAttachment,
  deleteCustomer,
  fetchCustomerAttachments,
  fetchCustomer,
  fetchCustomerGroups,
  uploadCustomerAttachment,
  updateCustomer,
} from "../lib/customers";
import { fetchSalesAgencies } from "../lib/agencies";
import type { SalesAgency } from "../lib/agencies";
import { fetchTicketsByCustomer } from "../lib/tickets";
import DetailPageHeader from "../components/DetailPageHeader";
import FormButton from "../components/FormButton";
import MachineSummaryCard from "../components/MachineSummaryCard";
import FormInput from "../components/FormInput";
import Modal from "../components/Modal";
import AuditTimeline from "../components/AuditTimeline";
import { ATTACHMENT_THUMBNAIL_SIZE, isImageMimeType } from "../lib/attachments";
import { formatDateTime, hasSameDateTime } from "../lib/dateTime";

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const customerId = Number(id);

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsError, setTicketsError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"equipment" | "tickets" | "attachments" | "history">("equipment");
  const [isEditing, setIsEditing] = useState(false);
  const [groups, setGroups] = useState<CustomerGroup[]>([]);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [agencyError, setAgencyError] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [agencies, setAgencies] = useState<SalesAgency[]>([]);
  const [attachments, setAttachments] = useState<CustomerAttachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [attachmentsError, setAttachmentsError] = useState<string | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentLabel, setAttachmentLabel] = useState("");
  const [previewImage, setPreviewImage] = useState<CustomerAttachment | null>(null);
  const [brokenImageIds, setBrokenImageIds] = useState<Record<number, boolean>>({});

  const [name, setName] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [selectedAgencyId, setSelectedAgencyId] = useState<number | null>(null);

  const resetForm = (data: CustomerDetail) => {
    setName(data.name ?? "");
    setNameEn(data.name_en ?? "");
    setCode(data.code ?? "");
    setPhone(data.phone ?? "");
    setAddress(data.address ?? "");
    setSelectedAgencyId(data.sales_agency_id ?? null);
    setSelectedGroupId(data.group_id ?? null);
    setNewGroupName("");
  };

  const load = async () => {
    if (!customerId) {
      setError("유효하지 않은 고객사입니다.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchCustomer(customerId);
      setCustomer(data);
      resetForm(data);
      setIsEditing(false);
    } catch (e: any) {
      setError(e?.message || "고객사 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    setGroupError(null);
    try {
      const data = await fetchCustomerGroups();
      setGroups(data);
    } catch (e: any) {
      setGroupError(e?.message || "그룹 목록을 불러오지 못했습니다.");
    }
  };

  const loadAgencies = async () => {
    setAgencyError(null);
    try {
      const data = await fetchSalesAgencies();
      setAgencies(data);
    } catch (e: any) {
      setAgencyError(e?.message || "대리점 목록을 불러오지 못했습니다.");
    }
  };

  const loadAttachments = async () => {
    if (!customerId) return;
    setAttachmentsLoading(true);
    setAttachmentsError(null);
    try {
      const data = await fetchCustomerAttachments(customerId);
      setAttachments(data);
      setBrokenImageIds({});
    } catch (e: any) {
      setAttachmentsError(e?.message || "첨부파일을 불러오지 못했습니다.");
    } finally {
      setAttachmentsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [customerId]);

  useEffect(() => {
    void loadGroups();
  }, []);

  useEffect(() => {
    void loadAgencies();
  }, []);

  useEffect(() => {
    const loadTickets = async () => {
      if (!customerId) return;
      setTicketsLoading(true);
      setTicketsError(null);
      try {
        const data = await fetchTicketsByCustomer(customerId);
        setTickets(data.rows);
      } catch (e: any) {
        setTicketsError(e?.message || "티켓 정보를 불러오지 못했습니다.");
      } finally {
        setTicketsLoading(false);
      }
    };

    void loadTickets();
  }, [customerId]);

  useEffect(() => {
    void loadAttachments();
  }, [customerId]);

  const handleCreateGroup = async () => {
    const trimmedGroupName = newGroupName.trim();
    if (!trimmedGroupName) {
      setGroupError("그룹명을 입력하세요.");
      return;
    }
    setIsCreatingGroup(true);
    setGroupError(null);
    try {
      const newGroup = await createCustomerGroup(trimmedGroupName);
      setSelectedGroupId(newGroup.id);
      setNewGroupName("");
      await loadGroups();
    } catch (e: any) {
      setGroupError(e?.message || "그룹 생성 실패");
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const onSave = async () => {
    if (!customerId) return;
    if (!name.trim()) {
      setError("고객사명(name)은 필수입니다.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updated = await updateCustomer(customerId, {
        name: name.trim(),
        name_en: nameEn.trim() || null,
        code: code.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        sales_agency_id: selectedAgencyId,
        group_id: selectedGroupId,
      });
      setCustomer((prev) => ({
        ...(prev ?? updated),
        ...updated,
      }));
      setIsEditing(false);
    } catch (e: any) {
      setError(e?.message || "고객사 수정에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const onCancelEdit = () => {
    if (!customer) return;
    resetForm(customer);
    setError(null);
    setIsEditing(false);
  };

  const onDelete = async () => {
    if (!customerId) return;
    const ok = confirm("정말 삭제할까요?");
    if (!ok) return;

    setDeleting(true);
    setError(null);
    try {
      await deleteCustomer(customerId);
      navigate("/customers");
    } catch (e: any) {
      setError(e?.message || "삭제 실패");
    } finally {
      setDeleting(false);
    }
  };

  const onAttachmentFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setAttachmentFile(event.target.files?.[0] ?? null);
  };

  const onUploadAttachment = async () => {
    if (!customerId || !attachmentFile) return;
    setUploadingAttachment(true);
    setAttachmentsError(null);
    try {
      await uploadCustomerAttachment(customerId, {
        file: attachmentFile,
        label: attachmentLabel,
      });
      setAttachmentFile(null);
      setAttachmentLabel("");
      await loadAttachments();
    } catch (e: any) {
      setAttachmentsError(e?.message || "첨부파일 업로드에 실패했습니다.");
    } finally {
      setUploadingAttachment(false);
    }
  };

  const onDeleteAttachment = async (attachmentId: number) => {
    if (!customerId) return;
    setAttachmentsError(null);
    try {
      await deleteCustomerAttachment(customerId, attachmentId);
      await loadAttachments();
    } catch (e: any) {
      setAttachmentsError(e?.message || "첨부파일 삭제에 실패했습니다.");
    }
  };

  const markImageAsBroken = (attachmentId: number) => {
    setBrokenImageIds((prev) => ({ ...prev, [attachmentId]: true }));
  };

  const isAttachmentImage = (attachment: CustomerAttachment) => {
    if (brokenImageIds[attachment.id]) return false;
    return attachment.is_image ?? isImageMimeType(attachment.mime_type);
  };

  if (loading) return <div style={{ padding: 24 }}>로딩중...</div>;
  if (!customer) {
    return (
      <div style={{ padding: 24 }}>
        <p>고객사를 찾을 수 없습니다.</p>
        <FormButton type="button" onClick={() => navigate("/customers")} variant="secondary">
          목록으로
        </FormButton>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <DetailPageHeader
        title={<h2 style={{ margin: 0 }}>고객사 상세 #{customer.id}</h2>}
        actions={
          <>
            <button
              type="button"
              onClick={() => navigate(`/tickets/new?customerId=${customer.id}`)}
            >
              신규 티켓 등록
            </button>
            <FormButton type="button" onClick={() => navigate("/customers")} variant="secondary">
              목록으로
            </FormButton>
          </>
        }
      />

      <div style={{ marginTop: 12, padding: 12, border: "1px solid #eee" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 10,
          }}
        >
          <div style={{ fontWeight: 700 }}>고객사 정보</div>
        </div>
        {isEditing ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              placeholder="고객사명(필수)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ padding: 8, minWidth: 220 }}
              disabled={saving}
            />
            <input
              placeholder="고객사명(영문)"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              style={{ padding: 8, minWidth: 220 }}
              disabled={saving}
            />
            <input
              placeholder="코드"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={{ padding: 8, minWidth: 120 }}
              disabled={saving}
            />
            <input
              placeholder="전화"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{ padding: 8, minWidth: 160 }}
              disabled={saving}
            />
            <input
              placeholder="주소"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              style={{ padding: 8, minWidth: 260, flex: 1 }}
              disabled={saving}
            />
            <select
              value={selectedAgencyId === null ? "null" : String(selectedAgencyId)}
              onChange={(event) => {
                const value = event.target.value;
                setSelectedAgencyId(value === "null" ? null : Number(value));
              }}
              style={{ padding: 8, minWidth: 180 }}
              disabled={saving}
            >
              <option value="null">대리점 없음</option>
              {agencies.map((agency) => (
                <option key={agency.id} value={agency.id}>
                  {agency.name}
                </option>
              ))}
            </select>
            <select
              value={selectedGroupId === null ? "null" : String(selectedGroupId)}
              onChange={(event) => {
                const value = event.target.value;
                setSelectedGroupId(value === "null" ? null : Number(value));
              }}
              style={{ padding: 8, minWidth: 200 }}
              disabled={saving || isCreatingGroup}
            >
              <option value="null">그룹 해제</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                placeholder="새 그룹명"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                style={{ padding: 8, minWidth: 200 }}
                disabled={saving || isCreatingGroup}
              />
              <button
                type="button"
                onClick={handleCreateGroup}
                disabled={saving || isCreatingGroup}
              >
                {isCreatingGroup ? "생성 중..." : "그룹 만들기"}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 8 }}>
              <div style={{ color: "#6b7280" }}>고객사명</div>
              <div>{customer.name ?? "-"}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 8 }}>
              <div style={{ color: "#6b7280" }}>고객사명(영문)</div>
              <div>{customer.name_en ?? "-"}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 8 }}>
              <div style={{ color: "#6b7280" }}>코드</div>
              <div>{customer.code ?? "-"}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 8 }}>
              <div style={{ color: "#6b7280" }}>전화</div>
              <div>{customer.phone ?? "-"}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 8 }}>
              <div style={{ color: "#6b7280" }}>주소</div>
              <div>{customer.address ?? "-"}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 8 }}>
              <div style={{ color: "#6b7280" }}>대리점</div>
              <div>{customer.salesAgency?.name ?? customer.sales_agent ?? "-"}</div>
            </div>
          </div>
        )}
        <div style={{ marginTop: 8, color: "#666", fontSize: 13, display: "grid", gap: 2 }}>
          <div>생성: {formatDateTime(customer.created_at)}</div>
          {customer.updated_at && !hasSameDateTime(customer.created_at, customer.updated_at) ? (
            <div>업데이트(수정됨): {formatDateTime(customer.updated_at)}</div>
          ) : null}
        </div>
        {error && <div style={{ marginTop: 8, color: "crimson" }}>{error}</div>}
        {groupError && <div style={{ marginTop: 8, color: "crimson" }}>{groupError}</div>}
        {agencyError && <div style={{ marginTop: 8, color: "crimson" }}>{agencyError}</div>}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 12,
          }}
        >
          {!isEditing ? (
            <button type="button" onClick={() => setIsEditing(true)}>
              편집
            </button>
          ) : (
            <>
              <button type="button" onClick={onSave} disabled={saving}>
                {saving ? "저장 중..." : "저장"}
              </button>
              <button type="button" onClick={onCancelEdit} disabled={saving}>
                취소
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            style={{
              background: "#dc2626",
              color: "white",
              border: "none",
              padding: "6px 12px",
              borderRadius: 6,
            }}
          >
            {deleting ? "삭제 중..." : "삭제"}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => setActiveTab("equipment")}
          style={{
            padding: "8px 14px",
            borderRadius: 999,
            border: "1px solid #e5e7eb",
            background: activeTab === "equipment" ? "#111827" : "#f9fafb",
            color: activeTab === "equipment" ? "#fff" : "#111827",
            fontWeight: 600,
          }}
        >
          Equipment
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("tickets")}
          style={{
            padding: "8px 14px",
            borderRadius: 999,
            border: "1px solid #e5e7eb",
            background: activeTab === "tickets" ? "#111827" : "#f9fafb",
            color: activeTab === "tickets" ? "#fff" : "#111827",
            fontWeight: 600,
          }}
        >
          Tickets
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("attachments")}
          style={{
            padding: "8px 14px",
            borderRadius: 999,
            border: "1px solid #e5e7eb",
            background: activeTab === "attachments" ? "#111827" : "#f9fafb",
            color: activeTab === "attachments" ? "#fff" : "#111827",
            fontWeight: 600,
          }}
        >
          Attachments
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("history")}
          style={{
            padding: "8px 14px",
            borderRadius: 999,
            border: "1px solid #e5e7eb",
            background: activeTab === "history" ? "#111827" : "#f9fafb",
            color: activeTab === "history" ? "#fff" : "#111827",
            fontWeight: 600,
          }}
        >
          변경이력
        </button>
      </div>

      {activeTab === "equipment" ? (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #eee" }}>
          <div style={{ marginBottom: 10, fontWeight: 700 }}>연결된 장비</div>
          {customer.Machines && customer.Machines.length > 0 ? (
            <div style={{ display: "grid", gap: 8 }}>
              {customer.Machines.map((machine) => {
                const title = machine.name?.trim()
                  ? machine.name
                  : machine.serial_no?.trim()
                    ? machine.serial_no
                    : "장비";

                return (
                  <Link
                    key={machine.id}
                    to={`/machines/${machine.id}`}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <MachineSummaryCard
                      title={title}
                      model={machine.model}
                      location={machine.location}
                      variant="compact"
                    />
                  </Link>
                );
              })}
            </div>
          ) : (
            <div style={{ color: "#666" }}>연결된 장비가 없습니다.</div>
          )}
        </div>
      ) : activeTab === "tickets" ? (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #eee" }}>
          <div style={{ marginBottom: 10, fontWeight: 700 }}>연결된 티켓</div>
          {ticketsLoading ? (
            <div style={{ color: "#6b7280" }}>티켓을 불러오는 중...</div>
          ) : ticketsError ? (
            <div style={{ color: "crimson" }}>{ticketsError}</div>
          ) : tickets.length > 0 ? (
            <div style={{ display: "grid", gap: 8 }}>
              {tickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  to={`/tickets/${ticket.id}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #f0f0f0",
                    background: "#f9fafb",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{ticket.subject}</div>
                    <div style={{ color: "#6b7280", fontSize: 12 }}>
                      상태: {ticket.status ?? "-"} / 우선순위: {ticket.priority ?? "-"}
                      {ticket.Machine?.name ? ` · 장비: ${ticket.Machine.name}` : ""}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      padding: "4px 10px",
                      borderRadius: 999,
                      background: ticket.status === "closed" ? "#fef2f2" : "#ecfdf3",
                      color: ticket.status === "closed" ? "#b91c1c" : "#15803d",
                      fontWeight: 600,
                    }}
                  >
                    {ticket.status ?? "open"}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div style={{ color: "#666" }}>연결된 티켓이 없습니다.</div>
          )}
        </div>
      ) : activeTab === "attachments" ? (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #eee" }}>
          <div style={{ marginBottom: 10, fontWeight: 700 }}>첨부파일</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <input type="file" onChange={onAttachmentFileChange} disabled={uploadingAttachment} />
            <FormInput
              placeholder="파일 라벨(선택)"
              value={attachmentLabel}
              onChange={(event) => setAttachmentLabel(event.target.value)}
              disabled={uploadingAttachment}
              className="form-field--medium"
            />
            <FormButton
              type="button"
              onClick={onUploadAttachment}
              disabled={!attachmentFile || uploadingAttachment}
            >
              {uploadingAttachment ? "업로드 중..." : "업로드"}
            </FormButton>
          </div>

          {attachmentsError && <div style={{ marginTop: 8, color: "crimson" }}>{attachmentsError}</div>}

          {attachmentsLoading ? (
            <div style={{ marginTop: 8, color: "#6b7280" }}>첨부파일을 불러오는 중...</div>
          ) : attachments.length > 0 ? (
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {attachments.map((attachment) => (
                <div
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
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {isAttachmentImage(attachment) ? (
                      <button
                        type="button"
                        onClick={() => setPreviewImage(attachment)}
                        style={{
                          width: ATTACHMENT_THUMBNAIL_SIZE,
                          height: ATTACHMENT_THUMBNAIL_SIZE,
                          border: "1px solid #e5e7eb",
                          borderRadius: 8,
                          overflow: "hidden",
                          padding: 0,
                          background: "#f9fafb",
                          cursor: "zoom-in",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <img
                          src={attachment.file_url}
                          alt={attachment.file_name}
                          loading="lazy"
                          style={{
                            maxWidth: ATTACHMENT_THUMBNAIL_SIZE,
                            maxHeight: ATTACHMENT_THUMBNAIL_SIZE,
                            objectFit: "contain",
                          }}
                          onError={() => markImageAsBroken(attachment.id)}
                        />
                      </button>
                    ) : (
                      <div
                        aria-hidden="true"
                        style={{
                          width: ATTACHMENT_THUMBNAIL_SIZE,
                          height: ATTACHMENT_THUMBNAIL_SIZE,
                          border: "1px solid #e5e7eb",
                          borderRadius: 8,
                          background: "#f3f4f6",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#6b7280",
                          fontSize: 24,
                        }}
                      >
                        📄
                      </div>
                    )}
                    <div>
                      <a
                        href={attachment.file_url}
                        target="_blank"
                        rel="noreferrer"
                        download={attachment.file_name}
                        style={{ fontWeight: 600, color: "#111827", textDecoration: "none" }}
                      >
                        {attachment.file_name}
                      </a>
                      <div style={{ color: "#4b5563", fontSize: 12, marginTop: 2 }}>
                        {attachment.label?.trim() || "라벨이 입력되지 않았습니다."}
                      </div>
                      <div style={{ color: "#6b7280", fontSize: 12 }}>
                        {attachment.mime_type ?? "unknown"} ·{" "}
                        {attachment.size ? `${(attachment.size / 1024).toFixed(1)} KB` : "-"}
                      </div>
                    </div>
                  </div>
                  <FormButton
                    type="button"
                    variant="secondary"
                    onClick={() => onDeleteAttachment(attachment.id)}
                  >
                    삭제
                  </FormButton>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ marginTop: 8, color: "#666" }}>등록된 첨부파일이 없습니다.</div>
          )}
        </div>
      ) : (
        <div style={{ marginTop: 12 }}>
          <AuditTimeline
            entityType="customer"
            entityId={customer.id}
            title="변경 이력"
            pageSize={10}
          />
        </div>
      )}

      <Modal
        isOpen={Boolean(previewImage)}
        title={previewImage?.file_name || "이미지 미리보기"}
        onClose={() => setPreviewImage(null)}
      >
        {previewImage ? (
          <img
            src={previewImage.file_url}
            alt={previewImage.file_name}
            style={{ width: "100%", maxHeight: "70vh", objectFit: "contain" }}
            onError={() => {
              markImageAsBroken(previewImage.id);
              setPreviewImage(null);
            }}
          />
        ) : null}
      </Modal>
    </div>
  );
}
