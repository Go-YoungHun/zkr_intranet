const REMOVE_CONTENT_TAGS = ["script", "style", "iframe", "object", "embed", "form"];

export const SANITIZE_HTML_ALLOWED_TAGS = [
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
] as const;

export const SANITIZE_HTML_ALLOWED_ATTRS = [
  "href",
  "target",
  "rel",
  "src",
  "alt",
  "title",
] as const;

const allowedTagSet = new Set<string>(SANITIZE_HTML_ALLOWED_TAGS);
const allowedAttrSet = new Set<string>(SANITIZE_HTML_ALLOWED_ATTRS);
const allowedProtocols = ["http:", "https:", "mailto:", "tel:"];

const isSafeUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("#") || trimmed.startsWith("/")) return true;

  try {
    const url = new URL(trimmed, window.location.origin);
    return allowedProtocols.includes(url.protocol);
  } catch {
    return false;
  }
};

export const sanitizeHtml = (html: string) => {
  if (!html) return "";

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  REMOVE_CONTENT_TAGS.forEach((tag) => {
    doc.querySelectorAll(tag).forEach((node) => node.remove());
  });

  const walk = (node: Node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const tag = element.tagName.toLowerCase();

      if (!allowedTagSet.has(tag)) {
        const fragment = document.createDocumentFragment();
        while (element.firstChild) {
          fragment.appendChild(element.firstChild);
        }
        element.replaceWith(fragment);
        return;
      }

      [...element.attributes].forEach((attr) => {
        const name = attr.name.toLowerCase();
        const value = attr.value;

        if (!allowedAttrSet.has(name) || name.startsWith("on")) {
          element.removeAttribute(attr.name);
          return;
        }

        if ((name === "href" || name === "src") && !isSafeUrl(value)) {
          element.removeAttribute(attr.name);
        }
      });

      if (tag === "a") {
        element.setAttribute("rel", "noopener noreferrer");
      }
    }

    [...node.childNodes].forEach(walk);
  };

  [...doc.body.childNodes].forEach(walk);

  return doc.body.innerHTML;
};
