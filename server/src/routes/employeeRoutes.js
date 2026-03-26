const express = require("express");
const bcrypt = require("bcrypt");
const models = require("../models");
const { logAuditEvent } = require("../utils/auditLogger");

const { requireAuth } = require("../middlewares/auth");
const requireAdmin = require("../middlewares/requireAdmin");

const router = express.Router();
const ADMIN_PERMISSION_LEVEL = 7;

const EMPLOYEE_PUBLIC_ATTRIBUTES = [
  "id",
  "login_id",
  "name",
  "hire_date",
  "is_active",
  "last_login_at",
  "permission_level",
  "department",
  "job_title",
  "employment_status",
  "created_at",
  "updated_at",
];

const EMPLOYEE_HR_ATTRIBUTES = [
  ...EMPLOYEE_PUBLIC_ATTRIBUTES,
  "contact_phone",
  "contact_email",
  "address_line1",
  "address_line2",
  "note",
];

// 감사로그 체크리스트 (검색키워드: logAuditEvent()
// - POST /api/employees
// - PUT /api/employees/:id
// - PATCH /api/employees/:id/hr
// - DELETE /api/employees/:id
// - PATCH /api/employees/:id/restore
// - PATCH /api/employees/:id/password
// - PATCH /api/employees/:id/permission

function toPermissionLevel(req) {
  return Number(req.user?.permission_level ?? 0);
}

function maskSensitive(value) {
  if (!value) return null;
  return "********";
}

function serializeHrRow(row, canEditSensitive) {
  const plain = row.get({ plain: true });
  const masked = !canEditSensitive;

  return {
    ...plain,
    contact_phone: masked ? maskSensitive(plain.contact_phone) : plain.contact_phone,
    contact_email: masked ? maskSensitive(plain.contact_email) : plain.contact_email,
    address_line1: masked ? maskSensitive(plain.address_line1) : plain.address_line1,
    address_line2: masked ? maskSensitive(plain.address_line2) : plain.address_line2,
    can_edit_sensitive: canEditSensitive,
    is_sensitive_masked: masked,
  };
}

/**
 * GET /api/employees?all=1
 * - all=1: 비활성 포함 전체 조회
 * - 기본: is_active=true만
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    const all = req.query.all === "1";

    const rows = await models.Employee.findAll({
      where: all ? {} : { is_active: true },
      order: [["id", "DESC"]],
      attributes: EMPLOYEE_PUBLIC_ATTRIBUTES,
    });

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/employees/hr
 * 인사 정보 리스트 조회 (권한에 따라 민감정보 마스킹)
 */
