export const ATTACHMENT_THUMBNAIL_SIZE = 120;

export function isImageMimeType(mimeType?: string | null) {
  if (typeof mimeType !== "string") return false;
  return mimeType.toLowerCase().startsWith("image/");
}
