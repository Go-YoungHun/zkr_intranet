export const parseDateTime = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = trimmed.replace(" ", "T");
  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  const numeric = Number(trimmed);
  if (Number.isFinite(numeric)) {
    const ms = trimmed.length <= 10 ? numeric * 1000 : numeric;
    const timestampDate = new Date(ms);
    if (!Number.isNaN(timestampDate.getTime())) return timestampDate;
  }

  return null;
};

export const formatDateTime = (value?: string | null) => {
  if (!value) return "-";

  const parsed = parseDateTime(value);
  if (!parsed) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
};

const toTimestamp = (value?: string | null) => {
  const parsed = parseDateTime(value);
  if (!parsed) return null;
  const timestamp = parsed.getTime();

  return timestamp;
};

export const hasSameDateTime = (left?: string | null, right?: string | null) => {
  const leftTimestamp = toTimestamp(left);
  const rightTimestamp = toTimestamp(right);

  if (leftTimestamp === null || rightTimestamp === null) return false;

  return leftTimestamp === rightTimestamp;
};
