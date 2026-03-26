import { sanitizeHtml } from "./sanitizeHtml";

export const sanitizeRichTextHtml = sanitizeHtml;

export const isRichTextEmpty = (html: string) => {
  if (!html) return true;

  const sanitized = sanitizeRichTextHtml(html);
  if (!sanitized) return true;

  const parser = new DOMParser();
  const doc = parser.parseFromString(sanitized, "text/html");
  const text = (doc.body.textContent ?? "").replace(/\u00a0/g, " ").trim();

  if (text.length > 0) return false;

  return !doc.body.querySelector("img, video, iframe, object, embed");
};
