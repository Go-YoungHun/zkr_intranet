import { useEffect, useState, type ChangeEvent } from "react";

import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import type {
  MachineAttachment,
  MachineAttachmentUploadResult,
  MachineDetail,
} from "../lib/machines";
import {
  deleteMachineAttachment,
  fetchMachine,
  fetchMachineAttachments,
  updateMachine,
  uploadMachineAttachments,
} from "../lib/machines";
import { formatCustomerLabel } from "../lib/customers";
import { fetchEmployees } from "../lib/employees";
import type { Employee } from "../lib/employees";
import { fetchMachineModels } from "../lib/machineModels";
import type { MachineModel } from "../lib/machineModels";
import CustomerSelectModal from "../components/CustomerSelectModal";
import DetailPageHeader from "../components/DetailPageHeader";
import AuditTimeline from "../components/AuditTimeline";
import FormButton from "../components/FormButton";
import FormInput from "../components/FormInput";
import FormSelect from "../components/FormSelect";
import Modal from "../components/Modal";
import { ATTACHMENT_THUMBNAIL_SIZE, isImageMimeType } from "../lib/attachments";

type UploadQueueStatus = "pending" | "uploading" | "success" | "failed";

type UploadQueueItem = {
  key: string;
  file: File;
  label: string;
  status: UploadQueueStatus;
  error?: string | null;
  attachmentId?: number | null;
};

type MachineDetailTab = "attachments" | "tickets" | "history";

