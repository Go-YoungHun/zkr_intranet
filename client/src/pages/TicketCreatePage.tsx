import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { Customer } from "../lib/customers";
import { fetchCustomers, formatCustomerLabel } from "../lib/customers";
import type { Machine } from "../lib/machines";
import { fetchMachines } from "../lib/machines";
import type { TicketAttachmentType, TicketCategory } from "../lib/tickets";
import {
  createTicket,
  fetchTicketCategories,
  normalizeTicketPreset,
  uploadTicketAttachment,
} from "../lib/tickets";
import {
  buildAttachmentLabel,
  createEmptyAttachmentUploadDraft,
} from "../lib/ticketAttachmentDraft";
import type { AttachmentUploadDraft } from "../lib/ticketAttachmentDraft";
import { isRichTextEmpty } from "../lib/richText";
import FormButton from "../components/FormButton";
import FormInput from "../components/FormInput";
import FormSelect from "../components/FormSelect";
import CustomerMachineSelectModal from "../components/CustomerMachineSelectModal";
import RichTextEditor from "../components/RichTextEditor";

const attachmentTypeOptions: Array<{ value: TicketAttachmentType; label: string }> = [
  { value: "photo", label: "사진" },
  { value: "service_report", label: "서비스 리포트" },
  { value: "log_file", label: "로그 파일" },
  { value: "certificate", label: "인증서" },
  { value: "etc", label: "기타" },
];

const toDateTimeLocalValue = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
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