router.get("/hr", requireAuth, async (req, res) => {
  try {
    const canEditSensitive = toPermissionLevel(req) >= ADMIN_PERMISSION_LEVEL;

    const rows = await models.Employee.findAll({
      order: [["id", "DESC"]],
      attributes: EMPLOYEE_HR_ATTRIBUTES,
    });

    res.json(rows.map((row) => serializeHrRow(row, canEditSensitive)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * POST /api/employees
 * body: { login_id, name, hire_date, password }
 */
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { login_id, name, hire_date, password } = req.body;

    if (!login_id || !name || !hire_date || !password) {
      return res
        .status(400)
        .json({ message: "login_id, name, hire_date, password are required" });
    }

    const exists = await models.Employee.findOne({ where: { login_id } });
    if (exists) return res.status(409).json({ message: "login_id already exists" });

    const password_hash = await bcrypt.hash(password, 10);

    const row = await models.Employee.create({
      login_id,
      name,
      hire_date,
      password_hash,
      is_active: true,
    });

    await logAuditEvent({
      req,
      entityType: "employee",
      entityId: row.id,
      action: "create",
      before: null,
      after: row.toJSON(),
    });

    res.status(201).json({
      id: row.id,
      login_id: row.login_id,
      name: row.name,
      hire_date: row.hire_date,
      is_active: row.is_active,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * PUT /api/employees/:id
 * body: { name, hire_date, is_active }
 */
router.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const row = await models.Employee.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: "Not found" });

    const { name, hire_date, is_active } = req.body;
    if (!name || !hire_date) {
      return res.status(400).json({ message: "name, hire_date are required" });
    }

    const before = row.toJSON();
    await row.update({
      name,
      hire_date,
      is_active: typeof is_active === "boolean" ? is_active : row.is_active,
    });

    await logAuditEvent({
      req,
      entityType: "employee",
      entityId: row.id,
      action: "update",
      before,
      after: row.toJSON(),
    });

    res.json({
      id: row.id,
      login_id: row.login_id,
      name: row.name,
      hire_date: row.hire_date,
      is_active: row.is_active,
      permission_level: row.permission_level,
      last_login_at: row.last_login_at,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * PATCH /api/employees/:id/hr
 * body: { department, job_title, employment_status, contact_phone, contact_email, address_line1, address_line2, note }
 */
router.patch("/:id/hr", requireAuth, async (req, res) => {
  try {
    const row = await models.Employee.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: "Not found" });

    const permission = toPermissionLevel(req);
    if (permission < ADMIN_PERMISSION_LEVEL) {
      return res
        .status(403)
        .json({ message: `Forbidden (permission_level >= ${ADMIN_PERMISSION_LEVEL} required)` });
    }

    const {
      department,
      job_title,
      employment_status,
      contact_phone,
      contact_email,
      address_line1,
      address_line2,
      note,
    } = req.body;
    const before = row.toJSON();

    if (
      employment_status !== undefined &&
      !["ACTIVE", "ON_LEAVE", "RESIGNED"].includes(employment_status)
    ) {
      return res.status(400).json({ message: "invalid employment_status" });
    }

    await row.update({
      department: department === undefined ? row.department : department,
      job_title: job_title === undefined ? row.job_title : job_title,
      employment_status: employment_status ?? row.employment_status,
      contact_phone: contact_phone === undefined ? row.contact_phone : contact_phone,
      contact_email: contact_email === undefined ? row.contact_email : contact_email,
      address_line1: address_line1 === undefined ? row.address_line1 : address_line1,
      address_line2: address_line2 === undefined ? row.address_line2 : address_line2,
      note: note === undefined ? row.note : note,
    });

    await logAuditEvent({
      req,
      entityType: "employee",
      entityId: row.id,
      action: "update",
      before,
      after: row.toJSON(),
    });

    const refreshed = await models.Employee.findByPk(req.params.id, {
      attributes: EMPLOYEE_HR_ATTRIBUTES,
    });

    return res.json(serializeHrRow(refreshed, true));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});

/**
 * DELETE /api/employees/:id
 * (soft deactivate) -> is_active=false
 */
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const row = await models.Employee.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: "Not found" });

    const before = row.toJSON();
    await row.update({ is_active: false });

    await logAuditEvent({
      req,
      entityType: "employee",
      entityId: row.id,
      action: "delete",
      before,
      after: row.toJSON(),
    });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * PATCH /api/employees/:id/restore
 * restore -> is_active=true
 */
router.patch("/:id/restore", requireAuth, async (req, res) => {
  try {
    const row = await models.Employee.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: "Not found" });

    const before = row.toJSON();
    await row.update({ is_active: true });

    await logAuditEvent({
      req,
      entityType: "employee",
      entityId: row.id,
      action: "update",
      before,
      after: row.toJSON(),
    });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * PATCH /api/employees/:id/password
 * body: { password }
 */
router.patch("/:id/password", requireAuth, requireAdmin, async (req, res) => {
  try {
    const row = await models.Employee.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: "Not found" });

    const { password } = req.body;
    if (!password) return res.status(400).json({ message: "password required" });

    const before = row.toJSON();
    const password_hash = await bcrypt.hash(password, 10);
    await row.update({ password_hash });

    await logAuditEvent({
      req,
      entityType: "employee",
      entityId: row.id,
      action: "update",
      before,
      after: row.toJSON(),
    });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * PATCH /api/employees/:id/permission
 * body: { permission_level }
 */
router.patch("/:id/permission", requireAuth, requireAdmin, async (req, res) => {
  try {
    const row = await models.Employee.findByPk(req.params.id);
    if (!row) return res.status(404).json({ message: "Not found" });

    const { permission_level } = req.body;
    if (permission_level === undefined || permission_level === null) {
      return res.status(400).json({ message: "permission_level required" });
    }

    const parsed = Number(permission_level);
    if (!Number.isFinite(parsed)) {
      return res.status(400).json({ message: "permission_level must be a number" });
    }

    const before = row.toJSON();
    await row.update({ permission_level: parsed });

    await logAuditEvent({
      req,
      entityType: "employee",
      entityId: row.id,
      action: "update",
      before,
      after: row.toJSON(),
    });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
