const createDOMPurify = require("dompurify");
const { JSDOM } = require("jsdom");

const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window);

const ALLOWED_TAGS = [
  "p",
  "br",
  "div",
  "span",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "blockquote",
  "code",
  "pre",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "a",
  "img",
];

const ALLOWED_ATTR = ["href", "target", "rel", "src", "alt", "title"];

const ALLOWED_URI_REGEXP =
  /^(?:(?:https?|mailto|tel):|\/|#)/i;

const sanitizeHtml = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const sanitized = DOMPurify.sanitize(trimmed, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form"],
    FORBID_ATTR: ["style"],
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP,
  });

  if (!sanitized || !sanitized.trim()) return null;
  return sanitized;
};

module.exports = {
  sanitizeHtml,
  SANITIZE_POLICY: {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTR,
    allowedUriRegexp: ALLOWED_URI_REGEXP.toString(),
    blockedTags: ["script", "style", "iframe", "object", "embed", "form"],
  },
};