export default function TicketCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preset = useMemo(
    () =>
      normalizeTicketPreset({
        customerId:
          searchParams.get("customerId") ?? searchParams.get("customer_id"),
        machineId:
          searchParams.get("machineId") ?? searchParams.get("machine_id"),
      }),
    [searchParams],
  );

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [categories, setCategories] = useState<TicketCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [customerId, setCustomerId] = useState<number | "">(
    preset.customerId ?? "",
  );
  const [machineId, setMachineId] = useState<number | "">(
    preset.machineId ?? "",
  );
  const [customerSearch, setCustomerSearch] = useState("");
  const [machineSearch, setMachineSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [openedAt, setOpenedAt] = useState(() =>
    toDateTimeLocalValue(new Date().toISOString()),
  );
  const [closedAt, setClosedAt] = useState("");
  const [attachments, setAttachments] = useState<AttachmentUploadDraft[]>([]);
  const attachmentDraftIdRef = useRef(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState<"customer" | "machine">(
    "customer",
  );

  const openCustomerSelection = () => {
    setSelectionMode("customer");
    setIsSelectionModalOpen(true);
  };

  const openMachineSelection = () => {
    setSelectionMode("machine");
    setIsSelectionModalOpen(true);
  };

  const resetMachineSelection = () => {
    setMachineId("");
    setMachineSearch("");
  };

  const resetCustomerSelection = () => {
    setCustomerId("");
    setCustomerSearch("");
    resetMachineSelection();
  };

  const handleSelectCustomer = (customer: Customer) => {
    setCustomerId(customer.id);
    setCustomerSearch(formatCustomerLabel(customer));
    resetMachineSelection();
  };

  const handleSelectMachine = (machine: Machine) => {
    setMachineId(machine.id);
    setMachineSearch(machine.name);
    if (machine.customer_id) {
      setCustomerId(machine.customer_id);
      const matchedCustomer = customers.find(
        (customer) => customer.id === machine.customer_id,
      );
      setCustomerSearch(
        matchedCustomer ? formatCustomerLabel(matchedCustomer) : "",
      );
    } else {
      setCustomerId("");
      setCustomerSearch("");
    }
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [customerData, machineData, categoryData] = await Promise.all([
        fetchCustomers(false, undefined, 1, 1000),
        fetchMachines(false, undefined, 1, 1000),
        fetchTicketCategories(),
      ]);
      setCustomers(customerData.rows);
      setMachines(machineData.rows);
      setCategories(categoryData);
    } catch (e: any) {
      setError(e?.message || "필수 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (machineId === "") return;
    const machine = machines.find((item) => item.id === machineId);
    if (!machine) return;
    if (machine.customer_id && customerId !== machine.customer_id) {
      setCustomerId(machine.customer_id);
    }
    if (machineSearch === "") {
      setMachineSearch(machine.name);
    }
    if (machine.customer_id && customerSearch === "") {
      const matchedCustomer = customers.find(
        (customer) => customer.id === machine.customer_id,
      );
      if (matchedCustomer) {
        setCustomerSearch(formatCustomerLabel(matchedCustomer));
      }
    }
  }, [
    customerId,
    customerSearch,
    machineId,
    machineSearch,
    machines,
    customers,
  ]);

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
      setMachineSearch("");
    }
  }, [availableMachines, machineId]);

  useEffect(() => {
    if (customerId === "" || customerSearch !== "") return;
    const customer = customers.find((item) => item.id === customerId);
    if (customer) {
      setCustomerSearch(formatCustomerLabel(customer));
    }
  }, [customerId, customerSearch, customers]);

  const addAttachmentRowsFromFiles = (files: File[]) => {
    if (files.length === 0) return;
    setAttachments((prev) => {
      const existing = new Set(
        prev.map(
          (item) =>
            item.file
              ? `${item.file.name}-${item.file.size}-${item.file.lastModified}`
              : "",
        ),
      );
      const next = [...prev];
      files.forEach((file) => {
        const key = `${file.name}-${file.size}-${file.lastModified}`;
        if (!existing.has(key)) {
          const nextDraft = createEmptyAttachmentUploadDraft(
            attachmentDraftIdRef.current++,
          );
          next.push({
            ...nextDraft,
            file,
          });
          existing.add(key);
        }
      });
      return next;
    });
  };

  const handleAttachmentAddRow = () => {
    setAttachments((prev) => [
      ...prev,
      createEmptyAttachmentUploadDraft(attachmentDraftIdRef.current++),
    ]);
  };

  const handleAttachmentRemove = (id: number) => {
    setAttachments((prev) =>
      prev.filter((item) => item.id !== id),
    );
  };

  const handleAttachmentDraftChange = (
    id: number,
    field:
      | "label"
      | "reportTitle"
      | "reportVersion"
      | "photoTakenAt"
      | "photoDescription",
    value: string,
  ) => {
    setAttachments((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  };

  const handleAttachmentTypeChange = (
    id: number,
    value: TicketAttachmentType,
  ) => {
    setAttachments((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, attachmentType: value } : item,
      ),
    );
  };

  const handleAttachmentFileChange = (id: number, file: File | null) => {
    setAttachments((prev) =>
      prev.map((item) => (item.id === id ? { ...item, file } : item)),
    );
  };

  const handleAttachmentDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    if (creating) return;
    const files = Array.from(event.dataTransfer.files ?? []);
    addAttachmentRowsFromFiles(files);
  };

  const handleAttachmentChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    addAttachmentRowsFromFiles(files);
    event.target.value = "";
  };

  const onCreate = async () => {
    if (!subject.trim()) {
      setFormError("제목은 필수입니다.");
      return;
    }
    if (customerId === "") {
      setFormError("고객사는 필수입니다.");
      return;
    }
    if (categoryId === "") {
      setFormError("카테고리는 필수입니다.");
      return;
    }
    const invalidRows = attachments
      .map((draft, index) => ({ rowNumber: index + 1, draft }))
      .filter(({ draft }) => !draft.attachmentType || !draft.file);
    if (invalidRows.length > 0) {
      setFormError(
        `유형/파일이 누락된 첨부 행이 있습니다: ${invalidRows
          .map(({ rowNumber }) => `${rowNumber}행`)
          .join(", ")}`,
      );
      return;
    }

    setCreating(true);
    setFormError(null);
    try {
      const created = await createTicket({
        customer_id: Number(customerId),
        category_id: Number(categoryId),
        subject: subject.trim(),
        description: isRichTextEmpty(description) ? null : description,
        machine_id: machineId === "" ? null : Number(machineId),
        opened_at: normalizeDateTimeToIso(openedAt) ?? new Date().toISOString(),
        closed_at: normalizeDateTimeToIso(closedAt),
      });
      if (created?.id && attachments.length > 0) {
        const uploadTargets = attachments.map((draft, index) => ({
          index,
          file: draft.file as File,
          label: buildAttachmentLabel(draft),
          attachmentType: draft.attachmentType,
        }));
        const results = await Promise.all(
          uploadTargets.map(async (target) => {
            try {
              await uploadTicketAttachment(created.id, {
                file: target.file,
                label: target.label,
                attachment_type: target.attachmentType,
              });
              return { ok: true as const, target };
            } catch (error) {
              return { ok: false as const, target, error };
            }
          }),
        );
        const failedUploads = results.filter((result) => !result.ok);
        if (failedUploads.length > 0) {
          console.error("Attachment upload failed", failedUploads);
          navigate(`/tickets/${created.id}`, {
            state: {
              attachmentUploadError: {
                failedCount: failedUploads.length,
                totalCount: uploadTargets.length,
              },
            },
          });
          return;
        }
      }
      navigate(created?.id ? `/tickets/${created.id}` : "/tickets");
    } catch (e: any) {
      setFormError(e?.message || "티켓 등록에 실패했습니다.");
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div style={{ padding: 24 }}>로딩중...</div>;

  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h2 style={{ margin: 0 }}>티켓 등록</h2>
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <FormButton
            type="button"
            onClick={() => navigate("/tickets")}
            variant="secondary"
          >
            목록으로
          </FormButton>
          <FormButton
            type="button"
            onClick={onCreate}
            disabled={creating || categories.length === 0}
          >
            {creating ? "등록 중..." : "등록"}
          </FormButton>
          <FormButton
            type="button"
            onClick={() => navigate("/tickets")}
            disabled={creating}
            variant="secondary"
          >
            취소
          </FormButton>
        </div>
      </div>

      {error && <div style={{ marginTop: 12, color: "crimson" }}>{error}</div>}

      <div style={{ display: "grid", gap: 16 }}>
        <section
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            padding: 16,
            background: "#f9fafb",
          }}
        >
          <div style={{ display: "grid", gap: 6 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>기본 정보</h3>
            <p style={{ margin: 0, color: "#6b7280", fontSize: 13 }}>
              제목과 고객사/카테고리를 먼저 선택해 티켓의 목적을 명확히
              해주세요.
            </p>
          </div>
          <div className="ticket-edit-grid" style={{ marginTop: 12 }}>
            <FormInput
              placeholder="제목 (필수)"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="ticket-edit-grid__full form-field--wide form-field--flex"
              disabled={creating}
            />
            <div
              className="form-field--wide"
              style={{ display: "grid", gap: 6 }}
            >
              <div className="modal-field">
                <FormInput
                  placeholder="고객사 선택(필수)"
                  value={customerSearch}
                  readOnly
                  onClick={openCustomerSelection}
                  className="modal-field__input"
                  disabled={creating}
                  aria-label="고객사 선택"
                />
                <FormButton
                  type="button"
                  variant="secondary"
                  onClick={openCustomerSelection}
                  disabled={creating}
                  className="modal-field__button"
                >
                  검색
                </FormButton>
              </div>
            </div>
            <div
              className="form-field--wide"
              style={{ display: "grid", gap: 6 }}
            >
              <div className="modal-field">
                <FormInput
                  placeholder="장비 선택(선택)"
                  value={machineSearch}
                  readOnly
                  onClick={openMachineSelection}
                  className="modal-field__input"
                  disabled={creating}
                  aria-label="장비 선택"
                />
                <FormButton
                  type="button"
                  variant="secondary"
                  onClick={openMachineSelection}
                  disabled={creating}
                  className="modal-field__button"
                >
                  검색
                </FormButton>
              </div>
            </div>
            <div className="ticket-edit-grid__category">
              <FormSelect
                value={categoryId}
                onChange={(e) =>
                  setCategoryId(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
                className="form-field--wide"
                disabled={creating}
              >
                <option value="">카테고리 선택(필수)</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </FormSelect>
            </div>
            <FormInput
              type="datetime-local"
              value={openedAt}
              onChange={(e) => setOpenedAt(e.target.value)}
              className="form-field--wide"
              disabled={creating}
            />
            <FormInput
              type="datetime-local"
              value={closedAt}
              onChange={(e) => setClosedAt(e.target.value)}
              className="form-field--wide"
              disabled={creating}
            />
          </div>
        </section>

        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "minmax(0, 2.2fr) minmax(260px, 1fr)",
            alignItems: "start",
          }}
        >
          <section
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              padding: 16,
              background: "#fff",
            }}
          >
            <div style={{ display: "grid", gap: 6 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>본문 작성</h3>
              <p style={{ margin: 0, color: "#6b7280", fontSize: 13 }}>
                증상, 요청사항, 참고 링크를 자세히 적어주세요.
              </p>
            </div>
            <div style={{ marginTop: 12 }}>
              <RichTextEditor
                value={description}
                onChange={setDescription}
                placeholder="설명"
                disabled={creating}
              />
            </div>
          </section>

          <section
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              padding: 16,
              background: "#fff",
              display: "grid",
              gap: 14,
            }}
          >
            <div style={{ display: "grid", gap: 6 }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>메타 정보</h3>
              <p style={{ margin: 0, color: "#6b7280", fontSize: 13 }}>
                담당자들이 참고할 수 있도록 첨부파일을 추가하세요.
              </p>
            </div>
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    color: "#374151",
                  }}
                >
                  첨부파일 (선택)
                </label>
                <FormButton
                  type="button"
                  variant="secondary"
                  onClick={handleAttachmentAddRow}
                  disabled={creating}
                >
                  + 첨부 행 추가
                </FormButton>
              </div>
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  if (!creating) setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleAttachmentDrop}
                style={{
                  border: `1px dashed ${isDragOver ? "#2563eb" : "#d1d5db"}`,
                  borderRadius: 8,
                  padding: 12,
                  background: isDragOver ? "#eff6ff" : "#f9fafb",
                  display: "grid",
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 13, color: "#6b7280" }}>
                  파일을 드래그하거나 아래에서 선택하면 행이 자동 추가됩니다.
                </div>
                <input
                  type="file"
                  multiple
                  disabled={creating}
                  onChange={handleAttachmentChange}
                />
              </div>
              {attachments.length > 0 ? (
                <div
                  style={{
                    marginTop: 10,
                    display: "grid",
                    gap: 10,
                  }}
                >
                  {attachments.map((attachment, index) => (
                    <div
                      key={attachment.id}
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 8,
                        padding: 10,
                        display: "grid",
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span style={{ fontSize: 12, color: "#6b7280" }}>
                          첨부 {index + 1}행
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAttachmentRemove(attachment.id)}
                          disabled={creating}
                          style={{
                            border: "none",
                            background: "none",
                            color: "#ef4444",
                            cursor: "pointer",
                            fontSize: 12,
                          }}
                        >
                          삭제
                        </button>
                      </div>
                      <div style={{ display: "grid", gap: 6 }}>
                        <FormSelect
                          value={attachment.attachmentType}
                          onChange={(event) =>
                            handleAttachmentTypeChange(
                              attachment.id,
                              event.target.value as TicketAttachmentType,
                            )
                          }
                          disabled={creating}
                        >
                          <option value="">첨부 유형 선택(필수)</option>
                          {attachmentTypeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </FormSelect>
                        <input
                          type="file"
                          disabled={creating}
                          onChange={(event) =>
                            handleAttachmentFileChange(
                              attachment.id,
                              event.target.files?.[0] ?? null,
                            )
                          }
                        />
                        {attachment.file && (
                          <span style={{ fontSize: 12, color: "#6b7280" }}>
                            선택 파일: {attachment.file.name}
                          </span>
                        )}
                        {attachment.attachmentType === "service_report" && (
                          <>
                            <FormInput
                              value={attachment.reportTitle}
                              onChange={(event) =>
                                handleAttachmentDraftChange(
                                  attachment.id,
                                  "reportTitle",
                                  event.target.value,
                                )
                              }
                              placeholder="리포트 제목(선택)"
                              disabled={creating}
                            />
                            <FormInput
                              value={attachment.reportVersion}
                              onChange={(event) =>
                                handleAttachmentDraftChange(
                                  attachment.id,
                                  "reportVersion",
                                  event.target.value,
                                )
                              }
                              placeholder="리포트 버전(선택)"
                              disabled={creating}
                            />
                          </>
                        )}
                        {attachment.attachmentType === "photo" && (
                          <>
                            <FormInput
                              value={attachment.photoTakenAt}
                              onChange={(event) =>
                                handleAttachmentDraftChange(
                                  attachment.id,
                                  "photoTakenAt",
                                  event.target.value,
                                )
                              }
                              placeholder="촬영 시각(선택)"
                              disabled={creating}
                            />
                            <FormInput
                              value={attachment.photoDescription}
                              onChange={(event) =>
                                handleAttachmentDraftChange(
                                  attachment.id,
                                  "photoDescription",
                                  event.target.value,
                                )
                              }
                              placeholder="사진 설명(선택)"
                              disabled={creating}
                            />
                          </>
                        )}
                        {attachment.attachmentType !== "service_report" &&
                          attachment.attachmentType !== "photo" && (
                          <FormInput
                            value={attachment.label}
                            onChange={(event) =>
                              handleAttachmentDraftChange(
                                attachment.id,
                                "label",
                                event.target.value,
                              )
                            }
                            placeholder="파일 라벨(선택)"
                            disabled={creating}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ marginTop: 6, color: "#6b7280", fontSize: 12 }}>
                  첨부 행이 없습니다. "+ 첨부 행 추가"를 눌러 시작하세요.
                </div>
              )}
            </div>
          </section>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
            flexWrap: "wrap",
          }}
        >
          <FormButton
            type="button"
            onClick={onCreate}
            disabled={creating || categories.length === 0}
          >
            {creating ? "등록 중..." : "등록"}
          </FormButton>
          <FormButton
            type="button"
            onClick={() => navigate("/tickets")}
            disabled={creating}
            variant="secondary"
          >
            취소
          </FormButton>
        </div>
        {categories.length === 0 && (
          <div style={{ marginTop: 8, color: "#6b7280" }}>
            카테고리가 없습니다. 카테고리 관리에서 추가해 주세요.
          </div>
        )}
        {formError && (
          <div style={{ marginTop: 8, color: "crimson" }}>{formError}</div>
        )}
      </div>
      <CustomerMachineSelectModal
        isOpen={isSelectionModalOpen}
        onClose={() => setIsSelectionModalOpen(false)}
        customers={customers}
        machines={machines}
        selectedCustomerId={customerId === "" ? null : Number(customerId)}
        selectedMachineId={machineId === "" ? null : Number(machineId)}
        initialMode={selectionMode}
        onSelectCustomer={handleSelectCustomer}
        onSelectMachine={handleSelectMachine}
        onResetCustomerSelection={resetCustomerSelection}
        onResetMachineSelection={resetMachineSelection}
      />
    </div>
  );
}
