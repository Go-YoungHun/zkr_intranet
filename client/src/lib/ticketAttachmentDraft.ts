import type { TicketAttachmentType } from "./tickets";

export type AttachmentUploadDraft = {
  id: number;
  attachmentType: TicketAttachmentType;
  file: File | null;
  label: string;
  reportTitle: string;
  reportVersion: string;
  photoTakenAt: string;
  photoDescription: string;
};

export const createEmptyAttachmentUploadDraft = (
  id: number,
): AttachmentUploadDraft => ({
  id,
  attachmentType: "etc",
  file: null,
  label: "",
  reportTitle: "",
  reportVersion: "",
  photoTakenAt: "",
  photoDescription: "",
});

export const buildAttachmentLabel = (draft: AttachmentUploadDraft) => {
  if (draft.attachmentType === "service_report") {
    return [draft.reportTitle.trim(), draft.reportVersion.trim()]
      .filter(Boolean)
      .join(" / ");
  }
  if (draft.attachmentType === "photo") {
    return [draft.photoTakenAt.trim(), draft.photoDescription.trim()]
      .filter(Boolean)
      .join(" / ");
  }
  return draft.label.trim();
};
