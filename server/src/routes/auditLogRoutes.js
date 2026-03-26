const express = require("express");
const { Op } = require("sequelize");
const { requireAuth } = require("../middlewares/auth");
const { AuditLog, Employee, Machine } = require("../models");

const router = express.Router();
const ADMIN_PERMISSION_LEVEL = 7;

const parseDateRangeStart = (value) => {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(`${value.trim()}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseDateRangeEnd = (value) => {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(`${value.trim()}T23:59:59.999Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parseEmployeeIdFilter = (value) => {
  if (value === undefined || value === null) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

router.get("/", requireAuth, async (req, res) => {
  try {
    const entityType =
      typeof req.query.entityType === "string" ? req.query.entityType.trim() : "";
    const entityIdRaw =
      typeof req.query.entityId === "string" ? req.query.entityId.trim() : "";
    const entityId = entityIdRaw ? String(entityIdRaw) : "";
    const action = typeof req.query.action === "string" ? req.query.action.trim() : "";
    const actorEmployeeId = parseEmployeeIdFilter(req.query.actorEmployeeId);
    const performedByEmployeeId = parseEmployeeIdFilter(req.query.performedByEmployeeId);
    const worker = typeof req.query.worker === "string" ? req.query.worker.trim() : "";
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const query = typeof req.query.query === "string" ? req.query.query.trim() : "";
    const searchQuery = q || query;
    const dateFrom = parseDateRangeStart(req.query.from ?? req.query.dateFrom);
    const dateTo = parseDateRangeEnd(req.query.to ?? req.query.dateTo);

    const rawPage = Number.parseInt(req.query.page, 10);
    const rawPageSize = Number.parseInt(req.query.pageSize, 10);
    const page = Number.isFinite(rawPage) ? Math.max(rawPage, 1) : 1;
    const pageSize = Number.isFinite(rawPageSize)
      ? Math.min(Math.max(rawPageSize, 1), 100)
      : 20;
    const offset = (page - 1) * pageSize;

    const userId = Number(req.user?.id);
    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const isAdmin = Number(req.user?.permission_level ?? 0) >= ADMIN_PERMISSION_LEVEL;

    const andConditions = [];

    if (entityType) {
      andConditions.push({ entity_type: entityType });
    }

    if (entityId) {
      andConditions.push({ entity_id: entityId });
    }

    if (["create", "update", "delete"].includes(action)) {
      andConditions.push({ action });
    }

    if (actorEmployeeId) {
      andConditions.push({ actor_employee_id: actorEmployeeId });
    }

    if (performedByEmployeeId) {
      andConditions.push({ performed_by_employee_id: performedByEmployeeId });
    }

    if (dateFrom || dateTo) {
      if (dateFrom && dateTo) {
        andConditions.push({ created_at: { [Op.between]: [dateFrom, dateTo] } });
      } else if (dateFrom) {
        andConditions.push({ created_at: { [Op.gte]: dateFrom } });
      } else if (dateTo) {
        andConditions.push({ created_at: { [Op.lte]: dateTo } });
      }
    }

    if (worker) {
      andConditions.push({
        [Op.or]: [
          { "$actor.name$": { [Op.like]: `%${worker}%` } },
          { "$actor.login_id$": { [Op.like]: `%${worker}%` } },
          { "$performedBy.name$": { [Op.like]: `%${worker}%` } },
          { "$performedBy.login_id$": { [Op.like]: `%${worker}%` } },
          { "$onBehalfOf.name$": { [Op.like]: `%${worker}%` } },
          { "$onBehalfOf.login_id$": { [Op.like]: `%${worker}%` } },
        ],
      });
    }

    if (searchQuery) {
      const like = `%${searchQuery}%`;
      const numericQuery = Number.parseInt(searchQuery, 10);
      andConditions.push({
        [Op.or]: [
          { entity_type: { [Op.like]: like } },
          { entity_id: { [Op.like]: like } },
          { "$actor.name$": { [Op.like]: like } },
          { "$actor.login_id$": { [Op.like]: like } },
          { "$performedBy.name$": { [Op.like]: like } },
          { "$performedBy.login_id$": { [Op.like]: like } },
          { "$onBehalfOf.name$": { [Op.like]: like } },
          { "$onBehalfOf.login_id$": { [Op.like]: like } },
          ...(Number.isFinite(numericQuery) ? [{ id: numericQuery }] : []),
        ],
      });
    }

    // 권한 정책:
    // - 관리자(permission_level >= 7): 전체 변경이력 조회 가능
    // - 일반 사용자: 기본적으로 본인이 actor / performed_by / on_behalf_of 인 로그만 조회 가능
    // - 예외: 장비 상세(history 탭) 조회 시에는 장비 단위 타임라인을 조회할 수 있도록 허용
    //   (현재 장비 조회 권한은 requireAuth 기준)
    let canViewEntityTimeline = false;
    if (!isAdmin && entityType === "machine" && entityId) {
      const machine = await Machine.findByPk(entityId, { attributes: ["id"] });
      canViewEntityTimeline = Boolean(machine);
    }

    if (!isAdmin && !canViewEntityTimeline) {
      andConditions.push({
        [Op.or]: [
          { actor_employee_id: userId },
          { performed_by_employee_id: userId },
          { on_behalf_of_employee_id: userId },
        ],
      });
    }

    const where = andConditions.length > 0 ? { [Op.and]: andConditions } : {};

    const { rows, count } = await AuditLog.findAndCountAll({
      where,
      // 필터/정렬 성능을 위해 인덱스 대상 컬럼(entity_type, entity_id, created_at, actor_employee_id) 기준으로 조건 구성
      include: [
        { model: Employee, as: "actor", attributes: ["id", "name", "login_id"] },
        {
          model: Employee,
          as: "performedBy",
          attributes: ["id", "name", "login_id"],
        },
        { model: Employee, as: "onBehalfOf", attributes: ["id", "name", "login_id"] },
      ],
      order: [["created_at", "DESC"], ["id", "DESC"]],
      limit: pageSize,
      offset,
    });

    return res.json({
      rows,
      total: count,
      page,
      pageSize,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
