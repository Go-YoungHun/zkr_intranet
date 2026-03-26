 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/client/src/lib/machines.ts b/client/src/lib/machines.ts
index 085dd0a99a7dcf25649f2d849addd67fb4fee55d..38bfa717e020089c2216c8b76f874b4c02f132a3 100644
--- a/client/src/lib/machines.ts
+++ b/client/src/lib/machines.ts
@@ -114,39 +114,48 @@ export type MachineUpdateInput = {
   model?: string | null;
   software_name?: string | null;
   serial_no?: string | null;
   location?: string | null;
   machine_model_id?: number | null;
   is_active?: boolean;
   status?: string | null;
   software_installed_at?: string | null;
   owner_employee_id?: number | null;
 };
 export async function updateMachine(id: number, input: MachineUpdateInput) {
   return api<Machine>(`/machines/${id}`, {
     method: "PUT",
     body: JSON.stringify(input),
   });
 }
 
 export async function fetchMachineTickets(id: number) {
   return api<MachineTicket[]>(`/machines/${id}/tickets`);
 }
 
 export async function fetchMachineAttachments(id: number) {
   return api<MachineAttachment[]>(`/machines/${id}/attachments`);
 }
 
-export async function uploadMachineAttachment(id: number, file: File) {
+export async function uploadMachineAttachments(id: number, files: File[]) {
   const formData = new FormData();
-  formData.append("file", file);
-  return api<MachineAttachment>(`/machines/${id}/attachments`, {
+  files.forEach((file) => formData.append("files", file));
+  return api<MachineAttachment[]>(`/machines/${id}/attachments`, {
     method: "POST",
     body: formData,
   });
 }
 
+export async function uploadMachineAttachment(id: number, file: File) {
+  const uploaded = await uploadMachineAttachments(id, [file]);
+  const [attachment] = uploaded;
+  if (!attachment) {
+    throw new Error("첨부파일 업로드 응답이 올바르지 않습니다.");
+  }
+  return attachment;
+}
+
 export async function deleteMachineAttachment(id: number, attachmentId: number) {
   return api<{ ok: true }>(`/machines/${id}/attachments/${attachmentId}`, {
     method: "DELETE",
   });
 }
 
EOF
)
 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/client/src/pages/MachineDetailPage.tsx b/client/src/pages/MachineDetailPage.tsx
index f5f4e56bdf25043f706f2b0553e30a119b282d67..1eb0d4a141dfc9daee1a20c08e2756b6fba5fb42 100644
--- a/client/src/pages/MachineDetailPage.tsx
+++ b/client/src/pages/MachineDetailPage.tsx
@@ -1,62 +1,74 @@
 import { useEffect, useState, type ChangeEvent } from "react";
+
 import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
 import type { MachineAttachment, MachineDetail } from "../lib/machines";
 import {
   deleteMachineAttachment,
   fetchMachine,
   fetchMachineAttachments,
   updateMachine,
-  uploadMachineAttachment,
+  uploadMachineAttachments,
 } from "../lib/machines";
 import { formatCustomerLabel } from "../lib/customers";
 import { fetchEmployees } from "../lib/employees";
 import type { Employee } from "../lib/employees";
 import { fetchMachineModels } from "../lib/machineModels";
 import type { MachineModel } from "../lib/machineModels";
 import CustomerSelectModal from "../components/CustomerSelectModal";
 import DetailPageHeader from "../components/DetailPageHeader";
 import FormButton from "../components/FormButton";
 import FormInput from "../components/FormInput";
 import FormSelect from "../components/FormSelect";
 
+type UploadQueueStatus = "pending" | "uploading" | "success" | "failed";
+
+type UploadQueueItem = {
+  key: string;
+  file: File;
+  status: UploadQueueStatus;
+  error?: string | null;
+};
+
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
+  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
+  const [uploadQueueNotice, setUploadQueueNotice] = useState<string | null>(null);
   const [isEditing, setIsEditing] = useState(false);
   const [machineModels, setMachineModels] = useState<MachineModel[]>([]);
   const [machineModelsError, setMachineModelsError] = useState<string | null>(null);
   const [employees, setEmployees] = useState<Employee[]>([]);
   const [employeesError, setEmployeesError] = useState<string | null>(null);
   const [activeTab, setActiveTab] = useState<"attachments" | "tickets">(
     tabParam === "attachments" ? "attachments" : "tickets",
   );
 
   useEffect(() => {
     if (tabParam === "attachments" || tabParam === "tickets") {
       setActiveTab(tabParam);
     }
   }, [tabParam]);
 
   const updateTab = (nextTab: "attachments" | "tickets") => {
     setActiveTab(nextTab);
     setSearchParams((prev) => {
       const next = new URLSearchParams(prev);
       next.set("tab", nextTab);
       return next;
     });
   };
 
   const [customerId, setCustomerId] = useState<number | "">("");
@@ -197,65 +209,148 @@ export default function MachineDetailPage() {
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
 
-  const onUpload = async (event: ChangeEvent<HTMLInputElement>) => {
-    if (!machineId) return;
-    const file = event.target.files?.[0];
-    if (!file) return;
+  const getUploadQueueKey = (file: File) => `${file.name}:${file.size}:${file.lastModified}`;
+
+  const onSelectUploadFiles = (event: ChangeEvent<HTMLInputElement>) => {
+    const files = Array.from(event.target.files ?? []);
+    event.target.value = "";
+    if (files.length === 0) return;
+
+    setUploadQueue((prev) => {
+      const existingKeys = new Set(prev.map((item) => item.key));
+      const deduplicated = files.filter((file) => !existingKeys.has(getUploadQueueKey(file)));
+      const skippedCount = files.length - deduplicated.length;
+
+      setUploadQueueNotice(
+        skippedCount > 0
+          ? `중복 파일 ${skippedCount}개를 제외하고 ${deduplicated.length}개를 추가했습니다.`
+          : `${deduplicated.length}개 파일을 추가했습니다.`,
+      );
+
+      return [
+        ...prev,
+        ...deduplicated.map((file) => ({
+          key: getUploadQueueKey(file),
+          file,
+          status: "pending" as const,
+          error: null,
+        })),
+      ];
+    });
+  };
+
+  const removeUploadQueueItem = (key: string) => {
+    setUploadQueue((prev) => prev.filter((item) => item.key !== key));
+  };
+
+  const uploadQueueItems = async (targetKeys: string[]) => {
+    if (!machineId || targetKeys.length === 0) return;
+
+    const targetSet = new Set(targetKeys);
+    const targetItems = uploadQueue.filter((item) => targetSet.has(item.key));
+    if (targetItems.length === 0) return;
+
     setUploading(true);
     setAttachmentsError(null);
-    try {
-      await uploadMachineAttachment(machineId, file);
+    setUploadQueueNotice(null);
+
+    let successCount = 0;
+
+    for (const item of targetItems) {
+      setUploadQueue((prev) =>
+        prev.map((queueItem) =>
+          queueItem.key === item.key
+            ? { ...queueItem, status: "uploading", error: null }
+            : queueItem,
+        ),
+      );
+
+      try {
+        await uploadMachineAttachments(machineId, [item.file]);
+        successCount += 1;
+        setUploadQueue((prev) =>
+          prev.map((queueItem) =>
+            queueItem.key === item.key
+              ? { ...queueItem, status: "success", error: null }
+              : queueItem,
+          ),
+        );
+      } catch (e: any) {
+        setUploadQueue((prev) =>
+          prev.map((queueItem) =>
+            queueItem.key === item.key
+              ? {
+                  ...queueItem,
+                  status: "failed",
+                  error: e?.message || "첨부파일 업로드에 실패했습니다.",
+                }
+              : queueItem,
+          ),
+        );
+      }
+    }
+
+    if (successCount > 0) {
       await loadAttachments();
-    } catch (e: any) {
-      setAttachmentsError(e?.message || "첨부파일 업로드에 실패했습니다.");
-    } finally {
-      setUploading(false);
-      event.target.value = "";
     }
+
+    setUploading(false);
+    setUploadQueueNotice(`${successCount}/${targetItems.length}개 파일 업로드 완료`);
+  };
+
+  const onUploadAllSelected = async () => {
+    const keys = uploadQueue
+      .filter((item) => item.status === "pending" || item.status === "failed")
+      .map((item) => item.key);
+    await uploadQueueItems(keys);
+  };
+
+  const onRetryUploadItem = async (key: string) => {
+    await uploadQueueItems([key]);
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
 
   if (loading) return <div style={{ padding: 24 }}>로딩중...</div>;
   if (!machine) {
     return (
       <div style={{ padding: 24 }}>
         <p>장비를 찾을 수 없습니다.</p>
         <FormButton type="button" onClick={() => navigate("/machines")} variant="secondary">
           목록으로
         </FormButton>
       </div>
     );
   }
 
@@ -521,53 +616,118 @@ export default function MachineDetailPage() {
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
       </div>
 
       {activeTab === "attachments" ? (
         <div style={{ marginTop: 12, padding: 12, border: "1px solid #eee" }}>
           <div style={{ marginBottom: 10, fontWeight: 700 }}>첨부파일</div>
           <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
-            <input type="file" onChange={onUpload} disabled={uploading} />
+            <input type="file" multiple onChange={onSelectUploadFiles} disabled={uploading} />
+            <FormButton
+              type="button"
+              onClick={onUploadAllSelected}
+              disabled={
+                uploading ||
+                uploadQueue.every((item) => item.status !== "pending" && item.status !== "failed")
+              }
+            >
+              일괄 업로드
+            </FormButton>
             {uploading && <span style={{ color: "#6b7280" }}>업로드 중...</span>}
           </div>
+
+          {uploadQueueNotice && (
+            <div style={{ marginTop: 8, color: "#2563eb", fontSize: 13 }}>{uploadQueueNotice}</div>
+          )}
+
+          {uploadQueue.length > 0 && (
+            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
+              {uploadQueue.map((item) => (
+                <div
+                  key={item.key}
+                  style={{
+                    display: "flex",
+                    justifyContent: "space-between",
+                    alignItems: "center",
+                    gap: 12,
+                    padding: "10px 12px",
+                    borderRadius: 10,
+                    border: "1px solid #f0f0f0",
+                    background: "#f9fafb",
+                  }}
+                >
+                  <div>
+                    <div style={{ fontWeight: 600, color: "#111827" }}>{item.file.name}</div>
+                    <div style={{ color: "#6b7280", fontSize: 12 }}>
+                      {(item.file.size / 1024).toFixed(1)} KB · {item.status}
+                    </div>
+                    {item.error && (
+                      <div style={{ color: "crimson", fontSize: 12, marginTop: 4 }}>{item.error}</div>
+                    )}
+                  </div>
+                  <div style={{ display: "flex", gap: 8 }}>
+                    {item.status === "failed" && (
+                      <FormButton
+                        type="button"
+                        variant="secondary"
+                        onClick={() => onRetryUploadItem(item.key)}
+                        disabled={uploading}
+                      >
+                        재시도
+                      </FormButton>
+                    )}
+                    <FormButton
+                      type="button"
+                      variant="secondary"
+                      onClick={() => removeUploadQueueItem(item.key)}
+                      disabled={uploading || item.status === "uploading"}
+                    >
+                      제거
+                    </FormButton>
+                  </div>
+                </div>
+              ))}
+            </div>
+          )}
+
           {attachmentsError && (
             <div style={{ marginTop: 8, color: "crimson" }}>{attachmentsError}</div>
           )}
           {attachmentsLoading ? (
             <div style={{ marginTop: 8, color: "#6b7280" }}>첨부파일 불러오는 중...</div>
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
                   <div>
                     <a
                       href={attachment.file_url}
                       target="_blank"
 
EOF
)
 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/server/src/routes/machineRoutes.js b/server/src/routes/machineRoutes.js
index a874c25529be18a40c398adaea96e48ff378df1f..078cb1499d3eba2db0bf3259600a12613944ebf1 100644
--- a/server/src/routes/machineRoutes.js
+++ b/server/src/routes/machineRoutes.js
@@ -9,50 +9,51 @@ const {
   Ticket,
   MachineAttachment,
   MachineModel,
   Employee,
   SalesAgency,
 } = require("../models");
 const { requireAuth } = require("../middlewares/auth");
 
 const uploadsRoot = path.join(__dirname, "..", "..", "uploads", "machines");
 fs.mkdirSync(uploadsRoot, { recursive: true });
 
 const storage = multer.diskStorage({
   destination: (req, file, cb) => {
     cb(null, uploadsRoot);
   },
   filename: (req, file, cb) => {
     const ext = path.extname(file.originalname);
     const base = path.basename(file.originalname, ext);
     const safeBase = base.replace(/[^a-zA-Z0-9-_]/g, "_") || "file";
     const filename = `${Date.now()}_${safeBase}${ext}`;
     cb(null, filename);
   },
 });
 
 const upload = multer({ storage });
+const MAX_ATTACHMENT_UPLOAD_COUNT = 20;
 
 const router = express.Router();
 
 const MACHINE_STATUSES = ["active", "maintenance", "inactive", "retired"];
 const ACTIVE_MACHINE_STATUSES = new Set(["active", "maintenance"]);
 
 const normalizeMachineStatus = (value) => {
   if (typeof value !== "string") return null;
   const normalized = value.trim().toLowerCase();
   return MACHINE_STATUSES.includes(normalized) ? normalized : null;
 };
 
 const statusToIsActive = (status) => ACTIVE_MACHINE_STATUSES.has(status);
 
 /**
  * GET /api/machines
  * 장비 목록 (고객사 포함)
  */
 router.get("/", requireAuth, async (req, res) => {
   try {
     const all = req.query.all === "1";
     const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
     const rawPage = Number.parseInt(req.query.page, 10);
     const rawPageSize = Number.parseInt(req.query.pageSize, 10);
     const rawLimit = Number.parseInt(req.query.limit, 10);
@@ -157,71 +158,90 @@ router.get("/:id", requireAuth, async (req, res) => {
 /**
  * GET /api/machines/:id/attachments
  * 장비 첨부파일 목록
  */
 router.get("/:id/attachments", requireAuth, async (req, res) => {
   try {
     const machine = await Machine.findByPk(req.params.id);
     if (!machine) return res.status(404).json({ message: "Not found" });
 
     const rows = await MachineAttachment.findAll({
       where: { machine_id: machine.id },
       order: [["id", "DESC"]],
     });
 
     res.json(rows);
   } catch (err) {
     console.error(err);
     res.status(500).json({ message: "Server error" });
   }
 });
 
 /**
  * POST /api/machines/:id/attachments
  * 장비 첨부파일 업로드
  */
-router.post("/:id/attachments", requireAuth, upload.single("file"), async (req, res) => {
-  try {
-    const machine = await Machine.findByPk(req.params.id);
-    if (!machine) return res.status(404).json({ message: "Not found" });
-    if (!req.file) return res.status(400).json({ message: "File is required" });
-
-    const attachment = await MachineAttachment.create({
-      machine_id: machine.id,
-      file_name: req.file.originalname,
-      file_url: `/uploads/machines/${req.file.filename}`,
-      mime_type: req.file.mimetype,
-      size: req.file.size,
-      uploaded_by_employee_id: req.user?.id ?? null,
-    });
+router.post(
+  "/:id/attachments",
+  requireAuth,
+  upload.fields([
+    { name: "files", maxCount: MAX_ATTACHMENT_UPLOAD_COUNT },
+    { name: "file", maxCount: MAX_ATTACHMENT_UPLOAD_COUNT },
+  ]),
+  async (req, res) => {
+    try {
+      const machine = await Machine.findByPk(req.params.id);
+      if (!machine) return res.status(404).json({ message: "Not found" });
+      const uploadedFiles = [
+        ...((req.files && req.files.files) || []),
+        ...((req.files && req.files.file) || []),
+      ];
 
-    res.status(201).json(attachment);
-  } catch (err) {
-    console.error(err);
-    res.status(500).json({ message: "Server error" });
+      if (uploadedFiles.length === 0) {
+        return res.status(400).json({ message: "File is required" });
+      }
+
+      const attachments = await Promise.all(
+        uploadedFiles.map((file) =>
+          MachineAttachment.create({
+            machine_id: machine.id,
+            file_name: file.originalname,
+            file_url: `/uploads/machines/${file.filename}`,
+            mime_type: file.mimetype,
+            size: file.size,
+            uploaded_by_employee_id: req.user?.id ?? null,
+          })
+        )
+      );
+
+      res.status(201).json(attachments);
+    } catch (err) {
+      console.error(err);
+      res.status(500).json({ message: "Server error" });
+    }
   }
-});
+);
 
 const deleteMachineAttachment = async (req, res) => {
   try {
     const machine = await Machine.findByPk(req.params.id);
     if (!machine) return res.status(404).json({ message: "Not found" });
 
     const attachmentId =
       req.params.attachmentId || req.query.attachment_id || req.body?.attachment_id;
 
     if (!attachmentId) {
       return res.status(400).json({ message: "attachment_id is required" });
     }
 
     const attachment = await MachineAttachment.findOne({
       where: { id: attachmentId, machine_id: machine.id },
     });
 
     if (!attachment) return res.status(404).json({ message: "Not found" });
 
     if (attachment.file_url) {
       const filename = path.basename(attachment.file_url);
       const filePath = path.join(uploadsRoot, filename);
       fs.unlink(filePath, () => {});
     }
 
 
EOF
)