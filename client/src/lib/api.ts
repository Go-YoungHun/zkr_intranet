const RAW_API_BASE = import.meta.env.VITE_API_BASE || "/api";
const API_BASE = RAW_API_BASE.endsWith("/") ? RAW_API_BASE.slice(0, -1) : RAW_API_BASE;
const NORMALIZED_API_BASE = API_BASE.replace(/(\/api)+$/, "/api");

function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (NORMALIZED_API_BASE.endsWith("/api") && normalizedPath.startsWith("/api")) {
    return `${NORMALIZED_API_BASE}${normalizedPath.slice(4)}`;
  }

  return `${NORMALIZED_API_BASE}${normalizedPath}`;
}

export function resolveFileUrl(fileUrl: string): string {
  if (!fileUrl) return fileUrl;
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;

  const appOrigin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "http://localhost";
  const apiOrigin = new URL(NORMALIZED_API_BASE, appOrigin).origin;

  if (fileUrl.startsWith("/")) {
    return `${apiOrigin}${fileUrl}`;
  }

  return `${apiOrigin}/${fileUrl}`;
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const res = await fetch(buildApiUrl(path), {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
    },
    credentials: "include", // ⭐ 쿠키 인증 핵심
  });

  if (res.status === 401) {
    throw new Error("UNAUTHORIZED");
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP_${res.status}`);
  }

  return res.json();
}