export default function MachineDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const machineId = Number(id);

  const [machine, setMachine] = useState<MachineDetail | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [attachments, setAttachments] = useState<MachineAttachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [attachmentsError, setAttachmentsError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [uploadQueueNotice, setUploadQueueNotice] = useState<string | null>(
    null,
  );
  const [previewImage, setPreviewImage] = useState<MachineAttachment | null>(
    null,
  );
  const [brokenImageIds, setBrokenImageIds] = useState<Record<number, boolean>>(
    {},
  );
  const [isEditing, setIsEditing] = useState(false);
  const [machineModels, setMachineModels] = useState<MachineModel[]>([]);
  const [machineModelsError, setMachineModelsError] = useState<string | null>(
    null,
  );
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeesError, setEmployeesError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<MachineDetailTab>(
    tabParam === "attachments" || tabParam === "history"
      ? tabParam
      : "tickets",
  );

  useEffect(() => {
    if (
      tabParam === "attachments" ||
      tabParam === "tickets" ||
      tabParam === "history"
    ) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const updateTab = (nextTab: MachineDetailTab) => {
    setActiveTab(nextTab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", nextTab);
      return next;
    });
  };

  const [customerId, setCustomerId] = useState<number | "">("");
  const [customerName, setCustomerName] = useState("");
  const [name, setName] = useState("");
  const [model, setModel] = useState("");
  const [softwareName, setSoftwareName] = useState("");
  const [machineModelId, setMachineModelId] = useState<number | "">("");
  const [serialNo, setSerialNo] = useState("");
  const [location, setLocation] = useState("");
  const [softwareInstalledAt, setSoftwareInstalledAt] = useState("");
  const [ownerEmployeeId, setOwnerEmployeeId] = useState<number | "">("");
  const [isActive, setIsActive] = useState(true);

  const resetForm = (detail: MachineDetail) => {
    setCustomerId((detail.customer_id ?? "") as any);
    setCustomerName(detail.Customer?.name ?? "");
    setName(detail.name ?? "");
    setModel(detail.model ?? "");
    setSoftwareName(detail.software_name ?? "");
    setMachineModelId((detail.machine_model_id ?? "") as any);
    setSerialNo(detail.serial_no ?? "");
    setLocation(detail.location ?? "");
    setSoftwareInstalledAt(detail.software_installed_at ?? "");
    setOwnerEmployeeId((detail.owner_employee_id ?? "") as any);
    setIsActive(detail.is_active ?? true);
  };

  const load = async () => {
    if (!machineId) {
      setError("유효하지 않은 장비입니다.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const detail = await fetchMachine(machineId);
      setMachine(detail);
      resetForm(detail);
      setIsEditing(false);
    } catch (e: any) {
      setError(e?.message || "장비 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const loadAttachments = async () => {
    if (!machineId) return;
    setAttachmentsLoading(true);
    setAttachmentsError(null);
    try {
      const data = await fetchMachineAttachments(machineId);
      setAttachments(data);
      setBrokenImageIds({});
    } catch (e: any) {
      setAttachmentsError(e?.message || "첨부파일을 불러오지 못했습니다.");
    } finally {
      setAttachmentsLoading(false);
    }
  };

  const loadMachineModels = async () => {
    setMachineModelsError(null);
    try {
      const data = await fetchMachineModels();
      setMachineModels(data);
    } catch (e: any) {
      setMachineModelsError(
        e?.message || "장비 모델 목록을 불러오지 못했습니다.",
      );
    }
  };

  const loadEmployees = async () => {
    setEmployeesError(null);
    try {
      const data = await fetchEmployees(true);
      setEmployees(data);
    } catch (e: any) {
      setEmployeesError(e?.message || "담당자 목록을 불러오지 못했습니다.");
    }
  };

  useEffect(() => {
    load();
  }, [machineId]);

  useEffect(() => {
    loadAttachments();
  }, [machineId]);

  useEffect(() => {
    loadMachineModels();
    loadEmployees();
  }, []);

  const onSave = async () => {
    if (!machineId) return;
    if (!name.trim()) {
      setError("장비명(name)은 필수입니다.");
      return;
    }
    if (customerId === "") {
      setError("고객사를 선택해주세요.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updated = await updateMachine(machineId, {
        customer_id: Number(customerId),
        name: name.trim(),
        model: model.trim() || null,
        software_name: softwareName.trim() || null,
        serial_no: serialNo.trim() || null,
        location: location.trim() || null,
        machine_model_id: machineModelId === "" ? null : Number(machineModelId),
        software_installed_at: softwareInstalledAt || null,
        owner_employee_id:
          ownerEmployeeId === "" ? null : Number(ownerEmployeeId),
        is_active: isActive,
      });
      const selectedOwner =
        ownerEmployeeId === ""
          ? null
          : employees.find(
              (employee) => employee.id === Number(ownerEmployeeId),
            );
      setMachine((prev) => ({
        ...(prev ?? updated),
        ...updated,
        Customer: customerName
          ? {
              id: Number(customerId),
              name: customerName,
              address: null,
            }
          : prev?.Customer,
        Owner: selectedOwner
          ? {
              id: selectedOwner.id,
              name: selectedOwner.name,
            }
          : ownerEmployeeId === ""
            ? null
            : prev?.Owner,
      }));
      setIsEditing(false);
      setIsCustomerModalOpen(false);
    } catch (e: any) {
      setError(e?.message || "장비 수정에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const onCancelEdit = () => {
    if (!machine) return;
    resetForm(machine);
    setError(null);
    setIsEditing(false);
    setIsCustomerModalOpen(false);
  };

  const getUploadQueueKey = (file: File) =>
    `${file.name}:${file.size}:${file.lastModified}`;

  const onSelectUploadFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    setUploadQueue((prev) => {
      const existingKeys = new Set(prev.map((item) => item.key));
      const uniqueSelected: File[] = [];

      files.forEach((file) => {
        const key = getUploadQueueKey(file);
        if (!existingKeys.has(key)) {
          existingKeys.add(key);
          uniqueSelected.push(file);
        }
      });

      const skippedCount = files.length - uniqueSelected.length;
      setUploadQueueNotice(
        skippedCount > 0
          ? `중복 파일 ${skippedCount}개를 제외하고 ${uniqueSelected.length}개를 추가했습니다.`
          : `${uniqueSelected.length}개 파일을 추가했습니다.`,
      );

      return [
        ...prev,
        ...uniqueSelected.map((file) => ({
          key: getUploadQueueKey(file),
          file,
          label: "",
          status: "pending" as const,
          error: null,
          attachmentId: null,
        })),
      ];
    });
  };

  const removeUploadQueueItem = (key: string) => {
    setUploadQueue((prev) => prev.filter((item) => item.key !== key));
  };

  const onUploadQueueLabelChange = (key: string, value: string) => {
    setUploadQueue((prev) =>
      prev.map((item) => (item.key === key ? { ...item, label: value } : item)),
    );
  };

  const applyUploadResults = (
    targetItems: UploadQueueItem[],
    results: MachineAttachmentUploadResult[],
  ) => {
    const resultMap = new Map(
      targetItems.map((item, index) => [item.key, results[index]]),
    );

    setUploadQueue((prev) =>
      prev.map((item) => {
        const result = resultMap.get(item.key);
        if (!result) return item;

        return {
          ...item,
          status: result.status,
          error: result.error,
          attachmentId: result.attachment?.id ?? null,
        };
      }),
    );
  };

  const uploadQueueItems = async (targetKeys: string[]) => {
    if (!machineId || targetKeys.length === 0) return;

    const targetSet = new Set(targetKeys);
    const targetItems = uploadQueue.filter((item) => targetSet.has(item.key));
    if (targetItems.length === 0) return;

    setUploading(true);
    setAttachmentsError(null);
    setUploadQueueNotice(null);
    setUploadQueue((prev) =>
      prev.map((item) =>
        targetSet.has(item.key)
          ? { ...item, status: "uploading", error: null }
          : item,
      ),
    );

    try {
      const response = await uploadMachineAttachments(
        machineId,
        targetItems.map((item) => ({ file: item.file, label: item.label })),
      );
      applyUploadResults(targetItems, response.results);
      if (response.successCount > 0) {
        await loadAttachments();
      }
      setUploadQueueNotice(
        `${response.successCount}/${response.results.length}개 파일 업로드 완료`,
      );
    } catch (e: any) {
      setUploadQueue((prev) =>
        prev.map((item) =>
          targetSet.has(item.key)
            ? {
                ...item,
                status: "failed",
                error: e?.message || "첨부파일 업로드에 실패했습니다.",
              }
            : item,
        ),
      );
      setAttachmentsError(e?.message || "첨부파일 업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  };

  const onUploadAllSelected = async () => {
    const keys = uploadQueue
      .filter((item) => item.status === "pending" || item.status === "failed")
      .map((item) => item.key);
    await uploadQueueItems(keys);
  };

  const onRetryUploadItem = async (key: string) => {
    await uploadQueueItems([key]);
  };

  const onDeleteAttachment = async (attachmentId: number) => {
    if (!machineId) return;
    setAttachmentsError(null);
    try {
      await deleteMachineAttachment(machineId, attachmentId);
      await loadAttachments();
    } catch (e: any) {
      setAttachmentsError(e?.message || "첨부파일 삭제에 실패했습니다.");
    }
  };

  const markImageAsBroken = (attachmentId: number) => {
    setBrokenImageIds((prev) => ({ ...prev, [attachmentId]: true }));
  };

  const isAttachmentImage = (attachment: MachineAttachment) => {
    if (brokenImageIds[attachment.id]) return false;
    return attachment.is_image ?? isImageMimeType(attachment.mime_type);
  };

  if (loading) return <div style={{ padding: 24 }}>로딩중...</div>;
  if (!machine) {
    return (
      <div style={{ padding: 24 }}>
        <p>장비를 찾을 수 없습니다.</p>
        <FormButton
          type="button"
          onClick={() => navigate("/machines")}
          variant="secondary"
        >
          목록으로
        </FormButton>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <DetailPageHeader
        title={<h2 style={{ margin: 0 }}>장비 상세 #{machine.id}</h2>}
        meta={
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              padding: "4px 10px",
              borderRadius: 999,
              background: machine.is_active ? "#ecfdf3" : "#fef2f2",
              color: machine.is_active ? "#15803d" : "#b91c1c",
              fontWeight: 600,
            }}
          >
            {machine.is_active ? "활성" : "비활성"}
          </span>
        }
        actions={
          <FormButton
            type="button"
            onClick={() => navigate("/machines")}
            variant="secondary"
          >
            목록으로
          </FormButton>
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
          <div style={{ fontWeight: 700 }}>장비 정보</div>
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "140px 1fr",
              gap: 8,
            }}
          >
            <div style={{ color: "#6b7280" }}>고객사</div>
            <div>
              {isEditing ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <FormButton
                    type="button"
                    onClick={() => setIsCustomerModalOpen(true)}
                    disabled={saving}
                    variant="secondary"
                  >
                    고객사 선택
                  </FormButton>
                  <span
                    style={{
                      color: customerId ? "#111827" : "#6b7280",
                      minWidth: 180,
                    }}
                  >
                    {customerId
                      ? customerName || `ID: ${customerId}`
                      : "선택된 고객사 없음"}
                  </span>
                </div>
              ) : (
                (machine.Customer?.name ??
                (machine.customer_id ? `ID: ${machine.customer_id}` : "-"))
              )}
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "140px 1fr",
              gap: 8,
            }}
          >
            <div style={{ color: "#6b7280" }}>장비명</div>
            <div>
              {isEditing ? (
                <FormInput
                  placeholder="장비명(필수)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-field--medium"
                  disabled={saving}
                />
              ) : (
                (machine.name ?? "-")
              )}
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "140px 1fr",
              gap: 8,
            }}
          >
            <div style={{ color: "#6b7280" }}>모델</div>
            <div>
              {isEditing ? (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <FormSelect
                    value={machineModelId}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (!value) {
                        setMachineModelId("");
                        return;
                      }
                      const selected = machineModels.find(
                        (item) => item.id === Number(value),
                      );
                      setMachineModelId(Number(value));
                      if (selected) {
                        setModel(selected.name);
                      }
                    }}
                    disabled={saving}
                  >
                    <option value="">모델 선택(직접 입력)</option>
                    {machineModels.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </FormSelect>
                  <FormInput
                    placeholder="모델명 직접 입력"
                    value={model}
                    onChange={(e) => {
                      setModel(e.target.value);
                      if (machineModelId !== "") {
                        setMachineModelId("");
                      }
                    }}
                    disabled={saving}
                  />
                </div>
              ) : (
                (machine.MachineModel?.name ?? machine.model ?? "-")
              )}
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "140px 1fr",
              gap: 8,
            }}
          >
            <div style={{ color: "#6b7280" }}>소프트웨어</div>
            <div>
              {isEditing ? (
                <FormInput
                  placeholder="소프트웨어"
                  value={softwareName}
                  onChange={(e) => setSoftwareName(e.target.value)}
                  className="form-field--medium"
                  disabled={saving}
                />
              ) : (
                (machine.software_name ?? "-")
              )}
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "140px 1fr",
              gap: 8,
            }}
          >
            <div style={{ color: "#6b7280" }}>위치</div>
            <div>
              {isEditing ? (
                <FormInput
                  placeholder="위치"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="form-field--medium"
                  disabled={saving}
                />
              ) : (
                (machine.location ?? "-")
              )}
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "140px 1fr",
              gap: 8,
            }}
          >
            <div style={{ color: "#6b7280" }}>설치 일자</div>
            <div>
              {isEditing ? (
                <FormInput
                  type="date"
                  value={softwareInstalledAt}
                  onChange={(e) => setSoftwareInstalledAt(e.target.value)}
                  className="form-field--medium"
                  disabled={saving}
                />
              ) : (
                (machine.software_installed_at ?? "-")
              )}
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "140px 1fr",
              gap: 8,
            }}
          >
            <div style={{ color: "#6b7280" }}>담당자</div>
            <div>
              {isEditing ? (
                <FormSelect
                  value={ownerEmployeeId}
                  onChange={(event) => {
                    const value = event.target.value;
                    setOwnerEmployeeId(value ? Number(value) : "");
                  }}
                  disabled={saving}
                >
                  <option value="">담당자 선택(없음)</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </FormSelect>
              ) : (
                (machine.Owner?.name ?? "-")
              )}
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "140px 1fr",
              gap: 8,
            }}
          >
            <div style={{ color: "#6b7280" }}>상태</div>
            <div>
              {isEditing ? (
                <FormSelect
                  value={isActive ? "active" : "inactive"}
                  onChange={(event) =>
                    setIsActive(event.target.value === "active")
                  }
                  disabled={saving}
                >
                  <option value="active">활성</option>
                  <option value="inactive">비활성</option>
                </FormSelect>
              ) : machine.is_active ? (
                "활성"
              ) : (
                "비활성"
              )}
            </div>
          </div>
        </div>
        {(error || machineModelsError || employeesError) && (
          <div style={{ marginTop: 8, color: "crimson" }}>
            {error || machineModelsError || employeesError}
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 12,
          }}
        >
          {!isEditing ? (
            <FormButton type="button" onClick={() => setIsEditing(true)}>
              편집
            </FormButton>
          ) : (
            <>
              <FormButton type="button" onClick={onSave} disabled={saving}>
                {saving ? "저장 중..." : "저장"}
              </FormButton>
              <FormButton
                type="button"
                onClick={onCancelEdit}
                disabled={saving}
                variant="secondary"
              >
                취소
              </FormButton>
            </>
          )}
        </div>
      </div>
      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => updateTab("tickets")}
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
          onClick={() => updateTab("attachments")}
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
          onClick={() => updateTab("history")}
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

      {activeTab === "attachments" ? (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #eee" }}>
          <div style={{ marginBottom: 10, fontWeight: 700 }}>첨부파일</div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
            }}
          >
            <input
              type="file"
              multiple
              onChange={onSelectUploadFiles}
              disabled={uploading}
            />
            <FormButton
              type="button"
              onClick={onUploadAllSelected}
              disabled={
                uploading ||
                uploadQueue.every(
                  (item) =>
                    item.status !== "pending" && item.status !== "failed",
                )
              }
            >
              일괄 업로드
            </FormButton>
            {uploading && (
              <span style={{ color: "#6b7280" }}>업로드 중...</span>
            )}
          </div>

          {uploadQueueNotice && (
            <div style={{ marginTop: 8, color: "#2563eb", fontSize: 13 }}>
              {uploadQueueNotice}
            </div>
          )}

          {uploadQueue.length > 0 && (
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {uploadQueue.map((item) => (
                <div
                  key={item.key}
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
                  <div style={{ display: "grid", gap: 6, flex: 1 }}>
                    <div style={{ fontWeight: 600, color: "#111827" }}>
                      {item.file.name}
                    </div>
                    <div style={{ color: "#6b7280", fontSize: 12 }}>
                      {(item.file.size / 1024).toFixed(1)} KB · {item.status}
                    </div>
                    <FormInput
                      value={item.label}
                      onChange={(event) =>
                        onUploadQueueLabelChange(item.key, event.target.value)
                      }
                      placeholder="파일 라벨(선택)"
                      disabled={uploading || item.status === "uploading"}
                    />
                    {item.error && (
                      <div
                        style={{ color: "crimson", fontSize: 12, marginTop: 4 }}
                      >
                        {item.error}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {item.status === "failed" && (
                      <FormButton
                        type="button"
                        variant="secondary"
                        onClick={() => onRetryUploadItem(item.key)}
                        disabled={uploading}
                      >
                        재시도
                      </FormButton>
                    )}
                    <FormButton
                      type="button"
                      variant="secondary"
                      onClick={() => removeUploadQueueItem(item.key)}
                      disabled={uploading || item.status === "uploading"}
                    >
                      제거
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
                        style={{
                          fontWeight: 600,
                          color: "#111827",
                          textDecoration: "none",
                        }}
                      >
                        {attachment.file_name}
                      </a>
                      <div
                        style={{ color: "#4b5563", fontSize: 12, marginTop: 2 }}
                      >
                        {attachment.label?.trim() ||
                          "라벨이 입력되지 않았습니다."}
                      </div>
                      <div style={{ color: "#6b7280", fontSize: 12 }}>
                        {attachment.mime_type ?? "unknown"} ·{" "}
                        {attachment.size
                          ? `${(attachment.size / 1024).toFixed(1)} KB`
                          : "-"}
                      </div>
                    </div>
                  </div>
                  <FormButton
                    type="button"
                    onClick={() => onDeleteAttachment(attachment.id)}
                    variant="secondary"
                  >
                    삭제
                  </FormButton>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ marginTop: 8, color: "#666" }}>
              등록된 첨부파일이 없습니다.
            </div>
          )}
        </div>
      ) : activeTab === "tickets" ? (
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
            <div style={{ fontWeight: 700 }}>연결된 티켓</div>
            <FormButton
              type="button"
              onClick={() =>
                navigate(
                  `/tickets/new?machineId=${machine.id}${
                    machine.customer_id
                      ? `&customerId=${machine.customer_id}`
                      : ""
                  }`,
                )
              }
            >
              신규 티켓 등록
            </FormButton>
          </div>
          {machine.Tickets && machine.Tickets.length > 0 ? (
            <div style={{ display: "grid", gap: 8 }}>
              {machine.Tickets.map((ticket) => (
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
                      상태: {ticket.status ?? "-"} / 우선순위:{" "}
                      {ticket.priority ?? "-"}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div style={{ color: "#666" }}>연결된 티켓이 없습니다.</div>
          )}
        </div>
      ) : (
        <div style={{ marginTop: 12 }}>
          <AuditTimeline
            entityType="machine"
            entityId={machine.id}
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

      <CustomerSelectModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSelect={(customer) => {
          setCustomerId(customer.id);
          setCustomerName(formatCustomerLabel(customer));
          setError(null);
        }}
        selectedCustomerId={customerId === "" ? null : Number(customerId)}
      />
    </div>
  );
}
