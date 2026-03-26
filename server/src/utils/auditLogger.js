const { AuditLog } = require("../models");

const REDACTED_KEY_PATTERN = /(password|passwd|token|secret|authorization|cookie)/i;
const EXCLUDED_BINARY_KEY_PATTERN = /(binary|buffer|file_data|blob|base64|raw_file|file_binary)/i;

const cloneJson = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return JSON.parse(JSON.stringify(value));
};

const sanitizeValue = (value, parentKey = "") => {
  if (value === undefined) return undefined;
  if (value === null) return null;

  if (Buffer.isBuffer(value)) {
    return "[BINARY_EXCLUDED]";
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, parentKey));
  }

  if (typeof value === "object") {
    const result = {};

    for (const [key, nestedValue] of Object.entries(value)) {
      if (REDACTED_KEY_PATTERN.test(key)) {
        result[key] = "[REDACTED]";
        continue;
      }

      if (EXCLUDED_BINARY_KEY_PATTERN.test(key)) {
        result[key] = "[BINARY_EXCLUDED]";
        continue;
      }

      result[key] = sanitizeValue(nestedValue, key || parentKey);
    }

    return result;
  }

  return value;
};

const isObject = (value) => value !== null && typeof value === "object";

const collectChangedPaths = (beforeValue, afterValue, basePath = "") => {
  if (beforeValue === afterValue) return [];

  if (!isObject(beforeValue) || !isObject(afterValue)) {
    return [basePath || "$"];
  }

  const keys = new Set([
    ...Object.keys(beforeValue || {}),
    ...Object.keys(afterValue || {}),
  ]);

  const changed = [];
  for (const key of keys) {
    const nextPath = basePath ? `${basePath}.${key}` : key;
    changed.push(
      ...collectChangedPaths(beforeValue?.[key], afterValue?.[key], nextPath),
    );
  }

  return changed;
};

const resolveClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || null;
};

const logAuditEvent = async ({
  req,
  entityType,
  entityId,
  action,
  before,
  after,
  performedByEmployeeId,
  onBehalfOfEmployeeId,
}) => {
  try {
    const beforeJson = sanitizeValue(cloneJson(before));
    const afterJson = sanitizeValue(cloneJson(after));

    const changedFields =
      beforeJson === undefined && afterJson !== undefined
        ? Object.keys(afterJson || {})
        : beforeJson !== undefined && afterJson === undefined
          ? Object.keys(beforeJson || {})
          : collectChangedPaths(beforeJson, afterJson).filter(
              (path) => path && path !== "$",
            );

    const actorEmployeeId = performedByEmployeeId ?? req?.user?.id ?? null;
    const delegatedEmployeeId =
      onBehalfOfEmployeeId !== undefined
        ? onBehalfOfEmployeeId
        : req?.body?.on_behalf_of_employee_id ?? null;

    await AuditLog.create({
      entity_type: entityType,
      entity_id: String(entityId),
      action,
      actor_employee_id: actorEmployeeId,
      performed_by_employee_id: actorEmployeeId,
      on_behalf_of_employee_id:
        delegatedEmployeeId && delegatedEmployeeId !== actorEmployeeId
          ? delegatedEmployeeId
          : null,
      changed_fields_json: changedFields,
      before_json: beforeJson ?? null,
      after_json: afterJson ?? null,
      ip: resolveClientIp(req),
      user_agent: req?.headers?.["user-agent"] || null,
    });
  } catch (error) {
    console.error("Audit logging failed:", error);
  }
};

module.exports = {
  logAuditEvent,
};
